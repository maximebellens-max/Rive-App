// Priorisation des prospects enrichie par IA : chaque nuit, complète le
// score de priorité calculé par règles fixes (lib/rive/pipelines.ts) en
// faisant lire à Claude les éléments qualitatifs qu'aucune règle ne peut
// évaluer — notes libres, derniers échanges, réponses au formulaire Meta —
// pour ajuster le score et donner une raison en une phrase.
//
// Toujours agent-facing : le score ajusté et sa raison s'affichent sur le
// kanban et dans un digest WhatsApp à l'équipe, jamais un message envoyé au
// client (même posture RGPD que l'agent de relance, voir relance-agent.ts).
import type { SupabaseClient } from '@supabase/supabase-js'
import { leadPriorityScore } from './pipelines'
import { generateWithClaude } from './anthropic'
import { claimDailyAlert } from './daily-alerts'
import { notifyTeamAlertWhatsApp } from './whatsapp-notify'

type HistoryEntry = { entry_date: string; text: string }
type MetaAnswer = { question: string; answer: string }

type PriorityPromptInput = {
  name: string
  category: string | null
  budget: number | null
  financement: string
  critere_lieu: string
  ruleScore: number
  actionLabel: string
  actionDate: string | null
  notes: string
  history: HistoryEntry[]
  metaAnswers: MetaAnswer[]
}

function buildPriorityPrompt(input: PriorityPromptInput): string {
  const lines = [
    `Tu aides un agent immobilier à prioriser ses prospects : qui rappeler en premier.`,
    `Un score de priorité par règles fixes a déjà été calculé (0 à 100, plus haut = plus urgent) : ${input.ruleScore}/100.`,
    `Lis les éléments qualitatifs ci-dessous (notes, échanges, réponses au formulaire) et ajuste ce score UNIQUEMENT si tu y trouves un vrai signal : échéance annoncée, changement de situation, forte motivation exprimée (fais monter le score), ou au contraire un doute, un refus, un projet reporté ou abandonné (fais baisser le score). Sans signal clair dans le texte, garde le score proche de ${input.ruleScore}.`,
    ``,
    `Nom : ${input.name}`,
    `Catégorie : ${input.category || 'non renseignée'}`,
    `Budget : ${input.budget ?? '—'} · Financement : ${input.financement || '—'} · Secteur recherché : ${input.critere_lieu || '—'}`,
    input.actionLabel ? `Prochaine action prévue : ${input.actionLabel}${input.actionDate ? ` (${input.actionDate})` : ''}` : null,
    input.notes ? `Notes : ${input.notes}` : null,
    input.history.length
      ? `Derniers échanges :\n${input.history.map((h) => `- ${h.entry_date} : ${h.text}`).join('\n')}`
      : null,
    input.metaAnswers.length
      ? `Réponses au formulaire :\n${input.metaAnswers.map((qa) => `- ${qa.question} : ${qa.answer}`).join('\n')}`
      : null,
    ``,
    `Réponds UNIQUEMENT avec un objet JSON strict, sans aucun texte autour, sous la forme exacte :`,
    `{"score": <entier de 0 à 100>, "reasoning": "<une phrase courte en français expliquant l'ajustement, ou une chaîne vide si le score de règles est déjà pertinent>"}`,
  ]
  return lines.filter(Boolean).join('\n')
}

// Le modèle est instruit de ne renvoyer que du JSON, mais on reste
// défensif : on isole le premier bloc {...} avant de parser, et on rejette
// toute réponse dont la forme ne correspond pas à ce qu'on attend — le score
// de règles reste alors la valeur retenue (voir l'appelant).
function parsePriorityResponse(text: string): { score: number; reasoning: string } | null {
  const match = text.match(/\{[\s\S]*\}/)
  if (!match) return null
  try {
    const parsed = JSON.parse(match[0])
    const score = Number(parsed.score)
    const reasoning = typeof parsed.reasoning === 'string' ? parsed.reasoning.trim() : ''
    if (!Number.isFinite(score)) return null
    return { score: Math.max(0, Math.min(100, Math.round(score))), reasoning }
  } catch {
    return null
  }
}

type ScoredLead = { name: string; score: number; reasoning: string }

// Traite tous les prospects encore actifs d'une agence : un mandat déjà
// conclu (stage 'vendu') sort un lead du champ de la priorisation, ce n'est
// plus "un prospect à rappeler" mais un client déjà suivi par l'agent de
// relance (relance-agent.ts).
export async function runAiPriorityForAgency(supabase: SupabaseClient, agencyId: string, today: string) {
  const { data: leads } = await supabase
    .from('leads')
    .select(
      'id, name, category, phone, budget, financement, critere_lieu, action_label, action_date, created_at, notes, meta_answers'
    )
    .eq('agency_id', agencyId)
  if (!leads || !leads.length) return

  const leadIds = leads.map((l) => l.id)

  const [{ data: historyRows }, { data: mandateRows }] = await Promise.all([
    supabase
      .from('lead_history_entries')
      .select('lead_id, entry_date, text')
      .in('lead_id', leadIds)
      .order('entry_date', { ascending: false }),
    supabase.from('mandates').select('lead_id, stage').in('lead_id', leadIds),
  ])

  const soldLeadIds = new Set(
    (mandateRows ?? []).filter((m: { lead_id: string; stage: string }) => m.stage === 'vendu').map((m) => m.lead_id)
  )

  const historyByLead: Record<string, HistoryEntry[]> = {}
  for (const row of (historyRows ?? []) as (HistoryEntry & { lead_id: string })[]) {
    if (!historyByLead[row.lead_id]) historyByLead[row.lead_id] = []
    if (historyByLead[row.lead_id].length < 5) historyByLead[row.lead_id].push(row)
  }

  const digestCandidates: ScoredLead[] = []

  for (const lead of leads) {
    if (soldLeadIds.has(lead.id)) continue

    const history = historyByLead[lead.id] ?? []
    const metaAnswers: MetaAnswer[] = Array.isArray(lead.meta_answers) ? lead.meta_answers : []

    const ruleScore = leadPriorityScore({
      budget: lead.budget,
      financement: lead.financement,
      critere_lieu: lead.critere_lieu,
      phone: lead.phone,
      action_date: lead.action_date,
      created_at: lead.created_at,
      last_history_date: history[0]?.entry_date ?? null,
    })

    // Rien de qualitatif à lire pour ce prospect : le score de règles reste
    // la meilleure estimation, pas la peine de solliciter Claude.
    if (!lead.notes && !history.length && !metaAnswers.length) {
      await supabase.from('leads').update({ ai_priority_score: ruleScore, ai_priority_reasoning: '' }).eq('id', lead.id)
      continue
    }

    const prompt = buildPriorityPrompt({
      name: lead.name,
      category: lead.category,
      budget: lead.budget,
      financement: lead.financement,
      critere_lieu: lead.critere_lieu,
      ruleScore,
      actionLabel: lead.action_label,
      actionDate: lead.action_date,
      notes: lead.notes,
      history,
      metaAnswers,
    })

    const { text } = await generateWithClaude(prompt)
    const parsed = text ? parsePriorityResponse(text) : null
    const finalScore = parsed?.score ?? ruleScore
    const reasoning = parsed?.reasoning ?? ''

    await supabase
      .from('leads')
      .update({ ai_priority_score: finalScore, ai_priority_reasoning: reasoning })
      .eq('id', lead.id)

    if (reasoning) digestCandidates.push({ name: lead.name, score: finalScore, reasoning })
  }

  await sendPriorityDigest(supabase, agencyId, today, digestCandidates)
}

// Un seul message groupé par jour et par agence (même schéma que les vœux de
// fin d'année) : les 3 prospects avec le signal IA le plus fort, avec la
// raison, pour démarrer la journée sans avoir à ouvrir le kanban.
async function sendPriorityDigest(supabase: SupabaseClient, agencyId: string, today: string, candidates: ScoredLead[]) {
  if (!candidates.length) return
  const top = [...candidates].sort((a, b) => b.score - a.score).slice(0, 3)

  const claimed = await claimDailyAlert(supabase, agencyId, 'ai_priority_digest', agencyId, today)
  if (!claimed) return

  const body = top.map((l, i) => `${i + 1}. ${l.name} (${l.score}/100) — ${l.reasoning}`).join('\n')
  await notifyTeamAlertWhatsApp(supabase, agencyId, 'Priorités du jour', body)
}
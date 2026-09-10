import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getAuthedProfile } from '@/lib/supabase/session'
import { leadMatchesBien, type MatchLead, type MatchMandate } from '@/lib/rive/matching'
import { formatEUR } from '@/lib/rive/mandates'
import { RECONTACT_THRESHOLD_DAYS, daysAgo } from '@/lib/rive/today'
import { generateBriefingBrief, generateRelanceBrief, generateVisitReportBrief } from '@/lib/rive/ai-prompts'
import { saveAIBriefing, saveAIRelanceDraft, saveAIVisitReport } from '@/app/actions/ai'
import { markLeadContacted } from '@/app/actions/pipelines'
import AIBriefPanel from '../../_components/ai-brief-panel'
import LeadEditForm from './lead-edit-form'
import HistorySection from './history-section'
import DeleteLeadButton from './delete-lead-button'
import MessageSection from './message-section'

const CATEGORY_LABEL: Record<string, string> = {
  acheteur: 'Acheteur',
  vendeur: 'Vendeur',
  investisseur: 'Investisseur',
}

// Pluriel, pour le lien de retour vers le tableau de la catégorie (nom du
// nav — voir app/dashboard/layout.tsx).
const CATEGORY_LABEL_PLURAL: Record<string, string> = {
  acheteur: 'Acheteurs',
  vendeur: 'Vendeurs',
  investisseur: 'Investisseurs',
}

// Affichée en toutes lettres sur la fiche (plutôt qu'en relatif type "il y a
// 2 j") : sert de repère fixe pour caler un rappel ou un suivi, contrairement
// à un horodatage relatif qui change de sens à chaque relecture.
function formatReceivedAt(iso: string): string {
  return new Date(iso).toLocaleString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default async function ProspectDetailPage({ params }: PageProps<'/dashboard/prospects/[id]'>) {
  const { id } = await params
  // Réutilise l'utilisateur/profil déjà résolus par le layout (même requête,
  // grâce à React.cache) au lieu de refaire un aller-retour getUser().
  const { supabase, profile } = await getAuthedProfile()

  // lead/entries/mandate/templates/members ne dépendent pas les uns des
  // autres : partent tous en parallèle plutôt qu'à la suite.
  const [{ data: lead }, { data: entries }, { data: mandate }, { data: templates }, { data: members }] = await Promise.all([
    supabase.from('leads').select('*').eq('id', id).single(),
    supabase.from('lead_history_entries').select('id, entry_date, text').eq('lead_id', id).order('entry_date', { ascending: false }),
    supabase.from('mandates').select('id, is_draft, type, address, stage, sold_date').eq('lead_id', id).maybeSingle(),
    supabase.from('message_templates').select('id, name, channel, subject, body').order('created_at', { ascending: true }),
    profile?.agency_id
      ? supabase.from('profiles').select('id, full_name').eq('agency_id', profile.agency_id)
      : Promise.resolve({ data: [] as { id: string; full_name: string }[] }),
  ])
  if (!lead) notFound()

  // "✓ Marquer comme contacté" ne s'affiche que tant que le prospect est
  // encore sur la 1ère colonne de son tableau de catégorie ET n'a pas déjà
  // été marqué traité — une fois cliqué, il disparaît de lui-même (le
  // bouton ne déplace pas la carte, voir markLeadContacted).
  let isNewProspect = false
  if (lead.category && !lead.marked_contacted) {
    const { data: firstColumn } = await supabase
      .from('pipeline_columns')
      .select('id')
      .eq('agency_id', profile?.agency_id ?? '')
      .eq('board_type', lead.category)
      .order('position', { ascending: true })
      .limit(1)
      .maybeSingle()
    isNewProspect = !!firstColumn && (lead.positions as Record<string, string> | null)?.[lead.category] === firstColumn.id
  }

  // Éligible à une relance si vendu depuis 300j+ et sans échange récent.
  const lastHistoryDate = entries?.[0]?.entry_date ?? null
  const recontactDays =
    mandate?.stage === 'vendu' && mandate.sold_date && (daysAgo(mandate.sold_date) ?? 0) >= RECONTACT_THRESHOLD_DAYS
      ? (!lastHistoryDate || (daysAgo(lastHistoryDate) ?? 999) >= RECONTACT_THRESHOLD_DAYS)
        ? daysAgo(mandate.sold_date)
        : null
      : null

  let matchingBiens: { id: string; address: string | null; property_type: string | null; price: number | null }[] = []
  if (lead.category === 'acheteur') {
    const { data: activeMandates } = await supabase
      .from('mandates')
      .select('id, type, stage, is_draft, signed_date, address, property_type, price, surface, pieces')
      .eq('type', 'vente')
      .eq('is_draft', false)
      .neq('stage', 'vendu')
    matchingBiens = (activeMandates ?? []).filter((m) => leadMatchesBien(lead as MatchLead, m as MatchMandate))
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <Link
            href={lead.category ? `/dashboard/pipelines/${lead.category}` : '/dashboard'}
            className="text-sm text-neutral-500 hover:underline"
          >
            ← {lead.category ? CATEGORY_LABEL_PLURAL[lead.category] ?? 'Retour' : "Aujourd'hui"}
          </Link>
          <h1 className="mt-1 text-xl font-semibold tracking-tight">{lead.name}</h1>
          <p className="mt-1 text-sm text-neutral-500">
            {CATEGORY_LABEL[lead.category ?? ''] ?? lead.category ?? 'Sans catégorie'}
            {lead.critere_lieu ? ` · ${lead.critere_lieu}` : ''}
          </p>
          {lead.created_at && (
            <p className="mt-0.5 text-xs text-neutral-400">Reçu le {formatReceivedAt(lead.created_at)}</p>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {isNewProspect && (
            <form action={markLeadContacted.bind(null, lead.id)}>
              <button
                type="submit"
                className="rounded-lg bg-accent px-3 py-1.5 text-sm font-medium text-white hover:bg-accent-hover"
              >
                ✓ Marquer comme contacté
              </button>
            </form>
          )}
          <DeleteLeadButton leadId={lead.id} />
        </div>
      </div>

      {mandate && (
        <Link
          href={`/dashboard/mandates/${mandate.id}`}
          className="flex items-center justify-between rounded-2xl border border-neutral-200 bg-surface p-4 text-sm shadow-sm hover:border-neutral-300"
        >
          <span>
            {mandate.is_draft ? '📋 Brouillon de mandat en préparation' : '📄 Mandat lié'}
            {mandate.address ? ` — ${mandate.address}` : ''}
          </span>
          <span className="text-neutral-400">Voir le mandat →</span>
        </Link>
      )}

      {lead.category === 'acheteur' && matchingBiens.length > 0 && (
        <div className="rounded-2xl border border-neutral-200 bg-surface p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-neutral-900">
            🏠 {matchingBiens.length} bien{matchingBiens.length > 1 ? 's' : ''} correspondant{matchingBiens.length > 1 ? 's' : ''}
          </h2>
          <div className="mt-3 flex flex-col gap-2">
            {matchingBiens.map((m) => (
              <Link
                key={m.id}
                href={`/dashboard/mandates/${m.id}`}
                className="flex items-center justify-between rounded-lg border border-neutral-200 px-3 py-2 text-sm hover:border-neutral-300 hover:bg-neutral-50"
              >
                <span className="font-medium text-neutral-900">{m.address || m.property_type || 'Bien'}</span>
                <span className="text-neutral-500">{formatEUR(m.price)}</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {Array.isArray(lead.meta_answers) && lead.meta_answers.length > 0 && (
        <div className="rounded-2xl border border-neutral-200 bg-surface p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-neutral-900">📝 Réponses au formulaire Meta</h2>
          <p className="mt-1 text-xs text-neutral-500">
            Récupérées automatiquement depuis le formulaire publicitaire rempli par le prospect.
          </p>
          <dl className="mt-3 flex flex-col gap-2.5">
            {(lead.meta_answers as { question: string; answer: string }[]).map((qa, i) => (
              <div key={i} className="flex flex-col gap-0.5 border-t border-neutral-100 pt-2.5 first:border-t-0 first:pt-0">
                <dt className="text-xs font-medium text-neutral-500">{qa.question}</dt>
                <dd className="text-sm text-neutral-900">{qa.answer}</dd>
              </div>
            ))}
          </dl>
        </div>
      )}

      <div className="rounded-2xl border border-neutral-200 bg-surface p-6 shadow-sm">
        <LeadEditForm lead={lead} members={members ?? []} />
      </div>

      <MessageSection lead={lead} templates={templates ?? []} agentName={profile?.full_name || ''} />

      <AIBriefPanel
        title="Assistant IA — briefing avant RDV"
        prompt={generateBriefingBrief(lead, entries ?? [])}
        initialValue={lead.ai_briefing}
        onSave={saveAIBriefing.bind(null, lead.id)}
      />

      {entries && entries.length > 0 && (
        <AIBriefPanel
          title="Assistant IA — compte-rendu structuré"
          prompt={generateVisitReportBrief(lead.name, entries[0].text, entries[0].entry_date)}
          initialValue={lead.ai_visit_report}
          onSave={saveAIVisitReport.bind(null, lead.id)}
          generateLabel="Structurer la dernière note"
        />
      )}

      {recontactDays !== null && mandate && (
        <AIBriefPanel
          title="Assistant IA — message de relance"
          prompt={generateRelanceBrief(lead.name, mandate.address, recontactDays)}
          initialValue={lead.ai_relance_draft}
          onSave={saveAIRelanceDraft.bind(null, lead.id)}
        />
      )}

      <HistorySection leadId={lead.id} entries={entries ?? []} />
    </div>
  )
}
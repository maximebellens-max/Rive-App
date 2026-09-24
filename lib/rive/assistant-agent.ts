// Assistant IA conversationnel de Rive (texte ou dicté) : chercher un
// prospect, ajouter une note, le faire avancer dans son pipeline, mettre à
// jour un champ simple de sa fiche — depuis le chat de l'app
// (app/dashboard/assistant/assistant-chat.tsx), au clavier ou au micro
// (dictée gérée côté navigateur, voir ce composant). Construit sur le
// mécanisme "tool use" de l'API Claude : plutôt que de deviner un id de
// prospect ou une colonne de pipeline à partir du texte, le modèle appelle
// des outils qui interrogent la vraie base (search_prospects,
// list_pipeline_columns) avant d'agir — jamais d'action sur un id inventé.
// "Applique puis confirme" : chaque action s'exécute tout de suite (pas
// d'étape de validation séparée), la réponse finale résume ce qui a été
// fait.
//
// Toute action qui touche réellement les données passe par les mêmes
// fonctions que le reste de l'app (moveLeadCard, addLeadHistoryEntry,
// updateLeadField) — jamais de logique dupliquée ici, et les mêmes
// automatisations (ex. création du brouillon de mandat en entrant dans la
// colonne d'estimation) se déclenchent normalement.
import type { SupabaseClient } from '@supabase/supabase-js'
import { moveLeadCard } from '@/app/actions/pipelines'
import { addLeadHistoryEntry, updateLeadField } from '@/app/actions/leads'

const MODEL = 'claude-haiku-4-5-20251001'
const MAX_STEPS = 6

export type ContentBlock =
  | { type: 'text'; text: string }
  | { type: 'tool_use'; id: string; name: string; input: Record<string, unknown> }
  | { type: 'tool_result'; tool_use_id: string; content: string; is_error?: boolean }

export type ChatMessage = { role: 'user' | 'assistant'; content: ContentBlock[] }

export type AgentContext = {
  supabase: SupabaseClient
  agencyId: string
  agencyName?: string
  userName?: string
}

const BOARD_TYPES = ['vendeur', 'acheteur', 'investisseur']

const TOOLS = [
  {
    name: 'search_prospects',
    description:
      "Cherche des prospects par nom (recherche partielle, insensible à la casse et aux accents approximatifs). Renvoie jusqu'à 8 résultats (id, nom, catégorie, téléphone, étape actuelle du pipeline). À utiliser TOUJOURS avant d'agir sur un prospect nommé dans la demande, pour retrouver son id exact — ne jamais inventer ou supposer un id.",
    input_schema: {
      type: 'object',
      properties: { query: { type: 'string', description: 'Nom (ou début de nom) du prospect recherché' } },
      required: ['query'],
    },
  },
  {
    name: 'list_pipeline_columns',
    description:
      "Liste les colonnes (étapes) du tableau Kanban d'une catégorie, dans l'ordre, avec leur id exact. À utiliser TOUJOURS avant move_pipeline_stage : les colonnes sont personnalisées par chaque agence, leur nom exact ne doit jamais être deviné.",
    input_schema: {
      type: 'object',
      properties: {
        board_type: { type: 'string', enum: BOARD_TYPES, description: 'Catégorie du tableau' },
      },
      required: ['board_type'],
    },
  },
  {
    name: 'move_pipeline_stage',
    description:
      "Déplace un prospect vers une autre colonne (étape) de son tableau Kanban. Appelle d'abord list_pipeline_columns pour connaître l'id exact de la colonne visée.",
    input_schema: {
      type: 'object',
      properties: {
        lead_id: { type: 'string' },
        column_id: { type: 'string' },
      },
      required: ['lead_id', 'column_id'],
    },
  },
  {
    name: 'add_note',
    description: "Ajoute une note datée d'aujourd'hui à l'historique d'un prospect (visible sur sa fiche, ne remplace rien).",
    input_schema: {
      type: 'object',
      properties: {
        lead_id: { type: 'string' },
        note: { type: 'string' },
      },
      required: ['lead_id', 'note'],
    },
  },
  {
    name: 'update_prospect_field',
    description:
      "Met à jour UN SEUL champ simple d'un prospect. Champs autorisés : phone (téléphone), email, budget (nombre, €), financement (texte libre), critere_type (type de bien recherché), critere_lieu (secteur recherché), pieces_min (nombre), surface_min (nombre, m²), action_label (prochaine action prévue), action_date (date AAAA-MM-JJ), notes (remplace tout le champ notes — préférer add_note pour ajouter une info sans écraser ce qui existe). Aucun autre champ n'est modifiable par cet outil (ni la catégorie, ni l'agent assigné).",
    input_schema: {
      type: 'object',
      properties: {
        lead_id: { type: 'string' },
        field: {
          type: 'string',
          enum: [
            'phone',
            'email',
            'budget',
            'financement',
            'critere_type',
            'critere_lieu',
            'pieces_min',
            'surface_min',
            'action_label',
            'action_date',
            'notes',
          ],
        },
        value: { type: 'string' },
      },
      required: ['lead_id', 'field', 'value'],
    },
  },
]

function buildSystemPrompt(ctx: AgentContext, today: string): string {
  return [
    `Tu es l'assistant intégré à Rive, le CRM immobilier de l'agence ${ctx.agencyName || "l'agence"} (bassin genevois côté français, Annecy/Genève).`,
    `Tu discutes avec ${ctx.userName || "un agent de l'agence"}, aujourd'hui ${today}. Il peut t'écrire ou te dicter sa demande au micro (transcription parfois imparfaite : un nom ou un mot mal transcrit reste probable).`,
    ``,
    `Tu sais : chercher un prospect, ajouter une note à sa fiche, le faire avancer (ou reculer) dans son pipeline (Vendeur/Acheteur/Investisseur), et mettre à jour un champ simple de sa fiche.`,
    ``,
    `Règles impératives :`,
    `- N'agis JAMAIS sur un prospect sans avoir d'abord retrouvé son id exact via search_prospects. Si plusieurs prospects correspondent, ou si aucun ne correspond clairement, arrête-toi et demande une précision en texte plutôt que de choisir au hasard.`,
    `- Avant move_pipeline_stage, appelle TOUJOURS list_pipeline_columns pour retrouver l'id exact de la colonne visée à partir de son vrai nom (ne jamais deviner son orthographe).`,
    `- Une fois une action effectuée, réponds en une ou deux phrases courtes et concrètes confirmant ce qui a été fait — pensé pour être lu sur un téléphone, jamais de longue explication.`,
    `- Si la demande sort de ce que tu sais faire (supprimer un prospect, créer un mandat, envoyer un message à un client, changer l'agent assigné...), dis-le clairement plutôt que d'improviser une action.`,
    `- Réponds toujours en français.`,
  ].join('\n')
}

async function runTool(
  ctx: AgentContext,
  name: string,
  input: Record<string, unknown>
): Promise<{ text: string; isError?: boolean }> {
  try {
    switch (name) {
      case 'search_prospects': {
        const query = String(input.query || '').trim()
        if (!query) return { text: 'Requête vide.', isError: true }

        const { data: leads } = await ctx.supabase
          .from('leads')
          .select('id, name, category, phone, positions')
          .eq('agency_id', ctx.agencyId)
          .ilike('name', `%${query}%`)
          .limit(8)
        if (!leads || !leads.length) return { text: 'Aucun prospect trouvé avec ce nom.' }

        const columnIds = [
          ...new Set(
            leads
              .map((l) => (l.category ? (l.positions as Record<string, string> | null)?.[l.category] : null))
              .filter((v): v is string => !!v)
          ),
        ]
        const { data: columns } = columnIds.length
          ? await ctx.supabase.from('pipeline_columns').select('id, name').in('id', columnIds)
          : { data: [] as { id: string; name: string }[] }
        const columnNameById = new Map((columns ?? []).map((c) => [c.id, c.name]))

        const rows = leads.map((l) => {
          const colId = l.category ? (l.positions as Record<string, string> | null)?.[l.category] : null
          return {
            id: l.id,
            name: l.name,
            category: l.category,
            phone: l.phone,
            current_stage: colId ? (columnNameById.get(colId) ?? null) : null,
          }
        })
        return { text: JSON.stringify(rows) }
      }

      case 'list_pipeline_columns': {
        const boardType = String(input.board_type || '')
        if (!BOARD_TYPES.includes(boardType)) return { text: 'board_type invalide.', isError: true }
        const { data } = await ctx.supabase
          .from('pipeline_columns')
          .select('id, name')
          .eq('agency_id', ctx.agencyId)
          .eq('board_type', boardType)
          .order('position', { ascending: true })
        return { text: JSON.stringify(data ?? []) }
      }

      case 'move_pipeline_stage': {
        const leadId = String(input.lead_id || '')
        const columnId = String(input.column_id || '')
        if (!leadId || !columnId) return { text: 'lead_id et column_id requis.', isError: true }

        const { data: lead } = await ctx.supabase
          .from('leads')
          .select('category, name')
          .eq('id', leadId)
          .eq('agency_id', ctx.agencyId)
          .maybeSingle()
        if (!lead?.category) return { text: 'Prospect introuvable ou sans catégorie.', isError: true }

        await moveLeadCard(leadId, lead.category, columnId)
        return { text: `${lead.name} déplacé.` }
      }

      case 'add_note': {
        const leadId = String(input.lead_id || '')
        const note = String(input.note || '').trim()
        if (!leadId || !note) return { text: 'lead_id et note requis.', isError: true }
        const formData = new FormData()
        formData.set('text', note)
        await addLeadHistoryEntry(leadId, formData)
        return { text: 'Note ajoutée.' }
      }

      case 'update_prospect_field': {
        const leadId = String(input.lead_id || '')
        const field = String(input.field || '')
        const value = String(input.value ?? '')
        if (!leadId || !field) return { text: 'lead_id et field requis.', isError: true }
        const result = await updateLeadField(leadId, field, value)
        if (result.error) return { text: result.error, isError: true }
        return { text: 'Champ mis à jour.' }
      }

      default:
        return { text: `Outil inconnu : ${name}.`, isError: true }
    }
  } catch {
    return { text: "Une erreur inattendue a empêché d'exécuter cette action.", isError: true }
  }
}

export async function runAssistantTurn(
  ctx: AgentContext,
  history: ChatMessage[]
): Promise<{ messages: ChatMessage[]; reply: string; error?: string }> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return { messages: history, reply: '', error: "La clé API Claude n'est pas configurée sur ce déploiement." }
  }

  const today = new Date().toISOString().slice(0, 10)
  let working = [...history]

  for (let step = 0; step < MAX_STEPS; step++) {
    let res: Response
    try {
      res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: MODEL,
          max_tokens: 1024,
          system: buildSystemPrompt(ctx, today),
          tools: TOOLS,
          messages: working,
        }),
      })
    } catch {
      return { messages: working, reply: '', error: "Impossible de contacter l'API Claude pour le moment." }
    }

    if (!res.ok) {
      const body = await res.text().catch(() => '')
      return { messages: working, reply: '', error: `Erreur de l'API Claude (${res.status}) : ${body.slice(0, 200)}` }
    }

    const data = await res.json()
    const content: ContentBlock[] = data?.content ?? []
    working = [...working, { role: 'assistant', content }]

    const toolUses = content.filter(
      (b): b is Extract<ContentBlock, { type: 'tool_use' }> => b.type === 'tool_use'
    )

    if (!toolUses.length) {
      const text = content
        .filter((b): b is Extract<ContentBlock, { type: 'text' }> => b.type === 'text')
        .map((b) => b.text)
        .join('\n')
        .trim()
      return { messages: working, reply: text || 'Fait.' }
    }

    const results: ContentBlock[] = []
    for (const tu of toolUses) {
      const result = await runTool(ctx, tu.name, tu.input)
      results.push({ type: 'tool_result', tool_use_id: tu.id, content: result.text, is_error: result.isError })
    }
    working = [...working, { role: 'user', content: results }]
  }

  return {
    messages: working,
    reply: "Je n'ai pas réussi à aboutir sur cette demande (trop d'étapes) — essaie de la reformuler plus simplement.",
    error: 'max_steps',
  }
}
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { leadMatchesBien, type MatchLead, type MatchMandate } from '@/lib/rive/matching'
import { formatEUR } from '@/lib/rive/mandates'
import { RECONTACT_THRESHOLD_DAYS, daysAgo } from '@/lib/rive/today'
import { generateBriefingBrief, generateRelanceBrief } from '@/lib/rive/ai-prompts'
import { saveAIBriefing, saveAIRelanceDraft } from '@/app/actions/ai'
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

export default async function ProspectDetailPage({ params }: PageProps<'/dashboard/prospects/[id]'>) {
  const { id } = await params
  const supabase = await createClient()

  const { data: lead } = await supabase.from('leads').select('*').eq('id', id).single()
  if (!lead) notFound()

  const { data: entries } = await supabase
    .from('lead_history_entries')
    .select('id, entry_date, text')
    .eq('lead_id', id)
    .order('entry_date', { ascending: false })

  const { data: mandate } = await supabase
    .from('mandates')
    .select('id, is_draft, type, address, stage, sold_date')
    .eq('lead_id', id)
    .maybeSingle()

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

  const { data: templates } = await supabase
    .from('message_templates')
    .select('id, name, channel, subject, body')
    .order('created_at', { ascending: true })

  const {
    data: { user },
  } = await supabase.auth.getUser()
  const { data: agentProfile } = user
    ? await supabase.from('profiles').select('full_name').eq('id', user.id).single()
    : { data: null }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <Link href="/dashboard/prospects" className="text-sm text-neutral-500 hover:underline">
            ← Prospects
          </Link>
          <h1 className="mt-1 text-xl font-semibold tracking-tight">{lead.name}</h1>
          <p className="mt-1 text-sm text-neutral-500">
            {CATEGORY_LABEL[lead.category ?? ''] ?? lead.category ?? 'Sans catégorie'}
            {lead.critere_lieu ? ` · ${lead.critere_lieu}` : ''}
          </p>
        </div>
        <DeleteLeadButton leadId={lead.id} />
      </div>

      {mandate && (
        <Link
          href={`/dashboard/mandates/${mandate.id}`}
          className="flex items-center justify-between rounded-2xl border border-neutral-200 bg-white p-4 text-sm shadow-sm hover:border-neutral-300"
        >
          <span>
            {mandate.is_draft ? '📋 Brouillon de mandat en préparation' : '📄 Mandat lié'}
            {mandate.address ? ` — ${mandate.address}` : ''}
          </span>
          <span className="text-neutral-400">Voir le mandat →</span>
        </Link>
      )}

      {lead.category === 'acheteur' && matchingBiens.length > 0 && (
        <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
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

      <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
        <LeadEditForm lead={lead} />
      </div>

      <MessageSection lead={lead} templates={templates ?? []} agentName={agentProfile?.full_name || ''} />

      <AIBriefPanel
        title="Assistant IA — briefing avant RDV"
        prompt={generateBriefingBrief(lead, entries ?? [])}
        initialValue={lead.ai_briefing}
        onSave={saveAIBriefing.bind(null, lead.id)}
      />

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

import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { leadMatchesBien, type MatchLead, type MatchMandate } from '@/lib/rive/matching'
import { formatEUR } from '@/lib/rive/mandates'
import LeadEditForm from './lead-edit-form'
import HistorySection from './history-section'
import DeleteLeadButton from './delete-lead-button'

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
    .select('id, is_draft, type, address')
    .eq('lead_id', id)
    .maybeSingle()

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

      <HistorySection leadId={lead.id} entries={entries ?? []} />
    </div>
  )
}

import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import {
  mandateEndDate,
  mandateNoticeDate,
  mandateIsActive,
  exclusivityLabel,
  formatDate,
} from '@/lib/rive/mandates'
import MandateEditForm from './mandate-edit-form'
import EstimationSection from './estimation-section'
import PartiesSection from './parties-section'
import DeleteMandateButton from './delete-mandate-button'
import GenerateMandateButton from './generate-mandate-button'

export default async function MandateDetailPage({ params }: PageProps<'/dashboard/mandates/[id]'>) {
  const { id } = await params
  const supabase = await createClient()

  const { data: mandate } = await supabase.from('mandates').select('*').eq('id', id).single()
  if (!mandate) notFound()

  const { data: comparables } = await supabase
    .from('dvf_comparables')
    .select('id, address, sale_date, surface, price')
    .eq('mandate_id', id)
    .order('sale_date', { ascending: false })

  const { data: parties } = await supabase
    .from('mandate_parties')
    .select('*')
    .eq('mandate_id', id)
    .order('position', { ascending: true })

  const endDate = mandateEndDate(mandate.signed_date, mandate.duration_months)
  const noticeDate = mandateNoticeDate(mandate.signed_date, mandate.duration_months, mandate.renewal_notice_days)
  const active = mandateIsActive(mandate.stage)

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <Link href="/dashboard/mandates" className="text-sm text-neutral-500 hover:underline">
            ← Mandats
          </Link>
          <h1 className="mt-1 flex items-center gap-2 text-xl font-semibold tracking-tight">
            {mandate.address || mandate.property_type || 'Mandat sans adresse'}
            {mandate.is_draft && (
              <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">
                Brouillon — estimation en cours
              </span>
            )}
          </h1>
          <p className="mt-1 text-sm text-neutral-500">
            {mandate.type === 'vente' ? 'Mandat de vente' : 'Mandat de recherche'}
            {exclusivityLabel(mandate.exclusivity) ? ` · ${exclusivityLabel(mandate.exclusivity)}` : ''}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <GenerateMandateButton mandateId={mandate.id} />
          <DeleteMandateButton mandateId={mandate.id} />
        </div>
      </div>

      {active && endDate && (
        <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-neutral-900">Échéance du mandat</h2>
          <p className="mt-2 text-sm text-neutral-600">
            Le mandat se termine le <span className="font-medium">{formatDate(endDate)}</span>.
            {noticeDate && (
              <>
                {' '}
                Pense à te positionner avant le <span className="font-medium">{formatDate(noticeDate)}</span>
                {mandate.tacit_renewal
                  ? " si tu ne souhaites pas de reconduction tacite."
                  : ' pour anticiper le renouvellement.'}
              </>
            )}
          </p>
        </div>
      )}

      <PartiesSection mandateId={mandate.id} parties={parties ?? []} />

      <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
        <MandateEditForm mandate={mandate} />
      </div>

      {mandate.type === 'vente' && (
        <EstimationSection mandateId={mandate.id} mandate={mandate} comparables={comparables ?? []} />
      )}
    </div>
  )
}

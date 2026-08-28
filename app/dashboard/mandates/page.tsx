import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import {
  mandateNoticeDate,
  mandateIsActive,
  dateUrgency,
  exclusivityLabel,
  formatEUR,
  formatDate,
} from '@/lib/rive/mandates'

const URGENCY_CLASS: Record<string, string> = {
  overdue: 'bg-red-50 text-red-700',
  soon: 'bg-amber-50 text-amber-700',
  ok: 'bg-neutral-100 text-neutral-600',
  none: 'bg-neutral-100 text-neutral-400',
}

export default async function MandatesPage() {
  const supabase = await createClient()

  const { data: mandates } = await supabase
    .from('mandates')
    .select(
      'id, type, address, property_type, price, stage, exclusivity, signed_date, duration_months, renewal_notice_days'
    )
    .order('created_at', { ascending: false })

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Mandats</h1>
          <p className="mt-1 text-sm text-neutral-500">
            {mandates?.length ?? 0} mandat{(mandates?.length ?? 0) > 1 ? 's' : ''}
          </p>
        </div>
        <Link
          href="/dashboard/mandates/new"
          className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-700"
        >
          Nouveau mandat
        </Link>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-neutral-200 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-neutral-200 text-neutral-500">
            <tr>
              <th className="px-4 py-3 font-medium">Bien / Client</th>
              <th className="px-4 py-3 font-medium">Type</th>
              <th className="px-4 py-3 font-medium">Prix</th>
              <th className="px-4 py-3 font-medium">Exclusivité</th>
              <th className="px-4 py-3 font-medium">Étape</th>
              <th className="px-4 py-3 font-medium">Renouvellement</th>
            </tr>
          </thead>
          <tbody>
            {!mandates?.length && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-neutral-400">
                  Aucun mandat pour l&apos;instant.
                </td>
              </tr>
            )}
            {mandates?.map((m) => {
              const notice = mandateIsActive(m.stage)
                ? mandateNoticeDate(m.signed_date, m.duration_months, m.renewal_notice_days)
                : null
              const urgency = dateUrgency(notice)
              return (
                <tr key={m.id} className="border-b border-neutral-100 last:border-0 hover:bg-neutral-50">
                  <td className="px-4 py-3">
                    <Link href={`/dashboard/mandates/${m.id}`} className="font-medium text-neutral-900 hover:underline">
                      {m.address || m.property_type || 'Mandat sans adresse'}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-neutral-600 capitalize">{m.type}</td>
                  <td className="px-4 py-3 tabular-nums text-neutral-600">{formatEUR(m.price)}</td>
                  <td className="px-4 py-3 text-neutral-600">{exclusivityLabel(m.exclusivity) || '—'}</td>
                  <td className="px-4 py-3 text-neutral-600">
                    {m.stage === 'vendu' ? 'Vendu' : m.stage === 'compromis_signe' ? 'Compromis signé' : 'En cours'}
                  </td>
                  <td className="px-4 py-3">
                    {notice ? (
                      <span className={`rounded-full px-2.5 py-1 text-xs font-medium tabular-nums ${URGENCY_CLASS[urgency]}`}>
                        {formatDate(notice)}
                      </span>
                    ) : (
                      <span className="text-neutral-300">—</span>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

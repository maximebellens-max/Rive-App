import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import CommissionEditForm from './commission-edit-form'
import DeleteCommissionButton from './delete-commission-button'

export default async function CommissionDetailPage({ params }: PageProps<'/dashboard/commissions/[id]'>) {
  const { id } = await params
  const supabase = await createClient()

  const { data: commission } = await supabase
    .from('commissions')
    .select('id, amount, paid_date, notes, mandates ( id, address, property_type, price )')
    .eq('id', id)
    .single()
  if (!commission) notFound()

  const mandate = commission.mandates as unknown as { id: string; address: string; property_type: string; price: number | null } | null

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <Link href="/dashboard/commissions" className="text-sm text-neutral-500 hover:underline">
            ← Commissions
          </Link>
          <h1 className="mt-1 text-xl font-semibold tracking-tight">
            {mandate?.address || mandate?.property_type || 'Commission'}
          </h1>
          {mandate && (
            <Link href={`/dashboard/mandates/${mandate.id}`} className="mt-1 block text-sm text-neutral-500 hover:underline">
              Voir le mandat →
            </Link>
          )}
        </div>
        <DeleteCommissionButton commissionId={commission.id} />
      </div>

      <div className="rounded-2xl border border-neutral-200 bg-surface p-6 shadow-sm">
        <CommissionEditForm
          commission={{ id: commission.id, amount: commission.amount, paid_date: commission.paid_date, notes: commission.notes }}
        />
      </div>
    </div>
  )
}

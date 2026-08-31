import { addMandateOffer, updateOfferStatus, removeMandateOffer } from '@/app/actions/mandate-activity'
import { OFFER_STATUS_LABELS } from '@/lib/rive/diffusion'
import { formatEUR, formatDate } from '@/lib/rive/mandates'

type Offer = {
  id: string
  lead_id: string | null
  buyer_name: string
  amount: number | null
  offer_date: string | null
  status: string
  lead_name?: string
}
type BuyerOption = { id: string; name: string }

const inputClass =
  'rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-accent focus:ring-1 focus:ring-accent'

const STATUS_CLASS: Record<string, string> = {
  pending: 'bg-warn-soft text-warn',
  accepted: 'bg-good-soft text-good',
  rejected: 'bg-danger-soft text-danger',
}

export default function OffersSection({
  mandateId,
  offers,
  buyerOptions,
}: {
  mandateId: string
  offers: Offer[]
  buyerOptions: BuyerOption[]
}) {
  const addWithId = addMandateOffer.bind(null, mandateId)

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-neutral-200 bg-surface p-5 shadow-sm">
      <h2 className="text-sm font-semibold text-neutral-900">Offres</h2>

      <div className="flex flex-col gap-2">
        {offers.map((o) => (
          <div key={o.id} className="flex items-center justify-between gap-3 rounded-lg border border-neutral-200 px-3 py-2 text-sm">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <span className="font-medium text-neutral-700">{o.lead_name || o.buyer_name || 'Acheteur'}</span>
              <span className="tabular-nums text-neutral-600">{formatEUR(o.amount)}</span>
              <span className="text-neutral-400">{formatDate(o.offer_date)}</span>
              <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_CLASS[o.status]}`}>
                {OFFER_STATUS_LABELS[o.status]}
              </span>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {o.status === 'pending' && (
                <>
                  <form action={updateOfferStatus.bind(null, mandateId, o.id, 'accepted')}>
                    <button type="submit" className="text-good hover:underline" title="Accepter">
                      ✓
                    </button>
                  </form>
                  <form action={updateOfferStatus.bind(null, mandateId, o.id, 'rejected')}>
                    <button type="submit" className="text-danger hover:underline" title="Refuser">
                      ✕
                    </button>
                  </form>
                </>
              )}
              <form action={removeMandateOffer.bind(null, mandateId, o.id)}>
                <button type="submit" className="text-xs text-neutral-400 hover:text-danger hover:underline">
                  Retirer
                </button>
              </form>
            </div>
          </div>
        ))}
        {!offers.length && <p className="text-sm text-neutral-400">Aucune offre enregistrée pour l&apos;instant.</p>}
      </div>

      <form action={addWithId} className="grid grid-cols-1 gap-2 sm:grid-cols-4">
        <select name="lead_id" className={inputClass}>
          <option value="">— Acheteur non fiché —</option>
          {buyerOptions.map((o) => (
            <option key={o.id} value={o.id}>
              {o.name}
            </option>
          ))}
        </select>
        <input name="buyer_name" placeholder="Nom (si non fiché)" className={inputClass} />
        <input name="amount" type="number" placeholder="Montant €" className={inputClass} />
        <input name="offer_date" type="date" className={inputClass} />
        <button
          type="submit"
          className="col-span-1 rounded-lg border border-neutral-300 px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-100 sm:col-span-4 sm:w-fit"
        >
          Ajouter l&apos;offre
        </button>
      </form>
    </div>
  )
}

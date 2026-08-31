import { addMandateVisit, removeMandateVisit } from '@/app/actions/mandate-activity'
import { formatDate } from '@/lib/rive/mandates'

type Visit = { id: string; lead_id: string | null; buyer_name: string; visit_date: string | null; feedback: string; lead_name?: string }
type BuyerOption = { id: string; name: string }

const inputClass =
  'rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-accent focus:ring-1 focus:ring-accent'

export default function VisitsSection({
  mandateId,
  visits,
  buyerOptions,
}: {
  mandateId: string
  visits: Visit[]
  buyerOptions: BuyerOption[]
}) {
  const addWithId = addMandateVisit.bind(null, mandateId)

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-neutral-200 bg-surface p-5 shadow-sm">
      <h2 className="text-sm font-semibold text-neutral-900">Visites</h2>

      <div className="flex flex-col gap-2">
        {visits.map((v) => (
          <div key={v.id} className="flex items-start justify-between gap-3 rounded-lg border border-neutral-200 px-3 py-2 text-sm">
            <div>
              <span className="font-medium text-neutral-700">{v.lead_name || v.buyer_name || 'Acheteur'}</span>
              <span className="ml-2 text-neutral-400">{formatDate(v.visit_date)}</span>
              {v.feedback && <p className="mt-0.5 text-neutral-600">{v.feedback}</p>}
            </div>
            <form action={removeMandateVisit.bind(null, mandateId, v.id)}>
              <button type="submit" className="text-xs text-danger hover:underline">
                Retirer
              </button>
            </form>
          </div>
        ))}
        {!visits.length && <p className="text-sm text-neutral-400">Aucune visite enregistrée pour l&apos;instant.</p>}
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
        <input name="visit_date" type="date" className={inputClass} />
        <input name="feedback" placeholder="Ressenti (intéressé, à revoir…)" className={inputClass} />
        <button
          type="submit"
          className="col-span-1 rounded-lg border border-neutral-300 px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-100 sm:col-span-4 sm:w-fit"
        >
          Ajouter la visite
        </button>
      </form>
    </div>
  )
}

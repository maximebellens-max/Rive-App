import { addLeadHistoryEntry, removeLeadHistoryEntry } from '@/app/actions/leads'
import { formatDate } from '@/lib/rive/mandates'

type Entry = { id: string; entry_date: string; text: string }

const inputClass =
  'rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-accent focus:ring-1 focus:ring-accent'

export default function HistorySection({ leadId, entries }: { leadId: string; entries: Entry[] }) {
  const addWithId = addLeadHistoryEntry.bind(null, leadId)

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-neutral-200 bg-surface p-6 shadow-sm">
      <h2 className="text-sm font-semibold text-neutral-900">Historique des échanges</h2>

      <div className="flex flex-col gap-2">
        {entries.map((e) => (
          <div key={e.id} className="flex items-start justify-between gap-3 rounded-lg border border-neutral-200 px-3 py-2 text-sm">
            <div>
              <span className="font-medium text-neutral-700">{formatDate(e.entry_date)}</span>
              <span className="ml-2 text-neutral-600">{e.text}</span>
            </div>
            <form action={removeLeadHistoryEntry.bind(null, leadId, e.id)}>
              <button type="submit" className="text-xs text-danger hover:underline">
                Retirer
              </button>
            </form>
          </div>
        ))}
        {!entries.length && <p className="text-sm text-neutral-400">Aucun échange enregistré pour l&apos;instant.</p>}
      </div>

      <form action={addWithId} className="flex flex-col gap-2 border-t border-neutral-100 pt-4 sm:flex-row">
        <input name="entry_date" type="date" defaultValue={new Date().toISOString().slice(0, 10)} className={`${inputClass} sm:w-44`} />
        <input name="text" placeholder="Ce qui s'est dit, ce qui a été convenu…" className={`${inputClass} flex-1`} />
        <button
          type="submit"
          className="rounded-lg border border-neutral-300 px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-100"
        >
          Ajouter
        </button>
      </form>
    </div>
  )
}

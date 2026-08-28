import { addMandateParty, removeMandateParty } from '@/app/actions/mandate-parties'
import { formatDate } from '@/lib/rive/mandates'

type Party = {
  id: string
  civility: string
  first_name: string
  last_name: string
  address: string
  birth_date: string | null
  birth_place: string
  nationality: string
  marital_status: string
  phone: string
  email: string
}

const inputClass =
  'rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-accent focus:ring-1 focus:ring-accent'

export default function PartiesSection({ mandateId, parties }: { mandateId: string; parties: Party[] }) {
  const addWithId = addMandateParty.bind(null, mandateId)

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
      <div>
        <h2 className="text-sm font-semibold text-neutral-900">Mandant(s)</h2>
        <p className="mt-1 text-xs text-neutral-500">
          L&apos;état civil complet des signataires, tel qu&apos;il doit figurer sur l&apos;acte. Ajoute un
          co-mandant si le bien appartient à plusieurs personnes (couple, indivision…).
        </p>
      </div>

      <div className="flex flex-col gap-2">
        {parties.map((p) => (
          <div key={p.id} className="flex items-start justify-between gap-3 rounded-lg border border-neutral-200 px-3 py-2 text-sm">
            <div className="flex flex-col gap-0.5 text-neutral-700">
              <span className="font-medium">
                {p.civility} {p.first_name} {p.last_name}
              </span>
              <span className="text-neutral-500">{p.address || '—'}</span>
              <span className="text-neutral-400">
                {p.birth_place && `Né(e) à ${p.birth_place}`}
                {p.birth_date && ` le ${formatDate(p.birth_date)}`}
                {p.nationality && ` · ${p.nationality}`}
                {p.marital_status && ` · ${p.marital_status}`}
              </span>
            </div>
            <form action={removeMandateParty.bind(null, mandateId, p.id)}>
              <button type="submit" className="text-xs text-danger hover:underline">
                Retirer
              </button>
            </form>
          </div>
        ))}
        {!parties.length && <p className="text-sm text-neutral-400">Aucun mandant renseigné pour l&apos;instant.</p>}
      </div>

      <form action={addWithId} className="grid grid-cols-2 gap-2 border-t border-neutral-100 pt-4 sm:grid-cols-4">
        <select name="civility" defaultValue="Monsieur" className={inputClass}>
          <option value="Monsieur">Monsieur</option>
          <option value="Madame">Madame</option>
        </select>
        <input name="first_name" placeholder="Prénom" className={inputClass} />
        <input name="last_name" placeholder="Nom" className={inputClass} />
        <input name="marital_status" placeholder="Situation (célibataire…)" className={inputClass} />
        <input name="address" placeholder="Adresse" className={`${inputClass} col-span-2 sm:col-span-2`} />
        <input name="birth_place" placeholder="Né(e) à" className={inputClass} />
        <input name="birth_date" type="date" className={inputClass} />
        <input name="nationality" placeholder="Nationalité" className={inputClass} />
        <input name="phone" placeholder="Téléphone" className={inputClass} />
        <input name="email" type="email" placeholder="Email" className={`${inputClass} col-span-2`} />
        <button
          type="submit"
          className="col-span-2 rounded-lg border border-neutral-300 px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-100 sm:col-span-4 sm:w-fit"
        >
          Ajouter un mandant
        </button>
      </form>
    </div>
  )
}

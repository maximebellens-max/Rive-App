'use client'

import { useActionState } from 'react'
import { searchDvfComparables, type DvfSearchState } from '@/app/actions/dvf'
import { addDvfComparable } from '@/app/actions/mandates'
import { formatEUR } from '@/lib/rive/mandates'

const inputClass =
  'rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-accent focus:ring-1 focus:ring-accent'

function formatDvfDate(d: string | null): string {
  if (!d) return '—'
  const date = new Date(d)
  if (isNaN(date.getTime())) return d
  return new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }).format(date)
}

export default function DvfAutoSearch({
  mandateId,
  defaultPostalCode,
  defaultPropertyType,
}: {
  mandateId: string
  defaultPostalCode: string
  defaultPropertyType: string
}) {
  const [state, action, pending] = useActionState<DvfSearchState, FormData>(searchDvfComparables, undefined)
  const addWithId = addDvfComparable.bind(null, mandateId)

  const initialType =
    defaultPropertyType === 'Maison' || defaultPropertyType === 'Appartement' ? defaultPropertyType : 'Tous'

  return (
    <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-4">
      <form action={action} className="flex flex-wrap items-end gap-2">
        <div className="flex flex-col gap-1">
          <label className="text-xs text-neutral-500" htmlFor="dvf-postal">
            Code postal
          </label>
          <input
            id="dvf-postal"
            name="postal_code"
            defaultValue={defaultPostalCode}
            placeholder="74100"
            className={`${inputClass} w-28`}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-neutral-500" htmlFor="dvf-type">
            Type de bien
          </label>
          <select id="dvf-type" name="property_type" defaultValue={initialType} className={inputClass}>
            <option value="Tous">Tous</option>
            <option value="Appartement">Appartement</option>
            <option value="Maison">Maison</option>
          </select>
        </div>
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-ink hover:bg-accent-hover disabled:opacity-60"
        >
          {pending ? 'Recherche…' : 'Chercher les ventes DVF'}
        </button>
      </form>
      <p className="mt-2 text-xs text-neutral-400">
        Ventes réellement enregistrées (DGFiP, données ouvertes officielles), pas les annonces en cours sur les
        portails.
      </p>

      {state?.error && <p className="mt-3 text-sm text-danger">{state.error}</p>}

      {state?.results && (
        <div className="mt-4 flex flex-col gap-2">
          {state.results.length === 0 && (
            <p className="text-sm text-neutral-400">
              Aucune vente trouvée pour ce code postal sur les dernières années.
            </p>
          )}
          {state.results.map((r, i) => {
            const pricePerM2 =
              r.valeurFonciere && r.surfaceReelleBati ? Math.round(r.valeurFonciere / r.surfaceReelleBati) : null
            return (
              <div
                key={i}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-neutral-200 bg-surface px-3 py-2 text-sm"
              >
                <div className="flex flex-1 flex-wrap gap-x-4 gap-y-1 text-neutral-700">
                  <span className="font-medium">{r.adresse || r.nomCommune || '—'}</span>
                  <span className="text-neutral-500">{r.surfaceReelleBati ? `${r.surfaceReelleBati} m²` : '—'}</span>
                  {r.surfaceTerrain !== null && (
                    <span className="text-neutral-500">Terrain {r.surfaceTerrain} m²</span>
                  )}
                  <span className="text-neutral-500">{r.valeurFonciere ? formatEUR(r.valeurFonciere) : '—'}</span>
                  {pricePerM2 && <span className="text-neutral-400">{formatEUR(pricePerM2)}/m²</span>}
                  <span className="text-neutral-400">{formatDvfDate(r.dateMutation)}</span>
                </div>
                <form action={addWithId}>
                  <input type="hidden" name="address" value={r.adresse || r.nomCommune} />
                  <input type="hidden" name="sale_date" value={r.dateMutation || ''} />
                  <input type="hidden" name="surface" value={r.surfaceReelleBati ?? ''} />
                  <input type="hidden" name="land_surface" value={r.surfaceTerrain ?? ''} />
                  <input type="hidden" name="price" value={r.valeurFonciere ?? ''} />
                  <button
                    type="submit"
                    className="shrink-0 rounded-lg border border-neutral-300 px-3 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-100"
                  >
                    Ajouter
                  </button>
                </form>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
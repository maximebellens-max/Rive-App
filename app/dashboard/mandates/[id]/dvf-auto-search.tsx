'use client'

import { useActionState, useEffect, useRef, useState } from 'react'
import { searchDvfComparables, type DvfSearchState } from '@/app/actions/dvf'
import { addDvfComparable } from '@/app/actions/mandates'
import { formatEUR } from '@/lib/rive/mandates'

const inputClass =
  'rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-accent focus:ring-1 focus:ring-accent'

const RADIUS_STEP = 5
const RADIUS_MIN = 5

function formatDvfDate(d: string | null): string {
  if (!d) return '—'
  const date = new Date(d)
  if (isNaN(date.getTime())) return d
  return new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }).format(date)
}

export default function DvfAutoSearch({
  mandateId,
  defaultAddress,
  defaultPostalCode,
  defaultPropertyType,
}: {
  mandateId: string
  defaultAddress: string
  defaultPostalCode: string
  defaultPropertyType: string
}) {
  const [state, action, pending] = useActionState<DvfSearchState, FormData>(searchDvfComparables, undefined)
  const addWithId = addDvfComparable.bind(null, mandateId)
  const formRef = useRef<HTMLFormElement>(null)
  const [radiusKm, setRadiusKm] = useState(RADIUS_MIN)
  const skipNextAutoSearch = useRef(true)

  const initialType =
    defaultPropertyType === 'Maison' || defaultPropertyType === 'Appartement' ? defaultPropertyType : 'Tous'

  // Élargir le rayon relance automatiquement la recherche avec la nouvelle
  // valeur, plutôt que de forcer un second clic sur "Chercher" — c'est tout
  // l'intérêt du bouton "+5 km". On saute le premier rendu pour ne pas
  // lancer de recherche avant que l'agent n'ait cliqué une première fois.
  useEffect(() => {
    if (skipNextAutoSearch.current) {
      skipNextAutoSearch.current = false
      return
    }
    formRef.current?.requestSubmit()
  }, [radiusKm])

  return (
    <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-4">
      <form ref={formRef} action={action} className="flex flex-wrap items-end gap-2">
        <div className="flex min-w-[220px] flex-1 flex-col gap-1">
          <label className="text-xs text-neutral-500" htmlFor="dvf-address">
            Adresse de référence
          </label>
          <input
            id="dvf-address"
            name="address"
            defaultValue={defaultAddress}
            placeholder="12 rue de la Paix, Annemasse"
            className={inputClass}
          />
        </div>
        {/* Repli si l'adresse est vidée ou introuvable : recherche par code
            postal, comme avant cette évolution. */}
        <input type="hidden" name="postal_code" value={defaultPostalCode} />
        <input type="hidden" name="radius_km" value={radiusKm} />
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

      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-neutral-500">
        <span>
          Rayon de recherche autour de l&apos;adresse : <span className="font-medium text-neutral-700">{radiusKm} km</span>
        </span>
        <button
          type="button"
          onClick={() => setRadiusKm((r) => r + RADIUS_STEP)}
          className="rounded-full border border-neutral-300 bg-surface px-2.5 py-1 font-medium text-neutral-700 hover:bg-neutral-100"
        >
          Élargir (+{RADIUS_STEP} km)
        </button>
        {radiusKm > RADIUS_MIN && (
          <button
            type="button"
            onClick={() => setRadiusKm(RADIUS_MIN)}
            className="text-neutral-400 hover:underline"
          >
            Réinitialiser
          </button>
        )}
      </div>
      <p className="mt-2 text-xs text-neutral-400">
        Ventes réellement enregistrées (DGFiP, données ouvertes officielles), pas les annonces en cours sur les
        portails. Si l&apos;adresse ci-dessus n&apos;est pas reconnue, la recherche se fait par code postal.
      </p>

      {state?.error && <p className="mt-3 text-sm text-danger">{state.error}</p>}

      {state?.results && (
        <div className="mt-4 flex flex-col gap-2">
          {state.radiusKm !== undefined && (
            <p className="text-xs text-neutral-500">
              {state.results.length} vente{state.results.length > 1 ? 's' : ''} trouvée
              {state.results.length > 1 ? 's' : ''} dans un rayon de {state.radiusKm} km.
            </p>
          )}
          {state.results.length === 0 && (
            <p className="text-sm text-neutral-400">
              Aucune vente trouvée pour l&apos;instant — essaie d&apos;élargir le rayon.
            </p>
          )}
          {state.results.map((r, i) => {
            const pricePerM2 =
              r.valeurFonciere && r.surfaceReelleBati ? Math.round(r.valeurFonciere / r.surfaceReelleBati) : null
            const distanceKm = 'distanceKm' in r ? r.distanceKm : null
            return (
              <div
                key={i}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-neutral-200 bg-surface px-3 py-2 text-sm"
              >
                <div className="flex flex-1 flex-wrap gap-x-4 gap-y-1 text-neutral-700">
                  <span className="font-medium">{r.adresse || r.nomCommune || '—'}</span>
                  {distanceKm !== null && (
                    <span className="text-neutral-400">{distanceKm < 1 ? '< 1 km' : `${distanceKm.toFixed(1)} km`}</span>
                  )}
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
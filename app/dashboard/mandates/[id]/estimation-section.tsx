import { addDvfComparable, removeDvfComparable } from '@/app/actions/mandates'
import { saveAISummary } from '@/app/actions/ai'
import { generateEstimationBrief } from '@/lib/rive/ai-prompts'
import AIBriefPanel from '../../_components/ai-brief-panel'
import DvfAutoSearch from './dvf-auto-search'
import ClearComparablesButton from './clear-comparables-button'
import { searchDvf, type DvfPropertyType } from '@/lib/rive/dvf-source'
import {
  estimationEngine,
  feeForPrice,
  netVendeur,
  rentalYield,
  formatEUR,
  formatDate,
  type DvfComparable,
} from '@/lib/rive/mandates'

type Comparable = {
  id: string
  address: string
  sale_date: string | null
  surface: number | null
  land_surface: number | null
  price: number | null
  is_active_listing: boolean
}

type Mandate = {
  address: string
  property_type: string
  surface: number | null
  land_surface: number | null
  pieces: number | null
  condition: string
  dpe: string
  floor: number | null
  has_elevator: boolean
  features: Record<string, boolean> | null
  price: number | null
  remaining_loan: number | null
  estimated_rent: number | null
  year_built: number | null
  recent_works: string
  manual_adjustment_pct: number | null
  manual_adjustment_note: string
  ai_summary: string
}

const inputClass =
  'rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-accent focus:ring-1 focus:ring-accent'

// Aucun des trois portails n'a d'API publique, et aucun n'expose un
// paramètre d'URL fiable pour filtrer par secteur (chaque portail a son
// propre système de zones/rayon, à choisir une fois sur place). Le type de
// bien, en revanche, se reflète bien dans l'URL sur LeBonCoin et PAP —
// vérifié en direct (real_estate_type:1 = Maison, :2 = Appartement sur
// LeBonCoin). SeLoger n'a pas d'équivalent stable connu, on ouvre sa page
// vente générale.
function portalLinks(propertyType: string): { label: string; href: string }[] {
  const pap =
    propertyType === 'Appartement'
      ? 'https://www.pap.fr/annonce/vente-appartements'
      : propertyType === 'Maison'
        ? 'https://www.pap.fr/annonce/vente-maisons'
        : 'https://www.pap.fr/annonce/vente-immobiliere'
  const leboncoinType = propertyType === 'Maison' ? '1' : propertyType === 'Appartement' ? '2' : '1,2'
  return [
    { label: 'SeLoger ↗', href: 'https://www.seloger.com/vente.html' },
    {
      label: 'LeBonCoin ↗',
      href: `https://www.leboncoin.fr/c/ventes_immobilieres/real_estate_type:${leboncoinType}`,
    },
    { label: 'PAP ↗', href: pap },
  ]
}

export default async function EstimationSection({
  mandateId,
  mandate,
  comparables,
  matchingBuyersCount = 0,
}: {
  mandateId: string
  mandate: Mandate
  comparables: Comparable[]
  matchingBuyersCount?: number
}) {
  const addWithId = addDvfComparable.bind(null, mandateId)
  const defaultPostalCode = mandate.address.match(/\b\d{5}\b/)?.[0] ?? ''

  // Fourchette automatique : dès que la surface est connue, on interroge le
  // secteur (toutes les ventes DVF du code postal) pour sortir une base de
  // prix/m² sans attendre qu'un seul comparable soit ajouté à la main —
  // l'étape "caractéristiques + charges → fourchette" attendue avant même de
  // passer à la comparaison ciblée.
  let sectorEstimation: ReturnType<typeof estimationEngine> = null
  let sectorCount = 0
  if (defaultPostalCode && mandate.surface) {
    const sectorType: DvfPropertyType =
      mandate.property_type === 'Maison' || mandate.property_type === 'Appartement' ? mandate.property_type : 'Tous'
    const { rows } = await searchDvf({ postalCode: defaultPostalCode, propertyType: sectorType, maxResults: 300 })
    sectorCount = rows.length
    const sectorComparables: DvfComparable[] = rows
      .filter((r) => r.valeurFonciere && r.surfaceReelleBati)
      .map((r) => ({
        address: r.adresse || r.nomCommune,
        sale_date: r.dateMutation,
        surface: r.surfaceReelleBati,
        price: r.valeurFonciere,
      }))
    sectorEstimation = estimationEngine({
      dvfComparables: sectorComparables,
      surface: mandate.surface,
      condition: mandate.condition,
      dpe: mandate.dpe,
      floor: mandate.floor,
      hasElevator: mandate.has_elevator,
      features: mandate.features,
      manualAdjustmentPct: mandate.manual_adjustment_pct,
      manualAdjustmentNote: mandate.manual_adjustment_note,
    })
  }

  // Estimation par comparaison : la même mécanique, mais sur la sélection
  // ciblée de biens (vendus DVF ou en vente actuellement) que l'agent a
  // choisi d'ajouter ci-dessous — plus fine que la moyenne brute du secteur.
  const estimation = estimationEngine({
    dvfComparables: comparables as DvfComparable[],
    surface: mandate.surface,
    condition: mandate.condition,
    dpe: mandate.dpe,
    floor: mandate.floor,
    hasElevator: mandate.has_elevator,
    features: mandate.features,
    manualAdjustmentPct: mandate.manual_adjustment_pct,
    manualAdjustmentNote: mandate.manual_adjustment_note,
  })

  const fee = feeForPrice(mandate.price)
  const net = netVendeur(mandate.price, mandate.remaining_loan)
  const yield_ = rentalYield(mandate.estimated_rent, mandate.price)
  const links = portalLinks(mandate.property_type)

  return (
    <div className="flex flex-col gap-6 rounded-2xl border border-neutral-200 bg-surface p-6 shadow-sm">
      {mandate.price !== null && (
        <div>
          <h2 className="text-sm font-semibold text-neutral-900">Honoraires & net vendeur</h2>
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="rounded-lg bg-neutral-50 px-4 py-3">
              <p className="text-xs text-neutral-500">Honoraires estimés</p>
              <p className="mt-1 text-lg font-semibold tabular-nums">{formatEUR(fee)}</p>
            </div>
            <div className="rounded-lg bg-neutral-50 px-4 py-3">
              <p className="text-xs text-neutral-500">Net vendeur</p>
              <p className="mt-1 text-lg font-semibold tabular-nums">{net === null ? '—' : formatEUR(net)}</p>
            </div>
            {yield_ !== null && (
              <div className="rounded-lg bg-neutral-50 px-4 py-3">
                <p className="text-xs text-neutral-500">Rendement locatif brut</p>
                <p className="mt-1 text-lg font-semibold tabular-nums">{yield_}%</p>
              </div>
            )}
          </div>
        </div>
      )}

      <div className={mandate.price !== null ? 'border-t border-neutral-100 pt-6' : ''}>
        <h2 className="text-sm font-semibold text-neutral-900">Fourchette automatique (secteur)</h2>
        <p className="mt-1 text-xs text-neutral-500">
          Calculée à partir des ventes DVF du secteur ({defaultPostalCode || 'code postal à renseigner'}) et des
          caractéristiques du bien — sans rien ajouter à la main.
        </p>

        {!mandate.surface ? (
          <p className="mt-3 text-sm text-neutral-400">
            Renseigne la surface du bien ci-dessus pour calculer une fourchette.
          </p>
        ) : !defaultPostalCode ? (
          <p className="mt-3 text-sm text-neutral-400">
            Renseigne une adresse avec code postal pour identifier le secteur.
          </p>
        ) : !sectorEstimation ? (
          <p className="mt-3 text-sm text-neutral-400">Aucune vente DVF trouvée sur ce secteur pour l&apos;instant.</p>
        ) : (
          <div className="mt-3 flex flex-col gap-3">
            <p className="text-sm text-neutral-600">
              Base secteur : {formatEUR(sectorEstimation.baseM2)}/m² sur {sectorCount} vente
              {sectorCount > 1 ? 's' : ''} DVF
            </p>
            <div className="rounded-xl bg-accent-soft px-5 py-4">
              <p className="text-xs text-neutral-500">Fourchette automatique</p>
              <p className="mt-1 text-2xl font-semibold tabular-nums text-neutral-900">
                {formatEUR(sectorEstimation.low)} — {formatEUR(sectorEstimation.high)}
              </p>
            </div>
            <p className="text-xs text-neutral-400">
              À affiner ci-dessous par comparaison avec des biens précis, vendus ou actuellement en vente.
            </p>
          </div>
        )}
      </div>

      <div className="border-t border-neutral-100 pt-6">
        <h2 className="text-sm font-semibold text-neutral-900">Comparaison — biens vendus & biens en vente</h2>
        <p className="mt-1 text-xs text-neutral-500">
          Relève des transactions comparables sur{' '}
          <a href="https://app.dvf.etalab.gouv.fr/" target="_blank" rel="noreferrer" className="underline">
            l&apos;explorateur DVF
          </a>{' '}
          ou lance une recherche automatique ci-dessous.
        </p>

        <div className="mt-4">
          <DvfAutoSearch
            mandateId={mandateId}
            defaultAddress={mandate.address}
            defaultPostalCode={defaultPostalCode}
            defaultPropertyType={mandate.property_type}
          />
        </div>

        <div className="mt-4 rounded-xl border border-neutral-200 bg-neutral-50 p-4">
          <p className="text-xs font-medium text-neutral-700">Biens actuellement en vente</p>
          <p className="mt-1 text-xs text-neutral-500">
            Pas d&apos;API publique côté portails (contrairement au DVF) : ouvre-les, repère un bien comparable
            dans le secteur, puis ajoute-le ci-dessous.
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {links.map((l) => (
              
                key={l.label}
                href={l.href}
                target="_blank"
                rel="noreferrer"
                className="rounded-lg border border-neutral-300 bg-surface px-3 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-100"
              >
                {l.label}
              </a>
            ))}
          </div>
        </div>

        {comparables.length > 0 && (
          <div className="mt-4 flex items-center justify-between">
            <p className="text-xs font-medium text-neutral-700">
              {comparables.length} comparable{comparables.length > 1 ? 's' : ''} sélectionné
              {comparables.length > 1 ? 's' : ''}
            </p>
            <ClearComparablesButton mandateId={mandateId} />
          </div>
        )}

        <div className="mt-2 flex flex-col gap-2">
          {comparables.map((c) => (
            <div
              key={c.id}
              className="flex items-center justify-between gap-3 rounded-lg border border-neutral-200 px-3 py-2 text-sm"
            >
              <div className="flex flex-1 flex-wrap items-center gap-x-4 gap-y-1 text-neutral-700">
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                    c.is_active_listing ? 'bg-warn-soft text-warn' : 'bg-good-soft text-good'
                  }`}
                >
                  {c.is_active_listing ? 'En vente' : 'Vendu'}
                </span>
                <span className="font-medium">{c.address || '—'}</span>
                <span className="text-neutral-500">{c.surface ? `${c.surface} m²` : '—'}</span>
                {c.land_surface !== null && (
                  <span className="text-neutral-500">Terrain {c.land_surface} m²</span>
                )}
                <span className="text-neutral-500">{c.price ? formatEUR(c.price) : '—'}</span>
                <span className="text-neutral-400">{formatDate(c.sale_date)}</span>
              </div>
              <form action={removeDvfComparable.bind(null, mandateId, c.id)}>
                <button type="submit" className="text-xs text-danger hover:underline">
                  Retirer
                </button>
              </form>
            </div>
          ))}
          {!comparables.length && (
            <p className="text-sm text-neutral-400">Aucun comparable saisi pour l&apos;instant.</p>
          )}
        </div>

        <form action={addWithId} className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-6">
          <input name="address" placeholder="Adresse" className={`${inputClass} col-span-2 sm:col-span-2`} />
          <input name="sale_date" type="date" className={inputClass} />
          <input name="surface" type="number" step="0.1" placeholder="m² bâti" className={inputClass} />
          <input name="land_surface" type="number" step="0.1" placeholder="m² terrain" className={inputClass} />
          <input name="price" type="number" placeholder="Prix €" className={inputClass} />
          <label className="col-span-2 flex items-center gap-1.5 text-xs text-neutral-600 sm:col-span-6">
            <input type="checkbox" name="is_active_listing" className="h-4 w-4" />
            Bien actuellement en vente (pas encore vendu — prix demandé, pas prix DVF)
          </label>
          <button
            type="submit"
            className="col-span-2 rounded-lg border border-neutral-300 px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-100 sm:col-span-6 sm:w-fit"
          >
            Ajouter le comparable
          </button>
        </form>
      </div>

      <div className="border-t border-neutral-100 pt-6">
        <h2 className="text-sm font-semibold text-neutral-900">Estimation par comparaison</h2>
        {!estimation ? (
          <p className="mt-2 text-sm text-neutral-400">
            Ajoute au moins un comparable ci-dessus et renseigne la surface du bien pour affiner la fourchette.
          </p>
        ) : (
          <div className="mt-3 flex flex-col gap-3">
            <p className="text-sm text-neutral-600">
              Base : {formatEUR(estimation.baseM2)}/m² sur {estimation.comparableCount} comparable
              {estimation.comparableCount > 1 ? 's' : ''} sélectionné{estimation.comparableCount > 1 ? 's' : ''}
            </p>
            {estimation.lines.length > 0 && (
              <ul className="flex flex-col gap-1 text-sm text-neutral-600">
                {estimation.lines.map((l, i) => (
                  <li key={i} className="flex justify-between">
                    <span>{l.label}</span>
                    <span className="tabular-nums">
                      {l.coeff >= 0 ? '+' : ''}
                      {Math.round(l.coeff * 1000) / 10}%
                    </span>
                  </li>
                ))}
              </ul>
            )}
            <p className="text-sm text-neutral-600">
              Prix ajusté au m² : <span className="font-medium tabular-nums">{formatEUR(estimation.adjustedM2)}</span>
            </p>
            <div className="rounded-xl bg-accent px-5 py-4 text-white">
              <p className="text-xs text-neutral-300">Fourchette estimée</p>
              <p className="mt-1 text-2xl font-semibold tabular-nums">
                {formatEUR(estimation.low)} — {formatEUR(estimation.high)}
              </p>
            </div>
          </div>
        )}
      </div>

      <AIBriefPanel
        title="Assistant IA — avis de valeur"
        prompt={generateEstimationBrief(mandate, comparables, estimation, matchingBuyersCount)}
        initialValue={mandate.ai_summary}
        onSave={saveAISummary.bind(null, mandateId)}
      />
    </div>
  )
}
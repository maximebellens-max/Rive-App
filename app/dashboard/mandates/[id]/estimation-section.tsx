import { addDvfComparable, removeDvfComparable } from '@/app/actions/mandates'
import { saveAISummary } from '@/app/actions/ai'
import { generateEstimationBrief } from '@/lib/rive/ai-prompts'
import AIBriefPanel from '../../_components/ai-brief-panel'
import {
  estimationEngine,
  feeForPrice,
  netVendeur,
  rentalYield,
  formatEUR,
  formatDate,
  type DvfComparable,
} from '@/lib/rive/mandates'

type Comparable = { id: string; address: string; sale_date: string | null; surface: number | null; price: number | null }

type Mandate = {
  address: string
  property_type: string
  surface: number | null
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
  ai_summary: string
}

const inputClass =
  'rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-accent focus:ring-1 focus:ring-accent'

export default function EstimationSection({
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

  const estimation = estimationEngine({
    dvfComparables: comparables as DvfComparable[],
    surface: mandate.surface,
    condition: mandate.condition,
    dpe: mandate.dpe,
    floor: mandate.floor,
    hasElevator: mandate.has_elevator,
    features: mandate.features,
  })

  const fee = feeForPrice(mandate.price)
  const net = netVendeur(mandate.price, mandate.remaining_loan)
  const yield_ = rentalYield(mandate.estimated_rent, mandate.price)

  return (
    <div className="flex flex-col gap-6 rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
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

      <div className="border-t border-neutral-100 pt-6">
        <h2 className="text-sm font-semibold text-neutral-900">Comparables DVF</h2>
        <p className="mt-1 text-xs text-neutral-500">
          Relève les transactions comparables sur{' '}
          <a
            href="https://app.dvf.etalab.gouv.fr/"
            target="_blank"
            rel="noreferrer"
            className="underline"
          >
            l&apos;explorateur DVF
          </a>{' '}
          et saisis-les ici.
        </p>

        <div className="mt-4 flex flex-col gap-2">
          {comparables.map((c) => (
            <div
              key={c.id}
              className="flex items-center justify-between gap-3 rounded-lg border border-neutral-200 px-3 py-2 text-sm"
            >
              <div className="flex flex-1 flex-wrap gap-x-4 gap-y-1 text-neutral-700">
                <span className="font-medium">{c.address || '—'}</span>
                <span className="text-neutral-500">{c.surface ? `${c.surface} m²` : '—'}</span>
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

        <form action={addWithId} className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-5">
          <input name="address" placeholder="Adresse" className={`${inputClass} col-span-2 sm:col-span-2`} />
          <input name="sale_date" type="date" className={inputClass} />
          <input name="surface" type="number" step="0.1" placeholder="m²" className={inputClass} />
          <div className="flex gap-2">
            <input name="price" type="number" placeholder="Prix €" className={`${inputClass} flex-1`} />
          </div>
          <button
            type="submit"
            className="col-span-2 rounded-lg border border-neutral-300 px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-100 sm:col-span-5 sm:w-fit"
          >
            Ajouter le comparable
          </button>
        </form>
      </div>

      <div className="border-t border-neutral-100 pt-6">
        <h2 className="text-sm font-semibold text-neutral-900">Moteur d&apos;estimation</h2>
        {!estimation ? (
          <p className="mt-2 text-sm text-neutral-400">
            Ajoute au moins un comparable et renseigne la surface du bien pour calculer une fourchette.
          </p>
        ) : (
          <div className="mt-3 flex flex-col gap-3">
            <p className="text-sm text-neutral-600">
              Base : {formatEUR(estimation.baseM2)}/m² sur {estimation.comparableCount} comparable
              {estimation.comparableCount > 1 ? 's' : ''}
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

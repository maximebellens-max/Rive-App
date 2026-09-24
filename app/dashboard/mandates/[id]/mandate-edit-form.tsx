'use client'

// Formulaire de saisie du bien. Réorganisé en cartes façon MyNotary : les
// champs qui alimentent directement le contrat (voir buildVenteSections
// dans lib/rive/mandate-document-model.ts — Bien, Prix, Durée & exclusivité)
// restent toujours visibles en haut, dans des cartes courtes et distinctes.
// Tout le reste (caractéristiques secondaires, charges, ajustement
// d'estimation, étape commerciale) sert au moteur d'estimation ou au suivi
// mais n'apparaît dans aucune phrase du mandat — replié par défaut sous
// "Voir plus" pour ne pas noyer la rédaction du contrat dans des champs
// qui ne la concernent pas. Aucun champ n'est supprimé, aucune logique ne
// change : seul l'agencement visuel bouge.
import { useActionState, useState } from 'react'
import { updateMandate, type MandateFormState } from '@/app/actions/mandates'
import { CONDITION_LEVELS, DPE_LEVELS, FEATURE_KEYS, PROPERTY_TYPES, propertyHasLand, propertyHasFloor } from '@/lib/rive/mandates'
import AddressAutocomplete from '../../_components/address-autocomplete'
import { useSavedFlash } from '../../_components/use-saved-flash'

type Mandate = {
  id: string
  type: string
  address: string
  property_type: string
  surface: number | null
  land_surface: number | null
  pieces: number | null
  price: number | null
  remaining_loan: number | null
  signed_date: string | null
  sold_date: string | null
  exclusivity: string
  duration_months: number | null
  tacit_renewal: boolean
  renewal_notice_days: number
  condition: string
  dpe: string
  floor: number | null
  has_elevator: boolean
  features: Record<string, boolean> | null
  year_built: number | null
  recent_works: string
  estimated_rent: number | null
  annual_energy_cost: number | null
  property_tax: number | null
  other_charges: number | null
  other_charges_note: string
  manual_adjustment_pct: number | null
  manual_adjustment_note: string
  notes: string
  stage: string
  is_draft: boolean
}

const inputClass =
  'rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-accent focus:ring-1 focus:ring-accent'
const labelClass = 'text-sm font-medium text-neutral-700'
const cardClass = 'flex flex-col gap-4 rounded-2xl border border-neutral-200 bg-surface p-6 shadow-sm'
const detailsClass = 'group rounded-2xl border border-neutral-200 bg-surface shadow-sm'
const summaryClass =
  'flex cursor-pointer list-none items-center justify-between px-6 py-4 text-sm font-semibold text-neutral-900 [&::-webkit-details-marker]:hidden'

export default function MandateEditForm({ mandate }: { mandate: Mandate }) {
  const updateWithId = updateMandate.bind(null, mandate.id)
  const [state, action, pending] = useActionState<MandateFormState, FormData>(
    updateWithId,
    undefined
  )
  const justSaved = useSavedFlash(pending)
  const [address, setAddress] = useState(mandate.address)
  const [propertyType, setPropertyType] = useState(mandate.property_type)
  const showLand = propertyHasLand(propertyType)
  const showFloor = propertyHasFloor(propertyType)
  const [stage, setStage] = useState(mandate.stage)

  return (
    <form action={action} className="flex flex-col gap-6">
      <section className={cardClass}>
        <h2 className="text-sm font-semibold text-neutral-900">Le bien</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <label className={labelClass}>Adresse</label>
            <AddressAutocomplete name="address" value={address} onChange={setAddress} className={inputClass} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className={labelClass}>Type de bien</label>
            <select
              name="property_type"
              value={propertyType}
              onChange={(e) => setPropertyType(e.target.value)}
              className={inputClass}
            >
              <option value="">—</option>
              {PROPERTY_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className={labelClass}>Surface (m²)</label>
            <input name="surface" type="number" step="0.1" defaultValue={mandate.surface ?? ''} className={inputClass} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className={labelClass}>Pièces</label>
            <input name="pieces" type="number" defaultValue={mandate.pieces ?? ''} className={inputClass} />
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          <label className={labelClass}>Notes sur le bien</label>
          <p className="text-xs text-neutral-400">Apparaît telle quelle dans la désignation du bien, sur le contrat.</p>
          <textarea name="notes" defaultValue={mandate.notes} rows={2} className={inputClass} />
        </div>
      </section>

      {!mandate.is_draft && (
        <section className={cardClass}>
          <h2 className="text-sm font-semibold text-neutral-900">Prix</h2>
          <div className="sm:w-64">
            <div className="flex flex-col gap-1.5">
              <label className={labelClass}>Prix (€)</label>
              <input name="price" type="number" defaultValue={mandate.price ?? ''} className={inputClass} />
            </div>
          </div>
        </section>
      )}

      {!mandate.is_draft && (
        <section className={cardClass}>
          <h2 className="text-sm font-semibold text-neutral-900">Durée & exclusivité</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <label className={labelClass}>Exclusivité</label>
              <select name="exclusivity" defaultValue={mandate.exclusivity} className={inputClass}>
                <option value="">—</option>
                <option value="exclusif">Exclusif</option>
                <option value="simple">Simple</option>
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className={labelClass}>Date de signature</label>
              <input name="signed_date" type="date" defaultValue={mandate.signed_date ?? ''} className={inputClass} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className={labelClass}>Durée (mois)</label>
              <input name="duration_months" type="number" defaultValue={mandate.duration_months ?? ''} className={inputClass} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className={labelClass}>Préavis de renouvellement (jours)</label>
              <input
                name="renewal_notice_days"
                type="number"
                defaultValue={mandate.renewal_notice_days ?? 15}
                className={inputClass}
              />
            </div>
            <label className="flex items-center gap-2 text-sm text-neutral-700">
              <input type="checkbox" name="tacit_renewal" defaultChecked={mandate.tacit_renewal} className="h-4 w-4" />
              Reconduction tacite
            </label>
          </div>
        </section>
      )}

      {/* Tout ce qui suit alimente le moteur d'estimation ou le suivi
          commercial, mais n'apparaît dans aucune clause du contrat — replié
          par défaut pour garder la rédaction du mandat au premier plan. */}
      <details className={detailsClass}>
        <summary className={summaryClass}>
          Caractéristiques complémentaires & estimation
          <span className="text-xs font-normal text-neutral-400 group-open:hidden">Afficher</span>
          <span className="hidden text-xs font-normal text-neutral-400 group-open:inline">Masquer</span>
        </summary>
        <div className="flex flex-col gap-6 border-t border-neutral-100 px-6 pb-6 pt-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {showLand && (
              <div className="flex flex-col gap-1.5">
                <label className={labelClass}>Surface du terrain (m²)</label>
                <input
                  name="land_surface"
                  type="number"
                  step="0.1"
                  placeholder="Pour une maison"
                  defaultValue={mandate.land_surface ?? ''}
                  className={inputClass}
                />
              </div>
            )}
            {showFloor && (
              <div className="flex flex-col gap-1.5">
                <label className={labelClass}>Étage</label>
                <input name="floor" type="number" defaultValue={mandate.floor ?? ''} className={inputClass} />
              </div>
            )}
            <div className="flex flex-col gap-1.5">
              <label className={labelClass}>État</label>
              <select name="condition" defaultValue={mandate.condition} className={inputClass}>
                <option value="">—</option>
                {CONDITION_LEVELS.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className={labelClass}>DPE</label>
              <select name="dpe" defaultValue={mandate.dpe} className={inputClass}>
                <option value="">—</option>
                {DPE_LEVELS.map((d) => (
                  <option key={d.value} value={d.value}>
                    {d.value}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className={labelClass}>Année de construction</label>
              <input name="year_built" type="number" defaultValue={mandate.year_built ?? ''} className={inputClass} />
            </div>
            {showFloor && (
              <label className="flex items-center gap-2 text-sm text-neutral-700">
                <input type="checkbox" name="has_elevator" defaultChecked={mandate.has_elevator} className="h-4 w-4" />
                Ascenseur
              </label>
            )}
            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <label className={labelClass}>Travaux récents</label>
              <input name="recent_works" defaultValue={mandate.recent_works} className={inputClass} />
            </div>
          </div>

          <div className="flex flex-wrap gap-4">
            {FEATURE_KEYS.map((f) => (
              <label key={f.key} className="flex items-center gap-2 text-sm text-neutral-700">
                <input
                  type="checkbox"
                  name={`feature_${f.key}`}
                  defaultChecked={!!mandate.features?.[f.key]}
                  className="h-4 w-4"
                />
                {f.label}
              </label>
            ))}
          </div>

          <div className="flex flex-col gap-4 border-t border-neutral-100 pt-6">
            <div>
              <h3 className="text-sm font-semibold text-neutral-900">Charges annuelles</h3>
              <p className="mt-1 text-xs text-neutral-500">
                Utile dès l&apos;estimation pour informer le client, avant même de connaître le prix de vente.
              </p>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="flex flex-col gap-1.5">
                <label className={labelClass}>Dépense énergétique (€/an)</label>
                <input
                  name="annual_energy_cost"
                  type="number"
                  defaultValue={mandate.annual_energy_cost ?? ''}
                  className={inputClass}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className={labelClass}>Taxe foncière (€/an)</label>
                <input name="property_tax" type="number" defaultValue={mandate.property_tax ?? ''} className={inputClass} />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className={labelClass}>Autres charges (€/an)</label>
                <input name="other_charges" type="number" defaultValue={mandate.other_charges ?? ''} className={inputClass} />
              </div>
              <div className="flex flex-col gap-1.5 sm:col-span-3">
                <label className={labelClass}>Précision sur les autres charges</label>
                <input
                  name="other_charges_note"
                  placeholder="Copropriété, syndic…"
                  defaultValue={mandate.other_charges_note}
                  className={inputClass}
                />
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-4 border-t border-neutral-100 pt-6">
            <div>
              <h3 className="text-sm font-semibold text-neutral-900">Ajustement de l&apos;estimation</h3>
              <p className="mt-1 text-xs text-neutral-500">
                Vient s&apos;ajouter aux coefficients automatiques (état, DPE, prestations…) — utile si le bien
                diffère nettement des comparables sur un point qu&apos;ils ne couvrent pas (terrain plus grand,
                vue, nuisance…). Exemple : +8 si le bien est neuf par rapport aux comparables du secteur.
              </p>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="flex flex-col gap-1.5">
                <label className={labelClass}>Ajustement (%)</label>
                <input
                  name="manual_adjustment_pct"
                  type="number"
                  step="0.5"
                  placeholder="ex. 8 ou -5"
                  defaultValue={mandate.manual_adjustment_pct ?? ''}
                  className={inputClass}
                />
              </div>
              <div className="flex flex-col gap-1.5 sm:col-span-2">
                <label className={labelClass}>Motif</label>
                <input
                  name="manual_adjustment_note"
                  placeholder="ex. Terrain nettement plus grand que les comparables"
                  defaultValue={mandate.manual_adjustment_note}
                  className={inputClass}
                />
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-4 border-t border-neutral-100 pt-6">
            <h3 className="text-sm font-semibold text-neutral-900">
              {mandate.is_draft ? 'Situation financière' : 'Autres informations financières'}
            </h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <label className={labelClass}>Capital restant dû (€)</label>
                <input name="remaining_loan" type="number" defaultValue={mandate.remaining_loan ?? ''} className={inputClass} />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className={labelClass}>Loyer mensuel estimé (€)</label>
                <input name="estimated_rent" type="number" defaultValue={mandate.estimated_rent ?? ''} className={inputClass} />
              </div>
            </div>
          </div>
        </div>
      </details>

      {!mandate.is_draft && (
        <details className={detailsClass}>
          <summary className={summaryClass}>
            Étape du mandat
            <span className="text-xs font-normal text-neutral-400 group-open:hidden">Afficher</span>
            <span className="hidden text-xs font-normal text-neutral-400 group-open:inline">Masquer</span>
          </summary>
          <div className="grid grid-cols-1 gap-4 border-t border-neutral-100 px-6 pb-6 pt-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <label className={labelClass}>Étape</label>
              <select
                name="stage"
                value={stage}
                onChange={(e) => setStage(e.target.value)}
                className={inputClass}
              >
                <option value="en_cours">En cours</option>
                <option value="compromis_signe">Compromis signé</option>
                <option value="vendu">Vendu</option>
              </select>
            </div>
            {/* La date de vente n'a de sens qu'une fois le mandat passé à
                "Vendu" — inutile de l'afficher dès "En cours". */}
            {stage === 'vendu' && (
              <div className="flex flex-col gap-1.5">
                <label className={labelClass}>Date de vente</label>
                <input name="sold_date" type="date" defaultValue={mandate.sold_date ?? ''} className={inputClass} />
              </div>
            )}
          </div>
        </details>
      )}

      {mandate.is_draft && <input type="hidden" name="stage" value={mandate.stage} />}

      {state?.error && (
        <p className="text-sm text-danger" role="alert">
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className={`w-fit rounded-lg px-5 py-2.5 text-sm font-medium transition disabled:opacity-60 ${
          justSaved && !state?.error ? 'bg-good text-good-ink' : 'bg-accent text-accent-ink hover:bg-accent-hover'
        }`}
      >
        {pending ? 'Enregistrement…' : justSaved && !state?.error ? '✓ Enregistré' : 'Enregistrer'}
      </button>
    </form>
  )
}
import { addMandateLot, removeMandateLot, updateMandateProperty } from '@/app/actions/mandate-property'
import { ACQUISITION_MODES, DIAGNOSTIC_TYPES, dateUrgency, diagnosticRelevance } from '@/lib/rive/mandates'
import type { Copropriete, Diagnostics, OriginePropriete } from '@/lib/rive/mandates'
import CoproprieteFields from './copropriete-fields'

type Lot = { id: string; lot_number: string; designation: string; tantiemes: string }

type Mandate = {
  property_type: string
  year_built: number | null
  en_copropriete: boolean
  copropriete: Copropriete | null
  origine_propriete: OriginePropriete | null
  diagnostics: Diagnostics | null
}

const inputClass =
  'rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-accent focus:ring-1 focus:ring-accent'
const labelClass = 'text-sm font-medium text-neutral-700'

const urgencyDot: Record<string, string> = {
  overdue: 'bg-danger',
  soon: 'bg-warn',
  ok: 'bg-good',
  none: 'bg-neutral-200',
}

const URGENCY_LEGEND = [
  { urgency: 'ok', label: 'Valide' },
  { urgency: 'soon', label: 'Bientôt expiré' },
  { urgency: 'overdue', label: 'Expiré' },
  { urgency: 'none', label: 'Non renseigné' },
] as const

export default function PropertyDetailsSection({
  mandateId,
  mandate,
  lots,
}: {
  mandateId: string
  mandate: Mandate
  lots: Lot[]
}) {
  const copro = mandate.copropriete || {}
  const origine = mandate.origine_propriete || {}
  const diagnostics = mandate.diagnostics || {}
  const addLotWithId = addMandateLot.bind(null, mandateId)
  const updateWithId = updateMandateProperty.bind(null, mandateId)

  return (
    <div className="flex flex-col gap-6 rounded-2xl border border-neutral-200 bg-surface p-6 shadow-sm">
      <div>
        <h2 className="text-sm font-semibold text-neutral-900">Fiche bien — copropriété, origine, diagnostics</h2>
        <p className="mt-1 text-xs text-neutral-500">
          Vient s&apos;ajouter aux informations d&apos;estimation ci-dessus (rien n&apos;est retiré) — pour préparer
          la commercialisation et, plus tard, la diffusion vers les portails.
        </p>
      </div>

      <div className="border-t border-neutral-100 pt-6">
        <h3 className="text-sm font-semibold text-neutral-900">Lots de copropriété</h3>
        <p className="mt-1 text-xs text-neutral-500">
          L&apos;appartement lui-même, plus une cave, un parking… chaque lot porté par ce mandat, avec son numéro et
          ses tantièmes.
        </p>

        <div className="mt-3 flex flex-col gap-2">
          {lots.map((lot) => (
            <div
              key={lot.id}
              className="flex items-center justify-between gap-3 rounded-lg border border-neutral-200 px-3 py-2 text-sm"
            >
              <div className="flex flex-1 flex-wrap items-center gap-x-4 gap-y-1 text-neutral-700">
                <span className="font-medium">Lot n°{lot.lot_number || '—'}</span>
                <span className="text-neutral-500">{lot.designation || '—'}</span>
                {lot.tantiemes && <span className="text-neutral-400">{lot.tantiemes}</span>}
              </div>
              <form action={removeMandateLot.bind(null, mandateId, lot.id)}>
                <button type="submit" className="text-xs text-danger hover:underline">
                  Retirer
                </button>
              </form>
            </div>
          ))}
          {!lots.length && <p className="text-sm text-neutral-400">Aucun lot renseigné pour l&apos;instant.</p>}
        </div>

        <form action={addLotWithId} className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <input name="lot_number" placeholder="N° de lot" className={inputClass} />
          <input name="designation" placeholder="Désignation (Appartement, Cave…)" className={`${inputClass} sm:col-span-2`} />
          <input name="tantiemes" placeholder="Tantièmes (ex. 125/10000)" className={inputClass} />
          <button
            type="submit"
            className="col-span-2 rounded-lg border border-neutral-300 px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-100 sm:col-span-4 sm:w-fit"
          >
            Ajouter un lot
          </button>
        </form>
      </div>

      <form action={updateWithId} className="flex flex-col gap-6 border-t border-neutral-100 pt-6">
        <section className="flex flex-col gap-3">
          <CoproprieteFields defaultChecked={mandate.en_copropriete} copro={copro} />
        </section>

        <section className="flex flex-col gap-3 border-t border-neutral-100 pt-6">
          <h3 className="text-sm font-semibold text-neutral-900">Origine de propriété</h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="flex flex-col gap-1.5">
              <label className={labelClass}>Date d&apos;acquisition</label>
              <input
                name="origine_date_acquisition"
                type="date"
                defaultValue={origine.date_acquisition ?? ''}
                className={inputClass}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className={labelClass}>Mode d&apos;acquisition</label>
              <select name="origine_mode_acquisition" defaultValue={origine.mode_acquisition ?? ''} className={inputClass}>
                <option value="">—</option>
                {ACQUISITION_MODES.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className={labelClass}>Prix d&apos;acquisition (€)</label>
              <input
                name="origine_prix_acquisition"
                type="number"
                defaultValue={origine.prix_acquisition ?? ''}
                className={inputClass}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className={labelClass}>Notaire</label>
              <input name="origine_notaire" defaultValue={origine.notaire ?? ''} className={inputClass} />
            </div>
            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <label className={labelClass}>Référence de l&apos;acte</label>
              <input name="origine_reference_acte" defaultValue={origine.reference_acte ?? ''} className={inputClass} />
            </div>
          </div>
        </section>

        <section className="flex flex-col gap-3 border-t border-neutral-100 pt-6">
          <div>
            <h3 className="text-sm font-semibold text-neutral-900">Diagnostics</h3>
            <p className="mt-1 text-xs text-neutral-500">
              Les fichiers justificatifs (rapport de diagnostiqueur…) se déposent dans « Photos & documents »
              ci-dessous, en les rattachant au diagnostic concerné. Le repère « Non concerné » se déduit du type de
              bien, de la copropriété et de l&apos;année de construction déjà renseignés — vérifie toujours au cas
              par cas, ça ne remplace pas un avis de diagnostiqueur.
            </p>
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
              {URGENCY_LEGEND.map((l) => (
                <span key={l.urgency} className="flex items-center gap-1.5 text-xs text-neutral-500">
                  <span className={`h-2 w-2 shrink-0 rounded-full ${urgencyDot[l.urgency]}`} />
                  {l.label}
                </span>
              ))}
            </div>
          </div>
          <div className="flex flex-col gap-4">
            {DIAGNOSTIC_TYPES.map((d) => {
              const entry = diagnostics[d.key]
              const urgency = dateUrgency(entry?.date_validite ? new Date(entry.date_validite) : null)
              const relevance = diagnosticRelevance(d.key, {
                enCopropriete: mandate.en_copropriete,
                yearBuilt: mandate.year_built,
              })
              const notConcerned = relevance === 'not_concerned'
              return (
                <div key={d.key} className={`grid grid-cols-2 items-end gap-2 sm:grid-cols-5 ${notConcerned ? 'opacity-50' : ''}`}>
                  <div className="col-span-2 flex flex-col gap-1 sm:col-span-1">
                    <div className="flex items-center gap-2 text-sm font-medium text-neutral-700">
                      <span className={`h-2 w-2 shrink-0 rounded-full ${urgencyDot[urgency]}`} />
                      {d.label}
                    </div>
                    {relevance === 'concerned' && d.key === 'dpe' && (
                      <span className="w-fit rounded-full bg-accent-soft px-2 py-0.5 text-[10px] font-medium text-neutral-700">
                        Obligatoire
                      </span>
                    )}
                    {relevance === 'concerned' && d.key !== 'dpe' && (
                      <span className="w-fit rounded-full bg-accent-soft px-2 py-0.5 text-[10px] font-medium text-neutral-700">
                        Concerné
                      </span>
                    )}
                    {notConcerned && (
                      <span className="w-fit rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] font-medium text-neutral-500">
                        Non concerné
                      </span>
                    )}
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-xs text-neutral-500">Réalisé le</label>
                    <input
                      name={`diag_${d.key}_date_realisation`}
                      type="date"
                      defaultValue={entry?.date_realisation ?? ''}
                      className={inputClass}
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-xs text-neutral-500">Valide jusqu&apos;au</label>
                    <input
                      name={`diag_${d.key}_date_validite`}
                      type="date"
                      defaultValue={entry?.date_validite ?? ''}
                      className={inputClass}
                    />
                  </div>
                  <div className="col-span-2 flex flex-col gap-1 sm:col-span-2">
                    <label className="text-xs text-neutral-500">Résultat</label>
                    <input
                      name={`diag_${d.key}_resultat`}
                      placeholder="ex. Classe C, absence de matériaux amiantés…"
                      defaultValue={entry?.resultat ?? ''}
                      className={inputClass}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </section>

        <button
          type="submit"
          className="w-fit rounded-lg bg-accent px-5 py-2.5 text-sm font-medium text-accent-ink transition hover:bg-accent-hover"
        >
          Enregistrer
        </button>
      </form>
    </div>
  )
}
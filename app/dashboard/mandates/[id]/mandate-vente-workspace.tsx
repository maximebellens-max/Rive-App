'use client'

// Atelier de rédaction du mandat de vente/recherche : la saisie à gauche
// (mandant(s), bien, prix, honoraires, durée, exclusivité — les mêmes
// composants qu'avant, PartiesSection + MandateEditForm) et l'aperçu du
// contrat qui se remplit en direct à droite, sur le principe "texte à
// trous" de MyNotary. Volontairement PAS un formulaire entièrement contrôlé
// réécrit de zéro : les champs restent non-contrôlés (defaultValue) et
// s'enregistrent exactement comme avant via les server actions existantes —
// seul un `onChange` posé sur le conteneur (les événements de changement
// d'un input/select/textarea remontent naturellement jusqu'à lui) vient
// recopier chaque frappe dans un état local qui pilote uniquement l'aperçu.
// Beaucoup moins de risque de régression qu'une réécriture complète, pour le
// même résultat visible.
import { useEffect, useMemo, useState } from 'react'
import MandateEditForm from './mandate-edit-form'
import PartiesSection from './parties-section'
import MandateLivePreview from './mandate-live-preview'
import { buildVenteSections, sectionCompletion } from '@/lib/rive/mandate-document-model'
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

type Agency = {
  name: string
  legal_form: string
  address: string
  legal_rep_civility: string
  legal_rep_first_name: string
  legal_rep_last_name: string
}

// Sous-ensemble des champs du mandat que l'aperçu en direct suit — un
// onChange sur un champ hors de cette liste (ex. "notes") est ignoré
// silencieusement par le réducteur ci-dessous (name absent de l'état).
type LiveState = {
  type: string
  exclusivity: string
  address: string
  property_type: string
  surface: number | null
  pieces: number | null
  price: number | null
  duration_months: number | null
  renewal_notice_days: number | null
  notes: string
}

function toLiveState(mandate: LiveState): LiveState {
  return {
    type: mandate.type,
    exclusivity: mandate.exclusivity,
    address: mandate.address,
    property_type: mandate.property_type,
    surface: mandate.surface,
    pieces: mandate.pieces,
    price: mandate.price,
    duration_months: mandate.duration_months,
    renewal_notice_days: mandate.renewal_notice_days,
    notes: mandate.notes,
  }
}

const NUMBER_FIELDS = new Set(['surface', 'pieces', 'price', 'duration_months', 'renewal_notice_days'])

export default function MandateVenteWorkspace({
  mandate,
  parties,
  agency,
}: {
  // any autre champ nécessaire à MandateEditForm est toléré ici (voir plus
  // bas, transmis tel quel) — seuls ceux de LiveState sont suivis en direct.
  mandate: LiveState & Record<string, unknown> & { id: string; updated_at?: string }
  parties: Party[]
  agency: Agency
}) {
  const [live, setLive] = useState<LiveState>(() => toLiveState(mandate))

  // Recalé si la fiche vient d'être réenregistrée côté serveur (nouvelle
  // version des props après un submit) — sans ça, l'état local de l'aperçu
  // resterait figé sur les valeurs vues au tout premier rendu du composant.
  useEffect(() => {
    setLive(toLiveState(mandate))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mandate.id, mandate.updated_at])

  function handleChange(e: React.ChangeEvent<HTMLDivElement>) {
    const el = e.target as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    const name = el.name
    if (!name || !(name in live)) return
    const isCheckbox = el instanceof HTMLInputElement && el.type === 'checkbox'
    const raw = isCheckbox ? (el as HTMLInputElement).checked : el.value
    setLive((prev) => ({
      ...prev,
      [name]: NUMBER_FIELDS.has(name) ? (raw === '' ? null : Number(raw)) : raw,
    }))
  }

  const sections = useMemo(() => buildVenteSections(live), [live])
  const completion = sectionCompletion(sections)
  const isVente = live.type === 'vente'
  const repName = `${agency.legal_rep_civility} ${agency.legal_rep_first_name} ${agency.legal_rep_last_name}`.trim()

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 lg:items-start">
      <div className="flex flex-col gap-6">
        {/* PartiesSection reste HORS de la délégation onChange ci-dessous :
            son mini-formulaire "Ajouter un mandant" a lui aussi un champ
            "address" (l'adresse du mandant), qui entrerait en collision avec
            le champ "address" du bien (Bien à vendre) si les deux
            remontaient au même gestionnaire — seul le bloc Bien/Prix/Durée
            doit alimenter l'aperçu en direct. */}
        <PartiesSection mandateId={mandate.id} parties={parties} />
        <div className="rounded-2xl border border-neutral-200 bg-surface p-6 shadow-sm" onChange={handleChange}>
          <MandateEditForm mandate={mandate as never} />
        </div>
      </div>

      <div className="lg:sticky lg:top-4">
        <div className="mb-2 flex items-center justify-between px-1 text-xs text-neutral-500">
          <span>Aperçu du contrat en direct</span>
          <span
            className={`rounded-full px-2 py-0.5 font-medium ${
              completion.total > 0 && completion.filled === completion.total
                ? 'bg-good-soft text-good'
                : 'bg-neutral-100 text-neutral-600'
            }`}
          >
            {completion.filled}/{completion.total} champs remplis
          </span>
        </div>
        <MandateLivePreview
          title={isVente ? `Mandat ${live.exclusivity === 'exclusif' ? 'exclusif' : 'simple'} de vente` : 'Mandat de recherche'}
          subtitle="Conforme à la loi n° 70-9 du 2 janvier 1970 et au décret n° 72-678 du 20 juillet 1972"
          mandantBlock={
            parties.length ? (
              <div className="flex flex-col gap-1">
                {parties.map((p) => (
                  <p key={p.id} className="text-neutral-700">
                    {p.civility} {p.first_name} {p.last_name}
                    {p.address ? ` demeurant ${p.address}.` : '.'}
                    {p.birth_place ? ` Né(e) à ${p.birth_place}` : ''}
                    {p.birth_date ? ` le ${formatDate(p.birth_date)}` : ''}
                    {p.marital_status ? ` · ${p.marital_status}` : ''}
                  </p>
                ))}
              </div>
            ) : (
              <p className="rounded bg-warn-soft px-1 py-0.5 text-warn">Aucun mandant renseigné pour l&apos;instant</p>
            )
          }
          mandataireBlock={
            <p className="text-neutral-700">
              {agency.legal_form || 'Société'} {agency.name}, {agency.address || '—'}, représentée par{' '}
              {repName || '—'}.
            </p>
          }
          sections={sections}
        />
      </div>
    </div>
  )
}
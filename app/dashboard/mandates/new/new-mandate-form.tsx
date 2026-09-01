'use client'

import { useActionState, useState } from 'react'
import { createMandate, type MandateFormState } from '@/app/actions/mandates'
import { PROPERTY_TYPES } from '@/lib/rive/mandates'
import AddressAutocomplete from '../../_components/address-autocomplete'

type Lead = {
  id: string
  name: string
  category: string | null
  critere_type: string
  critere_lieu: string
  budget: number | null
  surface_min: number | null
}

const inputClass =
  'rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-accent focus:ring-1 focus:ring-accent'

export default function NewMandateForm({ leads, draft = false }: { leads: Lead[]; draft?: boolean }) {
  const [state, action, pending] = useActionState<MandateFormState, FormData>(
    createMandate,
    undefined
  )

  const [address, setAddress] = useState('')
  const [propertyType, setPropertyType] = useState('')
  const [surface, setSurface] = useState('')

  // Client lié : soit un prospect déjà existant (sélectionné dans la liste),
  // soit un tout nouveau contact créé à la volée — il rejoint alors
  // automatiquement le pipeline Vendeurs (ou Acheteurs pour un mandat de
  // recherche), sans avoir à repasser par l'onglet Prospects.
  const [contactMode, setContactMode] = useState<'existing' | 'new'>('existing')

  function handleLeadChange(leadId: string) {
    const lead = leads.find((l) => l.id === leadId)
    if (!lead) return
    // Pré-remplit depuis les critères déjà saisis sur la fiche du prospect,
    // pour éviter de ressaisir ce qu'on connaît déjà. Reste modifiable.
    setAddress(lead.critere_lieu || '')
    setPropertyType(lead.critere_type || '')
    setSurface(lead.surface_min ? String(lead.surface_min) : '')
  }

  return (
    <form action={action} className="flex flex-col gap-5">
      {draft && <input type="hidden" name="is_draft" value="true" />}
      {/* Au stade de l'estimation, l'exclusivité n'est pas encore négociée
          avec le client — ce choix se fait plus tard, à la signature, depuis
          la fiche du mandat. On force donc un mandat de vente par défaut. */}
      {draft && <input type="hidden" name="kind" value="vente" />}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {!draft && (
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-neutral-700">Type de mandat</label>
            <select name="kind" defaultValue="vente_exclusif" className={inputClass}>
              <option value="vente_exclusif">Vente — Exclusif</option>
              <option value="vente_simple">Vente — Simple</option>
              <option value="recherche">Recherche (mandat acheteur)</option>
            </select>
          </div>
        )}

        <div className="flex flex-col gap-1.5 sm:col-span-2">
          <label className="text-sm font-medium text-neutral-700">Client lié</label>
          <div className="flex gap-1.5">
            <button
              type="button"
              onClick={() => setContactMode('existing')}
              className={`rounded-lg border px-3 py-1.5 text-xs font-medium ${
                contactMode === 'existing'
                  ? 'border-accent bg-accent-soft text-accent-ink'
                  : 'border-neutral-300 text-neutral-600 hover:bg-neutral-100'
              }`}
            >
              Client existant
            </button>
            <button
              type="button"
              onClick={() => setContactMode('new')}
              className={`rounded-lg border px-3 py-1.5 text-xs font-medium ${
                contactMode === 'new'
                  ? 'border-accent bg-accent-soft text-accent-ink'
                  : 'border-neutral-300 text-neutral-600 hover:bg-neutral-100'
              }`}
            >
              Nouveau client
            </button>
          </div>

          {contactMode === 'existing' ? (
            <>
              <select
                name="lead_id"
                defaultValue=""
                onChange={(e) => handleLeadChange(e.target.value)}
                className={`${inputClass} mt-1.5`}
              >
                <option value="">Aucun</option>
                {leads.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name}
                    {l.category ? ` (${l.category})` : ''}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-neutral-400">
                Choisir un prospect pré-remplit l&apos;adresse, le type de bien et la surface depuis sa fiche.
              </p>
            </>
          ) : (
            <>
              <div className="mt-1.5 grid grid-cols-2 gap-2 sm:grid-cols-4">
                <select name="new_lead_civility" defaultValue="Monsieur" className={inputClass}>
                  <option value="Monsieur">Monsieur</option>
                  <option value="Madame">Madame</option>
                </select>
                <input name="new_lead_first_name" placeholder="Prénom" className={inputClass} />
                <input name="new_lead_last_name" placeholder="Nom" className={inputClass} />
                <input name="new_lead_phone" placeholder="Téléphone" className={inputClass} />
                <input
                  name="new_lead_email"
                  type="email"
                  placeholder="Email"
                  className={`${inputClass} col-span-2 sm:col-span-2`}
                />
              </div>
              <p className="mt-1 text-xs text-neutral-400">
                Ce contact sera créé automatiquement dans{' '}
                {draft ? 'le pipeline Vendeurs' : 'le pipeline correspondant'} — inutile de le ressaisir dans
                Prospects.
              </p>
            </>
          )}
        </div>

        <div className="flex flex-col gap-1.5 sm:col-span-2">
          <label className="text-sm font-medium text-neutral-700">Adresse du bien</label>
          <AddressAutocomplete
            name="address"
            value={address}
            onChange={setAddress}
            placeholder="12 rue de la Paix, Annemasse"
            className={inputClass}
          />
          <p className="text-xs text-neutral-400">
            Commence à taper, les suggestions incluent le code postal — utile pour la recherche DVF automatique.
          </p>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-neutral-700">Type de bien</label>
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
          <label className="text-sm font-medium text-neutral-700">Surface (m²)</label>
          <input
            name="surface"
            type="number"
            step="0.1"
            value={surface}
            onChange={(e) => setSurface(e.target.value)}
            className={inputClass}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-neutral-700">Surface du terrain (m²)</label>
          <input name="land_surface" type="number" step="0.1" placeholder="Pour une maison" className={inputClass} />
        </div>

        {/* Pas de prix ici : au stade de l'estimation, c'est justement ce
            qu'on cherche à déterminer — il se renseigne plus tard, une fois
            un prix de mise en vente choisi avec le client. */}
        {!draft && (
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-neutral-700">Prix (€)</label>
            <input name="price" type="number" step="1" className={inputClass} />
          </div>
        )}
      </div>

      {state?.error && (
        <p className="text-sm text-danger" role="alert">
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="w-fit rounded-lg bg-accent px-5 py-2.5 text-sm font-medium text-white transition hover:bg-accent-hover disabled:opacity-60"
      >
        {pending ? 'Création…' : draft ? "Démarrer l'estimation" : 'Créer le mandat'}
      </button>
      <p className="text-xs text-neutral-400">
        {draft
          ? "Ce brouillon n'engage à rien : sur sa fiche, tu renseigneras les caractéristiques puis les charges du bien, tu obtiendras une fourchette automatique par secteur, puis tu affineras par comparaison (DVF et biens en vente). Tu pourras le transformer en mandat signé plus tard."
          : 'Si un client est lié, ses nom, téléphone et email seront repris automatiquement comme mandant sur le mandat. Les autres champs (exclusivité, comparables, estimation…) se renseignent depuis la fiche du mandat.'}
      </p>
    </form>
  )
}
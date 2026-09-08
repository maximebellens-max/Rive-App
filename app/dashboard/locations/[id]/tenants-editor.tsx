'use client'

// Liste de locataires à effectif variable (location seule, ou colocation à
// plusieurs chambres) — éditée ici en mémoire puis sérialisée en JSON dans un
// champ caché au moment de la soumission du formulaire (voir parseTenants
// côté serveur dans app/actions/locations.ts).
import { useState } from 'react'
import type { Tenant } from '@/app/actions/locations'

const STATUT_OPTIONS: { value: string; label: string }[] = [
  { value: 'en_attente', label: 'En attente' },
  { value: 'en_place', label: 'En place' },
  { value: 'edl', label: 'EDL' },
  { value: 'signature_bail', label: 'Signature bail' },
]

export default function TenantsEditor({ initial }: { initial: Tenant[] }) {
  const [tenants, setTenants] = useState<Tenant[]>(initial.length ? initial : [])

  function update(i: number, patch: Partial<Tenant>) {
    setTenants((prev) => prev.map((t, idx) => (idx === i ? { ...t, ...patch } : t)))
  }

  function remove(i: number) {
    setTenants((prev) => prev.filter((_, idx) => idx !== i))
  }

  return (
    <div className="flex flex-col gap-2">
      <label className="text-sm font-medium text-neutral-700">Locataires</label>
      <input type="hidden" name="locataires_json" value={JSON.stringify(tenants)} />
      {tenants.length === 0 && <p className="text-sm text-neutral-400">Aucun locataire renseigné.</p>}
      <div className="flex flex-col gap-2">
        {tenants.map((t, i) => (
          <div key={i} className="flex items-center gap-2">
            <input
              type="text"
              value={t.nom}
              onChange={(e) => update(i, { nom: e.target.value })}
              placeholder="Nom du locataire"
              className="flex-1 rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-accent"
            />
            <select
              value={t.statut}
              onChange={(e) => update(i, { statut: e.target.value })}
              className="rounded-lg border border-neutral-300 px-2 py-2 text-sm outline-none focus:border-accent"
            >
              {STATUT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => remove(i)}
              aria-label="Retirer ce locataire"
              className="shrink-0 rounded-lg px-2 py-2 text-sm text-neutral-400 hover:bg-danger-soft hover:text-danger"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={() => setTenants((prev) => [...prev, { nom: '', statut: 'en_attente' }])}
        className="w-fit text-sm font-medium text-accent hover:underline"
      >
        + Ajouter un locataire
      </button>
    </div>
  )
}
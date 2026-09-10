'use client'

import Link from 'next/link'
import { useTransition } from 'react'
import { createWorksProject, updateWorksProject, deleteWorksProject } from '@/app/actions/project-boards'
import { EditableText, EditableNumber, EditableDate, EditableSelect } from '../_components/editable-cell'
import AddProjectRow from '../_components/add-project-row'
import DeleteRowButton from '../_components/delete-row-button'
import type { LeadOption } from '../_components/lead-combobox'

export type WorksRow = {
  id: string
  leadId: string
  leadName: string
  conseiller: string | null
  adresse: string
  devis: number | null
  margeHt: number | null
  commission: string
  dossierDriveUrl: string
  echeanceDebut: string | null
  echeanceFin: string | null
  statut: string
  chkDemolition: boolean
  chkElectricite: boolean
  chkPlomberie: boolean
  chkTechniqueCuisine: boolean
  chkSdbWc: boolean
  chkPeinture: boolean
  chkSol: boolean
  chkFinitions: boolean
}

type Member = { id: string; full_name: string }

const STATUT_OPTIONS = [
  { value: 'acompte_demande', label: 'Acompte demandé', tone: 'neutral' as const },
  { value: 'en_cours', label: 'En cours', tone: 'info' as const },
  { value: 'termine', label: 'Terminé', tone: 'success' as const },
]
const COMMISSION_OPTIONS = [
  { value: 'non_paye', label: 'Non payé', tone: 'danger' as const },
  { value: 'paye', label: 'Payé', tone: 'success' as const },
]

const CORPS_DE_METIER: { key: keyof WorksRow; label: string; field: string }[] = [
  { key: 'chkDemolition', label: 'Démolition', field: 'chk_demolition' },
  { key: 'chkElectricite', label: 'Électricité', field: 'chk_electricite' },
  { key: 'chkPlomberie', label: 'Plomberie', field: 'chk_plomberie' },
  { key: 'chkTechniqueCuisine', label: 'Technique cuisine', field: 'chk_technique_cuisine' },
  { key: 'chkSdbWc', label: 'SDB-WC', field: 'chk_sdb_wc' },
  { key: 'chkPeinture', label: 'Peinture', field: 'chk_peinture' },
  { key: 'chkSol', label: 'Sol', field: 'chk_sol' },
  { key: 'chkFinitions', label: 'Finitions', field: 'chk_finitions' },
]

const COL_COUNT = 10

export default function TravauxTable({
  rows,
  leadOptions,
  members,
}: {
  rows: WorksRow[]
  leadOptions: LeadOption[]
  members: Member[]
}) {
  const [, startTransition] = useTransition()

  function save(id: string, patch: Record<string, unknown>) {
    startTransition(() => {
      updateWorksProject(id, patch)
    })
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-neutral-200 bg-surface shadow-sm">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-neutral-200 text-neutral-500">
          <tr>
            {/* Colonne figée (sticky) pendant le défilement horizontal — le
                tableau a beaucoup de colonnes, sans elle on perd de vue à qui
                appartient la ligne dès qu'on scrolle vers la droite. */}
            <th className="sticky left-0 z-20 whitespace-nowrap border-r border-neutral-200 bg-surface px-3 py-2.5 font-medium">
              Nom
            </th>
            <th className="whitespace-nowrap px-3 py-2.5 font-medium">Conseiller</th>
            <th className="whitespace-nowrap px-3 py-2.5 font-medium">Adresse</th>
            <th className="whitespace-nowrap px-3 py-2.5 font-medium">Devis</th>
            <th className="whitespace-nowrap px-3 py-2.5 font-medium">Marge (H.T)</th>
            <th className="whitespace-nowrap px-3 py-2.5 font-medium">Commission</th>
            <th className="whitespace-nowrap px-3 py-2.5 font-medium">Échéances chantier</th>
            <th className="whitespace-nowrap px-3 py-2.5 font-medium">Statut</th>
            <th className="whitespace-nowrap px-3 py-2.5 font-medium">Progression</th>
            <th className="w-8 px-3 py-2.5" />
          </tr>
        </thead>
        <tbody>
          {!rows.length && (
            <tr>
              <td colSpan={COL_COUNT} className="px-4 py-8 text-center text-neutral-400">
                Aucun chantier pour l&apos;instant.
              </td>
            </tr>
          )}
          {rows.map((r) => {
            const doneCount = CORPS_DE_METIER.filter((c) => r[c.key]).length
            const pct = Math.round((doneCount / CORPS_DE_METIER.length) * 100)
            return (
              <tr key={r.id} className="group border-b border-neutral-100 last:border-0 hover:bg-neutral-50">
                <td className="sticky left-0 z-10 whitespace-nowrap border-r border-neutral-200 bg-surface px-3 py-2 group-hover:bg-neutral-50">
                  <Link href={`/dashboard/prospects/${r.leadId}`} className="font-medium text-neutral-900 hover:underline">
                    {r.leadName}
                  </Link>
                </td>
                <td className="px-3 py-2">
                  <select
                    value={r.conseiller ?? ''}
                    onChange={(e) => save(r.id, { conseiller: e.target.value || null })}
                    className="rounded border border-transparent bg-transparent px-1.5 py-1 text-xs outline-none hover:border-neutral-200 focus:border-accent focus:bg-surface"
                  >
                    <option value="">—</option>
                    {members.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.full_name || 'Sans nom'}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-3 py-2">
                  <EditableText value={r.adresse} onSave={(v) => save(r.id, { adresse: v })} placeholder="Adresse" width="w-44" />
                </td>
                <td className="px-3 py-2">
                  <EditableNumber value={r.devis} onSave={(v) => save(r.id, { devis: v })} suffix="€" />
                </td>
                <td className="px-3 py-2">
                  <EditableNumber value={r.margeHt} onSave={(v) => save(r.id, { marge_ht: v })} suffix="€" />
                </td>
                <td className="px-3 py-2">
                  <EditableSelect
                    value={r.commission}
                    options={COMMISSION_OPTIONS}
                    onSave={(v) => save(r.id, { commission: v })}
                  />
                </td>
                <td className="px-3 py-2">
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-1">
                      <span className="w-12 shrink-0 text-[10px] text-neutral-400">Début</span>
                      <EditableDate value={r.echeanceDebut} onSave={(v) => save(r.id, { echeance_debut: v })} />
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="w-12 shrink-0 text-[10px] text-neutral-400">Fin</span>
                      <EditableDate value={r.echeanceFin} onSave={(v) => save(r.id, { echeance_fin: v })} />
                    </div>
                  </div>
                </td>
                <td className="px-3 py-2">
                  <EditableSelect value={r.statut} options={STATUT_OPTIONS} onSave={(v) => save(r.id, { statut: v })} />
                </td>
                <td className="px-3 py-2">
                  <div className="flex w-40 flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 flex-1 rounded-full bg-neutral-100">
                        <div className="h-1.5 rounded-full bg-accent" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="w-8 shrink-0 text-right text-[10px] tabular-nums text-neutral-400">{pct}%</span>
                    </div>
                    <div className="flex flex-wrap gap-x-2 gap-y-0.5">
                      {CORPS_DE_METIER.map((c) => (
                        <label key={c.field} className="inline-flex cursor-pointer items-center gap-1 text-[10px] text-neutral-500">
                          <input
                            type="checkbox"
                            checked={Boolean(r[c.key])}
                            onChange={(e) => save(r.id, { [c.field]: e.target.checked })}
                            className="h-3 w-3"
                          />
                          {c.label}
                        </label>
                      ))}
                    </div>
                  </div>
                </td>
                <td className="px-3 py-2">
                  <DeleteRowButton onDelete={() => deleteWorksProject(r.id)} />
                </td>
              </tr>
            )
          })}
          <AddProjectRow leadOptions={leadOptions} colSpan={COL_COUNT} onCreate={(leadId) => createWorksProject(leadId)} />
        </tbody>
      </table>
    </div>
  )
}
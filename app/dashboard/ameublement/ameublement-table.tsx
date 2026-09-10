'use client'

import Link from 'next/link'
import { useTransition } from 'react'
import { createFurnishingProject, updateFurnishingProject, deleteFurnishingProject } from '@/app/actions/project-boards'
import { EditableText, EditableNumber, EditableDate, EditableSelect } from '../_components/editable-cell'
import AddProjectRow from '../_components/add-project-row'
import DeleteRowButton from '../_components/delete-row-button'
import type { LeadOption } from '../_components/lead-combobox'

export type FurnishingRow = {
  id: string
  leadId: string
  leadName: string
  statut: string
  paiementClient: string
  monteur: string
  margeHt: number | null
  avantProjet: string
  architectePaiement: string
  commentaire: string
  commandeIkea: string
  commandeEd: string
  poseur: string
  dateLivraisonIkea: string | null
  dateLivraisonEd: string | null
  datePose: string | null
}

const STATUT_OPTIONS = [
  { value: 'en_cours', label: 'En cours', tone: 'info' as const },
  { value: 'termine', label: 'Terminé', tone: 'success' as const },
]
const PAIEMENT_OPTIONS = [
  { value: 'non_paye', label: 'Non payé', tone: 'danger' as const },
  { value: 'paye', label: 'Payé', tone: 'success' as const },
]
const AVANT_PROJET_OPTIONS = [
  { value: 'a_faire', label: 'À faire', tone: 'neutral' as const },
  { value: 'valide', label: 'Validé', tone: 'info' as const },
]
const COMMANDE_OPTIONS = [
  { value: 'en_attente', label: 'En attente', tone: 'neutral' as const },
  { value: 'commande', label: 'Commandé', tone: 'warn' as const },
  { value: 'recu', label: 'Reçu', tone: 'success' as const },
]

const COL_COUNT = 13

export default function AmeublementTable({ rows, leadOptions }: { rows: FurnishingRow[]; leadOptions: LeadOption[] }) {
  const [, startTransition] = useTransition()

  function save(id: string, patch: Record<string, unknown>) {
    startTransition(() => {
      updateFurnishingProject(id, patch)
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
            <th className="whitespace-nowrap px-3 py-2.5 font-medium">Statut</th>
            <th className="whitespace-nowrap px-3 py-2.5 font-medium">Paiement client</th>
            <th className="whitespace-nowrap px-3 py-2.5 font-medium">Monteur</th>
            <th className="whitespace-nowrap px-3 py-2.5 font-medium">Marge H.T</th>
            <th className="whitespace-nowrap px-3 py-2.5 font-medium">Avant-projet</th>
            <th className="whitespace-nowrap px-3 py-2.5 font-medium">Architecte</th>
            <th className="whitespace-nowrap px-3 py-2.5 font-medium">Commande IKEA</th>
            <th className="whitespace-nowrap px-3 py-2.5 font-medium">Commande E.D</th>
            <th className="whitespace-nowrap px-3 py-2.5 font-medium">Poseur</th>
            <th className="whitespace-nowrap px-3 py-2.5 font-medium">Livraison / Pose</th>
            <th className="whitespace-nowrap px-3 py-2.5 font-medium">Commentaire</th>
            <th className="w-8 px-3 py-2.5" />
          </tr>
        </thead>
        <tbody>
          {!rows.length && (
            <tr>
              <td colSpan={COL_COUNT} className="px-4 py-8 text-center text-neutral-400">
                Aucun dossier ameublement pour l&apos;instant.
              </td>
            </tr>
          )}
          {rows.map((r) => (
            <tr key={r.id} className="group border-b border-neutral-100 last:border-0 hover:bg-neutral-50">
              <td className="sticky left-0 z-10 whitespace-nowrap border-r border-neutral-200 bg-surface px-3 py-2 group-hover:bg-neutral-50">
                <Link href={`/dashboard/prospects/${r.leadId}`} className="font-medium text-neutral-900 hover:underline">
                  {r.leadName}
                </Link>
              </td>
              <td className="px-3 py-2">
                <EditableSelect value={r.statut} options={STATUT_OPTIONS} onSave={(v) => save(r.id, { statut: v })} />
              </td>
              <td className="px-3 py-2">
                <EditableSelect
                  value={r.paiementClient}
                  options={PAIEMENT_OPTIONS}
                  onSave={(v) => save(r.id, { paiement_client: v })}
                />
              </td>
              <td className="px-3 py-2">
                <EditableText value={r.monteur} onSave={(v) => save(r.id, { monteur: v })} placeholder="Nom du monteur" />
              </td>
              <td className="px-3 py-2">
                <EditableNumber value={r.margeHt} onSave={(v) => save(r.id, { marge_ht: v })} suffix="€" />
              </td>
              <td className="px-3 py-2">
                <EditableSelect
                  value={r.avantProjet}
                  options={AVANT_PROJET_OPTIONS}
                  onSave={(v) => save(r.id, { avant_projet: v })}
                />
              </td>
              <td className="px-3 py-2">
                <EditableSelect
                  value={r.architectePaiement}
                  options={PAIEMENT_OPTIONS}
                  onSave={(v) => save(r.id, { architecte_paiement: v })}
                />
              </td>
              <td className="px-3 py-2">
                <EditableSelect
                  value={r.commandeIkea}
                  options={COMMANDE_OPTIONS}
                  onSave={(v) => save(r.id, { commande_ikea: v })}
                />
              </td>
              <td className="px-3 py-2">
                <EditableSelect
                  value={r.commandeEd}
                  options={COMMANDE_OPTIONS}
                  onSave={(v) => save(r.id, { commande_ed: v })}
                />
              </td>
              <td className="px-3 py-2">
                <EditableText value={r.poseur} onSave={(v) => save(r.id, { poseur: v })} placeholder="Nom du poseur" />
              </td>
              <td className="px-3 py-2">
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-1">
                    <span className="w-14 shrink-0 text-[10px] text-neutral-400">IKEA</span>
                    <EditableDate value={r.dateLivraisonIkea} onSave={(v) => save(r.id, { date_livraison_ikea: v })} />
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="w-14 shrink-0 text-[10px] text-neutral-400">E.D</span>
                    <EditableDate value={r.dateLivraisonEd} onSave={(v) => save(r.id, { date_livraison_ed: v })} />
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="w-14 shrink-0 text-[10px] text-neutral-400">Pose</span>
                    <EditableDate value={r.datePose} onSave={(v) => save(r.id, { date_pose: v })} />
                  </div>
                </div>
              </td>
              <td className="px-3 py-2">
                <EditableText value={r.commentaire} onSave={(v) => save(r.id, { commentaire: v })} placeholder="Commentaire" width="w-64" />
              </td>
              <td className="px-3 py-2">
                <DeleteRowButton onDelete={() => deleteFurnishingProject(r.id)} />
              </td>
            </tr>
          ))}
          <AddProjectRow leadOptions={leadOptions} colSpan={COL_COUNT} onCreate={(leadId) => createFurnishingProject(leadId)} />
        </tbody>
      </table>
    </div>
  )
}
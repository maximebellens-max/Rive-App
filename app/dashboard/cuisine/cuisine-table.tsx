'use client'

import Link from 'next/link'
import { useTransition } from 'react'
import { createKitchenProject, updateKitchenProject, deleteKitchenProject } from '@/app/actions/project-boards'
import { EditableText, EditableNumber, EditableDate, EditableSelect } from '../_components/editable-cell'
import AddProjectRow from '../_components/add-project-row'
import DeleteRowButton from '../_components/delete-row-button'
import type { LeadOption } from '../_components/lead-combobox'

export type KitchenRow = {
  id: string
  leadId: string
  leadName: string
  statut: string
  paiement: string
  margeHt: number | null
  conception: string
  commentaire: string
  metre: string
  commandeIkea: string
  poseur: string
  dateLivraison: string | null
  datePoseDebut: string | null
  datePoseFin: string | null
  finitions: string
}

const STATUT_OPTIONS = [
  { value: 'en_cours', label: 'En cours', tone: 'info' as const },
  { value: 'termine', label: 'Terminé', tone: 'success' as const },
]
const PAIEMENT_OPTIONS = [
  { value: 'non_paye', label: 'Non payé', tone: 'danger' as const },
  { value: 'paye', label: 'Payé', tone: 'success' as const },
]
const CONCEPTION_OPTIONS = [
  { value: 'a_faire', label: 'À faire', tone: 'neutral' as const },
  { value: 'valide', label: 'Validé', tone: 'info' as const },
]
const METRE_OPTIONS = [
  { value: 'a_faire', label: 'À faire', tone: 'neutral' as const },
  { value: 'realise', label: 'Réalisé', tone: 'success' as const },
]
const COMMANDE_OPTIONS = [
  { value: 'en_attente', label: 'En attente', tone: 'neutral' as const },
  { value: 'commande', label: 'Commandé', tone: 'warn' as const },
  { value: 'recu', label: 'Reçu', tone: 'success' as const },
]

const COL_COUNT = 12

export default function CuisineTable({ rows, leadOptions }: { rows: KitchenRow[]; leadOptions: LeadOption[] }) {
  const [, startTransition] = useTransition()

  function save(id: string, patch: Record<string, unknown>) {
    startTransition(() => {
      updateKitchenProject(id, patch)
    })
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-neutral-200 bg-surface shadow-sm">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-neutral-200 text-neutral-500">
          <tr>
            <th className="whitespace-nowrap px-3 py-2.5 font-medium">Nom</th>
            <th className="whitespace-nowrap px-3 py-2.5 font-medium">Statut</th>
            <th className="whitespace-nowrap px-3 py-2.5 font-medium">Paiement</th>
            <th className="whitespace-nowrap px-3 py-2.5 font-medium">Marge H.T</th>
            <th className="whitespace-nowrap px-3 py-2.5 font-medium">Conception</th>
            <th className="whitespace-nowrap px-3 py-2.5 font-medium">Métré</th>
            <th className="whitespace-nowrap px-3 py-2.5 font-medium">Commande IKEA</th>
            <th className="whitespace-nowrap px-3 py-2.5 font-medium">Poseur</th>
            <th className="whitespace-nowrap px-3 py-2.5 font-medium">Livraison / Pose</th>
            <th className="whitespace-nowrap px-3 py-2.5 font-medium">Finitions</th>
            <th className="whitespace-nowrap px-3 py-2.5 font-medium">Commentaire</th>
            <th className="w-8 px-3 py-2.5" />
          </tr>
        </thead>
        <tbody>
          {!rows.length && (
            <tr>
              <td colSpan={COL_COUNT} className="px-4 py-8 text-center text-neutral-400">
                Aucun dossier cuisine pour l&apos;instant.
              </td>
            </tr>
          )}
          {rows.map((r) => (
            <tr key={r.id} className="border-b border-neutral-100 last:border-0 hover:bg-neutral-50">
              <td className="whitespace-nowrap px-3 py-2">
                <Link href={`/dashboard/prospects/${r.leadId}`} className="font-medium text-neutral-900 hover:underline">
                  {r.leadName}
                </Link>
              </td>
              <td className="px-3 py-2">
                <EditableSelect value={r.statut} options={STATUT_OPTIONS} onSave={(v) => save(r.id, { statut: v })} />
              </td>
              <td className="px-3 py-2">
                <EditableSelect value={r.paiement} options={PAIEMENT_OPTIONS} onSave={(v) => save(r.id, { paiement: v })} />
              </td>
              <td className="px-3 py-2">
                <EditableNumber value={r.margeHt} onSave={(v) => save(r.id, { marge_ht: v })} suffix="€" />
              </td>
              <td className="px-3 py-2">
                <EditableSelect
                  value={r.conception}
                  options={CONCEPTION_OPTIONS}
                  onSave={(v) => save(r.id, { conception: v })}
                />
              </td>
              <td className="px-3 py-2">
                <EditableSelect value={r.metre} options={METRE_OPTIONS} onSave={(v) => save(r.id, { metre: v })} />
              </td>
              <td className="px-3 py-2">
                <EditableSelect
                  value={r.commandeIkea}
                  options={COMMANDE_OPTIONS}
                  onSave={(v) => save(r.id, { commande_ikea: v })}
                />
              </td>
              <td className="px-3 py-2">
                <EditableText value={r.poseur} onSave={(v) => save(r.id, { poseur: v })} placeholder="Nom du poseur" />
              </td>
              <td className="px-3 py-2">
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-1">
                    <span className="w-16 shrink-0 text-[10px] text-neutral-400">Livraison</span>
                    <EditableDate value={r.dateLivraison} onSave={(v) => save(r.id, { date_livraison: v })} />
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="w-16 shrink-0 text-[10px] text-neutral-400">Pose début</span>
                    <EditableDate value={r.datePoseDebut} onSave={(v) => save(r.id, { date_pose_debut: v })} />
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="w-16 shrink-0 text-[10px] text-neutral-400">Pose fin</span>
                    <EditableDate value={r.datePoseFin} onSave={(v) => save(r.id, { date_pose_fin: v })} />
                  </div>
                </div>
              </td>
              <td className="px-3 py-2">
                <EditableText value={r.finitions} onSave={(v) => save(r.id, { finitions: v })} placeholder="Finitions" />
              </td>
              <td className="px-3 py-2">
                <EditableText value={r.commentaire} onSave={(v) => save(r.id, { commentaire: v })} placeholder="Commentaire" width="w-64" />
              </td>
              <td className="px-3 py-2">
                <DeleteRowButton onDelete={() => deleteKitchenProject(r.id)} />
              </td>
            </tr>
          ))}
          <AddProjectRow leadOptions={leadOptions} colSpan={COL_COUNT} onCreate={(leadId) => createKitchenProject(leadId)} />
        </tbody>
      </table>
    </div>
  )
}
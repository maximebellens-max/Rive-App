import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { formatEUR } from '@/lib/rive/mandates'
import LocationsView from './locations-view'
import NewLocationForm from './new-location-form'
import type { StageCard } from '../_components/stage-kanban'

const TYPE_LABEL: Record<string, string> = {
  longue_duree: 'Longue durée',
  colocation: 'Colocation',
}

const STAGE_LABEL: Record<string, string> = {
  annonce: 'Annonce',
  visites: 'Visites',
  en_place: 'En place',
  finalise: 'Finalisé',
}

export default async function LocationsPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  const { data: profile } = user
    ? await supabase.from('profiles').select('agency_id').eq('id', user.id).single()
    : { data: null }

  const [{ data: listings }, { data: leads }] = await Promise.all([
    supabase
      .from('rental_listings')
      .select('id, stage, type_location, honoraires_bailleur, honoraires_locataire, leads ( id, name )')
      .order('created_at', { ascending: false }),
    profile?.agency_id
      ? supabase.from('leads').select('id, name').eq('agency_id', profile.agency_id).order('name', { ascending: true })
      : Promise.resolve({ data: [] as { id: string; name: string }[] }),
  ])

  const rows = (listings ?? []).map((l) => ({
    ...l,
    lead: (l.leads as { id: string; name: string }[] | null)?.[0] ?? null,
  }))

  const cards: StageCard[] = rows.map((l) => ({
    id: l.id,
    title: l.lead?.name || 'Prospect supprimé',
    subtitle: [TYPE_LABEL[l.type_location], l.honoraires_bailleur ? formatEUR(l.honoraires_bailleur) : null]
      .filter(Boolean)
      .join(' · '),
    meta: l.stage,
    href: `/dashboard/locations/${l.id}`,
  }))

  const totalHonoraires = rows.reduce((sum, l) => sum + (l.honoraires_bailleur || 0), 0)

  const table = (
    <div className="overflow-x-auto rounded-2xl border border-neutral-200 bg-surface shadow-sm">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-neutral-200 text-neutral-500">
          <tr>
            <th className="px-4 py-3 font-medium">Bien / Client</th>
            <th className="px-4 py-3 font-medium">Type</th>
            <th className="px-4 py-3 font-medium">Étape</th>
            <th className="px-4 py-3 font-medium">Honoraires bailleur</th>
            <th className="px-4 py-3 font-medium">Honoraires locataire</th>
          </tr>
        </thead>
        <tbody>
          {!rows.length && (
            <tr>
              <td colSpan={5} className="px-4 py-8 text-center text-neutral-400">
                Aucune mise en location pour l&apos;instant.
              </td>
            </tr>
          )}
          {rows.map((l) => (
            <tr key={l.id} className="border-b border-neutral-100 last:border-0 hover:bg-neutral-50">
              <td className="px-4 py-3">
                <Link href={`/dashboard/locations/${l.id}`} className="font-medium text-neutral-900 hover:underline">
                  {l.lead?.name || 'Prospect supprimé'}
                </Link>
              </td>
              <td className="px-4 py-3 text-neutral-600">{TYPE_LABEL[l.type_location] ?? l.type_location}</td>
              <td className="px-4 py-3 text-neutral-600">{STAGE_LABEL[l.stage] ?? l.stage}</td>
              <td className="px-4 py-3 tabular-nums text-neutral-600">{formatEUR(l.honoraires_bailleur)}</td>
              <td className="px-4 py-3 tabular-nums text-neutral-600">{formatEUR(l.honoraires_locataire)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">🔑 Location</h1>
        <p className="mt-1 text-sm text-neutral-500">
          {rows.length} bien{rows.length > 1 ? 's' : ''} · Honoraires bailleur cumulés : {formatEUR(totalHonoraires)}
        </p>
      </div>

      <NewLocationForm leadOptions={leads ?? []} />

      <LocationsView table={table} cards={cards} />
    </div>
  )
}
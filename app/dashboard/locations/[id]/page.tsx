import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import LocationEditForm from './location-edit-form'
import DeleteLocationButton from './delete-location-button'
import type { Tenant } from '@/app/actions/locations'

export default async function LocationDetailPage({ params }: PageProps<'/dashboard/locations/[id]'>) {
  const { id } = await params
  const supabase = await createClient()

  const { data: listing } = await supabase
    .from('rental_listings')
    .select(
      'id, assigned_to, type_location, honoraires_bailleur, honoraires_locataire, locataires, dossier_url, commentaire, leads ( id, name )'
    )
    .eq('id', id)
    .single()
  if (!listing) notFound()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  const { data: profile } = user
    ? await supabase.from('profiles').select('agency_id').eq('id', user.id).single()
    : { data: null }
  const { data: members } = profile?.agency_id
    ? await supabase.from('profiles').select('id, full_name').eq('agency_id', profile.agency_id)
    : { data: [] as { id: string; full_name: string }[] }

  // lead_id est une relation simple (un seul prospect par bien) : Supabase/PostgREST
  // renvoie donc `leads` comme un objet unique, pas un tableau. Le caster en tableau et
  // lire [0] renvoyait toujours undefined → "Prospect supprimé" s'affichait même quand
  // le prospect existait bien.
  const lead = listing.leads as unknown as { id: string; name: string } | null

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <Link href="/dashboard/locations" className="text-sm text-neutral-500 hover:underline">
            ← Location
          </Link>
          <h1 className="mt-1 text-xl font-semibold tracking-tight">{lead?.name || 'Prospect supprimé'}</h1>
          {lead && (
            <Link href={`/dashboard/prospects/${lead.id}`} className="mt-1 block text-sm text-neutral-500 hover:underline">
              Voir la fiche prospect →
            </Link>
          )}
        </div>
        <DeleteLocationButton locationId={listing.id} />
      </div>

      <div className="rounded-2xl border border-neutral-200 bg-surface p-6 shadow-sm">
        <LocationEditForm
          listing={{
            id: listing.id,
            assigned_to: listing.assigned_to,
            type_location: listing.type_location,
            honoraires_bailleur: listing.honoraires_bailleur,
            honoraires_locataire: listing.honoraires_locataire,
            locataires: (listing.locataires as Tenant[] | null) ?? [],
            dossier_url: listing.dossier_url,
            commentaire: listing.commentaire,
          }}
          members={members ?? []}
        />
      </div>
    </div>
  )
}
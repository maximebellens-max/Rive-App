import { createClient } from '@/lib/supabase/server'
import CuisineTable, { type KitchenRow } from './cuisine-table'
import { formatEUR } from '@/lib/rive/mandates'

export default async function CuisinePage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  const { data: profile } = user
    ? await supabase.from('profiles').select('agency_id').eq('id', user.id).single()
    : { data: null }

  const [{ data: rows }, { data: leads }] = await Promise.all([
    supabase
      .from('kitchen_projects')
      .select(
        'id, statut, paiement, marge_ht, conception, commentaire, metre, commande_ikea, poseur, date_livraison, date_pose_debut, date_pose_fin, finitions, leads ( id, name )'
      )
      .order('created_at', { ascending: false }),
    profile?.agency_id
      ? supabase.from('leads').select('id, name').eq('agency_id', profile.agency_id).order('name', { ascending: true })
      : Promise.resolve({ data: [] as { id: string; name: string }[] }),
  ])

  const projects: KitchenRow[] = (rows ?? []).map((r) => {
    const lead = (r.leads as { id: string; name: string }[] | null)?.[0]
    return {
      id: r.id,
      leadId: lead?.id ?? '',
      leadName: lead?.name ?? 'Prospect supprimé',
      statut: r.statut,
      paiement: r.paiement,
      margeHt: r.marge_ht,
      conception: r.conception,
      commentaire: r.commentaire,
      metre: r.metre,
      commandeIkea: r.commande_ikea,
      poseur: r.poseur,
      dateLivraison: r.date_livraison,
      datePoseDebut: r.date_pose_debut,
      datePoseFin: r.date_pose_fin,
      finitions: r.finitions,
    }
  })

  const totalMarge = projects.reduce((sum, p) => sum + (p.margeHt || 0), 0)

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">🍳 Suivi Cuisine</h1>
        <p className="mt-1 text-sm text-neutral-500">
          {projects.length} dossier{projects.length > 1 ? 's' : ''} · Marge H.T totale : {formatEUR(totalMarge)}
        </p>
      </div>

      <CuisineTable rows={projects} leadOptions={leads ?? []} />
    </div>
  )
}
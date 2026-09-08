import { createClient } from '@/lib/supabase/server'
import AmeublementTable, { type FurnishingRow } from './ameublement-table'
import { formatEUR } from '@/lib/rive/mandates'

export default async function AmeublementPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  const { data: profile } = user
    ? await supabase.from('profiles').select('agency_id').eq('id', user.id).single()
    : { data: null }

  const [{ data: rows }, { data: leads }] = await Promise.all([
    supabase
      .from('furnishing_projects')
      .select(
        'id, statut, paiement_client, monteur, marge_ht, avant_projet, architecte_paiement, commentaire, commande_ikea, commande_ed, poseur, date_livraison_ikea, date_livraison_ed, date_pose, leads ( id, name )'
      )
      .order('created_at', { ascending: false }),
    profile?.agency_id
      ? supabase.from('leads').select('id, name').eq('agency_id', profile.agency_id).order('name', { ascending: true })
      : Promise.resolve({ data: [] as { id: string; name: string }[] }),
  ])

  const projects: FurnishingRow[] = (rows ?? []).map((r) => {
    const lead = (r.leads as { id: string; name: string }[] | null)?.[0]
    return {
      id: r.id,
      leadId: lead?.id ?? '',
      leadName: lead?.name ?? 'Prospect supprimé',
      statut: r.statut,
      paiementClient: r.paiement_client,
      monteur: r.monteur,
      margeHt: r.marge_ht,
      avantProjet: r.avant_projet,
      architectePaiement: r.architecte_paiement,
      commentaire: r.commentaire,
      commandeIkea: r.commande_ikea,
      commandeEd: r.commande_ed,
      poseur: r.poseur,
      dateLivraisonIkea: r.date_livraison_ikea,
      dateLivraisonEd: r.date_livraison_ed,
      datePose: r.date_pose,
    }
  })

  const totalMarge = projects.reduce((sum, p) => sum + (p.margeHt || 0), 0)

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">🛋 Suivi Ameublement</h1>
        <p className="mt-1 text-sm text-neutral-500">
          {projects.length} dossier{projects.length > 1 ? 's' : ''} · Marge H.T totale : {formatEUR(totalMarge)}
        </p>
      </div>

      <AmeublementTable rows={projects} leadOptions={leads ?? []} />
    </div>
  )
}
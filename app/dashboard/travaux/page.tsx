import { createClient } from '@/lib/supabase/server'
import TravauxTable, { type WorksRow } from './travaux-table'
import { formatEUR } from '@/lib/rive/mandates'

export default async function TravauxPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  const { data: profile } = user
    ? await supabase.from('profiles').select('agency_id').eq('id', user.id).single()
    : { data: null }

  const [{ data: rows }, { data: leads }, { data: members }] = await Promise.all([
    supabase
      .from('works_projects')
      .select(
        'id, conseiller, adresse, devis, marge_ht, commission, dossier_drive_url, echeance_debut, echeance_fin, statut, chk_demolition, chk_electricite, chk_plomberie, chk_technique_cuisine, chk_sdb_wc, chk_peinture, chk_sol, chk_finitions, leads ( id, name )'
      )
      .order('created_at', { ascending: false }),
    profile?.agency_id
      ? supabase.from('leads').select('id, name').eq('agency_id', profile.agency_id).order('name', { ascending: true })
      : Promise.resolve({ data: [] as { id: string; name: string }[] }),
    profile?.agency_id
      ? supabase.from('profiles').select('id, full_name').eq('agency_id', profile.agency_id)
      : Promise.resolve({ data: [] as { id: string; full_name: string }[] }),
  ])

  const projects: WorksRow[] = (rows ?? []).map((r) => {
    // lead_id est une relation simple (un seul prospect par dossier) : Supabase/PostgREST
    // renvoie donc `leads` comme un objet unique, pas un tableau. Le caster en tableau et
    // lire [0] renvoyait toujours undefined → "Prospect supprimé" s'affichait même quand
    // le prospect existait bien.
    const lead = r.leads as unknown as { id: string; name: string } | null
    return {
      id: r.id,
      leadId: lead?.id ?? '',
      leadName: lead?.name ?? 'Prospect supprimé',
      conseiller: r.conseiller,
      adresse: r.adresse,
      devis: r.devis,
      margeHt: r.marge_ht,
      commission: r.commission,
      dossierDriveUrl: r.dossier_drive_url,
      echeanceDebut: r.echeance_debut,
      echeanceFin: r.echeance_fin,
      statut: r.statut,
      chkDemolition: r.chk_demolition,
      chkElectricite: r.chk_electricite,
      chkPlomberie: r.chk_plomberie,
      chkTechniqueCuisine: r.chk_technique_cuisine,
      chkSdbWc: r.chk_sdb_wc,
      chkPeinture: r.chk_peinture,
      chkSol: r.chk_sol,
      chkFinitions: r.chk_finitions,
    }
  })

  const totalMarge = projects.reduce((sum, p) => sum + (p.margeHt || 0), 0)

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">🔨 Suivi Travaux</h1>
        <p className="mt-1 text-sm text-neutral-500">
          {projects.length} chantier{projects.length > 1 ? 's' : ''} · Marge totale : {formatEUR(totalMarge)}
        </p>
      </div>

      <TravauxTable rows={projects} leadOptions={leads ?? []} members={members ?? []} />
    </div>
  )
}
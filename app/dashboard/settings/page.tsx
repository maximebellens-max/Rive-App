import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import AgencySettingsForm from './agency-settings-form'
import TeamSection from './team-section'
import BackupSection from './backup-section'
import MetaSection from './meta-section'
import WhatsAppSection from './whatsapp-section'
import AgendaSyncSection from './agenda-sync-section'
import SettingsShell, { type SettingsSection } from './settings-shell'

export default async function SettingsPage({ searchParams }: PageProps<'/dashboard/settings'>) {
  const supabase = await createClient()
  const params = await searchParams

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) notFound()

  const { data: profile } = await supabase
    .from('profiles')
    .select('agency_id, role, whatsapp_number, whatsapp_alerts_enabled, whatsapp_sender_phone_number_id, ics_token')
    .eq('id', user.id)
    .single()

  if (!profile?.agency_id) notFound()

  const [{ data: agency }, { data: members }, { data: invites }, { data: metaConnection }, { data: metaCampaigns }] =
    await Promise.all([
      supabase.from('agencies').select('*').eq('id', profile.agency_id).single(),
      supabase
        .from('profiles')
        .select('id, full_name, role, avatar_url')
        .eq('agency_id', profile.agency_id)
        .order('role', { ascending: false }),
      supabase
        .from('agency_invites')
        .select('id, email, token, created_at')
        .eq('agency_id', profile.agency_id)
        .is('accepted_at', null)
        .order('created_at', { ascending: false }),
      supabase
        .from('meta_connections')
        .select('ad_account_id, ad_account_name, page_id, page_name, available_ad_accounts, available_pages')
        .eq('agency_id', profile.agency_id)
        .maybeSingle(),
      supabase
        .from('meta_campaigns')
        .select('id, campaign_name, status, owner_id, target_category, created_time')
        .eq('agency_id', profile.agency_id)
        .order('created_time', { ascending: false, nullsFirst: false }),
    ])

  if (!agency) notFound()

  // Les campagnes actives passent en premier (ce sont celles qui comptent
  // au quotidien), puis le reste par ordre chronologique décroissant (déjà
  // fait par la requête ci-dessus) — tri stable, donc l'ordre chronologique
  // est préservé à l'intérieur de chaque groupe.
  const sortedCampaigns = [...(metaCampaigns ?? [])].sort((a, b) => {
    const aActive = a.status === 'ACTIVE' ? 0 : 1
    const bActive = b.status === 'ACTIVE' ? 0 : 1
    return aActive - bActive
  })

  const metaSuccessMessage = typeof params?.meta === 'string' ? params.meta : undefined
  const metaErrorMessage = typeof params?.meta_error === 'string' ? params.meta_error : undefined

  const sections: SettingsSection[] = [
    {
      id: 'general',
      label: 'Général',
      title: 'Réglages de l’agence',
      description: 'Ces informations servent à générer tes mandats.',
      content: <AgencySettingsForm agency={agency} />,
    },
    {
      id: 'equipe',
      label: 'Équipe',
      title: 'Équipe',
      description: 'Gère les membres de ton agence et leurs accès.',
      content: (
        <TeamSection
          isOwner={profile.role === 'owner'}
          currentUserId={user.id}
          members={members ?? []}
          invites={invites ?? []}
        />
      ),
    },
    {
      id: 'publicite',
      label: 'Publicité & Leads',
      title: 'Publicité & Leads',
      description: 'Connecte Meta (Facebook/Instagram) pour récupérer automatiquement tes leads publicitaires.',
      content: (
        <MetaSection
          connection={metaConnection ?? null}
          campaigns={sortedCampaigns}
          members={members ?? []}
          successMessage={metaSuccessMessage}
          errorMessage={metaErrorMessage}
        />
      ),
    },
    {
      id: 'whatsapp',
      label: 'WhatsApp',
      title: 'WhatsApp',
      description: 'Reçois une alerte WhatsApp pour chaque nouveau lead ou rendez-vous.',
      content: (
        <WhatsAppSection
          whatsappNumber={profile.whatsapp_number ?? ''}
          whatsappAlertsEnabled={profile.whatsapp_alerts_enabled ?? false}
          whatsappSenderPhoneNumberId={profile.whatsapp_sender_phone_number_id ?? ''}
        />
      ),
    },
    {
      id: 'agenda',
      label: 'Agenda',
      title: 'Agenda',
      description: 'Synchronise tes rendez-vous Rive avec l’app Calendrier de ton iPhone.',
      content: (
        <AgendaSyncSection
          icsUrl={`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/ics/agent/${profile.ics_token}`}
        />
      ),
    },
    {
      id: 'sauvegarde',
      label: 'Sauvegarde',
      title: 'Sauvegarde',
      description: 'Exporte ou restaure l’ensemble des données de l’agence.',
      content: <BackupSection isOwner={profile.role === 'owner'} />,
    },
  ]

  // Un retour depuis la connexion Meta (succès ou erreur) doit rouvrir
  // directement sur "Publicité & Leads", sinon le message atterrirait sur
  // une catégorie qui ne l'affiche pas. Sinon, ?section=... (mis à jour au
  // clic dans le menu, voir settings-shell.tsx) ou "Général" par défaut.
  const requestedSection = typeof params?.section === 'string' ? params.section : undefined
  const initialSectionId = metaSuccessMessage || metaErrorMessage ? 'publicite' : requestedSection || 'general'

  return <SettingsShell sections={sections} initialSectionId={initialSectionId} />
}
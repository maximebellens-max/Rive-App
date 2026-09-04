import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import AgencySettingsForm from './agency-settings-form'
import TeamSection from './team-section'
import BackupSection from './backup-section'
import MetaSection from './meta-section'
import WhatsAppSection from './whatsapp-section'

export default async function SettingsPage({ searchParams }: PageProps<'/dashboard/settings'>) {
  const supabase = await createClient()
  const params = await searchParams

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) notFound()

  const { data: profile } = await supabase
    .from('profiles')
    .select('agency_id, role, whatsapp_number, whatsapp_alerts_enabled, whatsapp_sender_phone_number_id')
    .eq('id', user.id)
    .single()

  if (!profile?.agency_id) notFound()

  const [{ data: agency }, { data: members }, { data: invites }, { data: metaConnection }, { data: metaCampaigns }] =
    await Promise.all([
      supabase.from('agencies').select('*').eq('id', profile.agency_id).single(),
      supabase
        .from('profiles')
        .select('id, full_name, role')
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
        .select('ad_account_id, ad_account_name, page_name, available_ad_accounts')
        .eq('agency_id', profile.agency_id)
        .maybeSingle(),
      supabase
        .from('meta_campaigns')
        .select('id, campaign_name, status, owner_id, target_category')
        .eq('agency_id', profile.agency_id)
        .order('campaign_name', { ascending: true }),
    ])

  if (!agency) notFound()

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Réglages de l&apos;agence</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Ces informations servent à générer tes mandats.
        </p>
      </div>
      <div className="max-w-2xl rounded-2xl border border-neutral-200 bg-surface p-6 shadow-sm">
        <AgencySettingsForm agency={agency} />
      </div>
      <div className="max-w-2xl rounded-2xl border border-neutral-200 bg-surface p-6 shadow-sm">
        <TeamSection
          isOwner={profile.role === 'owner'}
          currentUserId={user.id}
          members={members ?? []}
          invites={invites ?? []}
        />
      </div>
      <div className="max-w-2xl rounded-2xl border border-neutral-200 bg-surface p-6 shadow-sm">
        <MetaSection
          connection={metaConnection ?? null}
          campaigns={metaCampaigns ?? []}
          members={members ?? []}
          successMessage={typeof params?.meta === 'string' ? params.meta : undefined}
          errorMessage={typeof params?.meta_error === 'string' ? params.meta_error : undefined}
        />
      </div>
      <div className="max-w-2xl rounded-2xl border border-neutral-200 bg-surface p-6 shadow-sm">
        <WhatsAppSection
          whatsappNumber={profile.whatsapp_number ?? ''}
          whatsappAlertsEnabled={profile.whatsapp_alerts_enabled ?? false}
          whatsappSenderPhoneNumberId={profile.whatsapp_sender_phone_number_id ?? ''}
        />
      </div>
      <div className="max-w-2xl rounded-2xl border border-neutral-200 bg-surface p-6 shadow-sm">
        <BackupSection isOwner={profile.role === 'owner'} />
      </div>
    </div>
  )
}
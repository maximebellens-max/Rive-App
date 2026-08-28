import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import AgencySettingsForm from './agency-settings-form'
import TeamSection from './team-section'
import BackupSection from './backup-section'

export default async function SettingsPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) notFound()

  const { data: profile } = await supabase
    .from('profiles')
    .select('agency_id, role')
    .eq('id', user.id)
    .single()

  if (!profile?.agency_id) notFound()

  const [{ data: agency }, { data: members }, { data: invites }] = await Promise.all([
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
      <div className="max-w-2xl rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
        <AgencySettingsForm agency={agency} />
      </div>
      <div className="max-w-2xl rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
        <TeamSection
          isOwner={profile.role === 'owner'}
          currentUserId={user.id}
          members={members ?? []}
          invites={invites ?? []}
        />
      </div>
      <div className="max-w-2xl rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
        <BackupSection isOwner={profile.role === 'owner'} />
      </div>
    </div>
  )
}

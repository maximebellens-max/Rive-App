import { createClient } from '@/lib/supabase/server'
import SignupForm from './signup-form'

export default async function SignupPage({ searchParams }: PageProps<'/signup'>) {
  const params = await searchParams
  const inviteToken = typeof params?.invite === 'string' ? params.invite : null

  let invite: { email: string; agencyName: string; valid: boolean } | null = null

  if (inviteToken) {
    const supabase = await createClient()
    const { data } = await supabase.rpc('get_invite_info', { p_token: inviteToken }).maybeSingle()
    const info = data as { email: string; agency_name: string; valid: boolean } | null
    if (info) {
      invite = { email: info.email, agencyName: info.agency_name, valid: info.valid }
    }
  }

  return (
    <main className="flex flex-1 items-center justify-center px-4 py-16">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">Rive</h1>
          <p className="mt-1 text-sm text-neutral-500">
            {invite
              ? `Rejoins l’agence ${invite.agencyName}`
              : "Crée l'espace de ton agence"}
          </p>
        </div>
        <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
          {inviteToken && !invite?.valid ? (
            <p className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800">
              Ce lien d&apos;invitation est invalide ou a déjà été utilisé.
              Demande à ton agence de t&apos;envoyer une nouvelle invitation.
            </p>
          ) : (
            <SignupForm invite={invite ? { token: inviteToken as string, email: invite.email, agencyName: invite.agencyName } : null} />
          )}
        </div>
      </div>
    </main>
  )
}

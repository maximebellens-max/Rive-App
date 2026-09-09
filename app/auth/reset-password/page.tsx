import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import ResetPasswordForm from './reset-password-form'

// Accessible uniquement après avoir suivi le lien reçu par email, qui pose
// une session de récupération via /auth/confirm (voir app/auth/confirm/route.ts).
// Sans cette session — lien déjà utilisé, expiré, ou page ouverte directement
// — on affiche un message clair plutôt que le formulaire.
export default async function ResetPasswordPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  return (
    <main className="flex flex-1 items-center justify-center px-4 py-16">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">Rive</h1>
          <p className="mt-1 text-sm text-neutral-500">Choisis un nouveau mot de passe</p>
        </div>
        <div className="rounded-2xl border border-neutral-200 bg-surface p-6 shadow-sm">
          {user ? (
            <ResetPasswordForm />
          ) : (
            <div className="flex flex-col gap-4">
              <p className="rounded-lg bg-warn-soft px-4 py-3 text-sm text-warn">
                Ce lien a expiré ou est invalide. Redemande un lien de réinitialisation.
              </p>
              <Link
                href="/login/forgot-password"
                className="text-center text-sm font-medium text-neutral-900 underline"
              >
                Redemander un lien
              </Link>
            </div>
          )}
        </div>
      </div>
    </main>
  )
}

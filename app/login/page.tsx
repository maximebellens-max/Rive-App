import LoginForm from './login-form'

export default async function LoginPage({ searchParams }: PageProps<'/login'>) {
  const params = await searchParams
  const confirmationFailed = params?.error === 'confirmation-failed'

  return (
    <main className="flex flex-1 items-center justify-center px-4 py-16">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">Rive</h1>
          <p className="mt-1 text-sm text-neutral-500">
            Connecte-toi à ton agence
          </p>
        </div>
        {confirmationFailed && (
          <p className="mb-4 rounded-lg bg-warn-soft px-4 py-3 text-sm text-warn">
            Le lien de confirmation est invalide ou a expiré. Réessaie de te
            connecter, ou recrée un compte.
          </p>
        )}
        <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
          <LoginForm />
        </div>
      </div>
    </main>
  )
}

import ForgotPasswordForm from './forgot-password-form'

export default function ForgotPasswordPage() {
  return (
    <main className="flex flex-1 items-center justify-center px-4 py-16">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">Rive</h1>
          <p className="mt-1 text-sm text-neutral-500">Mot de passe oublié</p>
        </div>
        <div className="rounded-2xl border border-neutral-200 bg-surface p-6 shadow-sm">
          <ForgotPasswordForm />
        </div>
      </div>
    </main>
  )
}
'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import { requestPasswordReset, type AuthState } from '@/app/actions/auth'

export default function ForgotPasswordForm() {
  const [state, action, pending] = useActionState<AuthState, FormData>(
    requestPasswordReset,
    undefined
  )

  if (state?.info) {
    return (
      <div className="flex flex-col gap-4">
        <p className="rounded-lg bg-good-soft px-4 py-3 text-sm text-good">{state.info}</p>
        <Link
          href="/login"
          className="text-center text-sm font-medium text-neutral-900 underline"
        >
          Retour à la connexion
        </Link>
      </div>
    )
  }

  return (
    <form action={action} className="flex flex-col gap-4">
      <p className="text-sm text-neutral-500">
        Indique l&apos;email de ton compte : on t&apos;envoie un lien pour choisir un nouveau mot de passe.
      </p>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="email" className="text-sm font-medium text-neutral-700">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          className="rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-accent focus:ring-1 focus:ring-accent"
        />
      </div>

      {state?.error && (
        <p className="text-sm text-danger" role="alert">
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="mt-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-ink transition hover:bg-accent-hover disabled:opacity-60"
      >
        {pending ? 'Envoi…' : 'Envoyer le lien'}
      </button>

      <p className="text-center text-sm text-neutral-500">
        <Link href="/login" className="font-medium text-neutral-900 underline">
          Retour à la connexion
        </Link>
      </p>
    </form>
  )
}
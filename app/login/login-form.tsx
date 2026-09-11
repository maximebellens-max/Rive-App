'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import { login, type AuthState } from '@/app/actions/auth'

export default function LoginForm() {
  const [state, action, pending] = useActionState<AuthState, FormData>(
    login,
    undefined
  )

  return (
    <form action={action} className="flex flex-col gap-4">
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

      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <label htmlFor="password" className="text-sm font-medium text-neutral-700">
            Mot de passe
          </label>
          <Link href="/login/forgot-password" className="text-xs font-medium text-neutral-500 hover:text-neutral-900">
            Mot de passe oublié ?
          </Link>
        </div>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
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
        {pending ? 'Connexion…' : 'Se connecter'}
      </button>

      <p className="text-center text-sm text-neutral-500">
        Pas encore de compte ?{' '}
        <Link href="/signup" className="font-medium text-neutral-900 underline">
          Créer une agence
        </Link>
      </p>
    </form>
  )
}
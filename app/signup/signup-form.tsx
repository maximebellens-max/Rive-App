'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import { signup, type AuthState } from '@/app/actions/auth'

type Invite = { token: string; email: string; agencyName: string }

export default function SignupForm({ invite = null }: { invite?: Invite | null }) {
  const [state, action, pending] = useActionState<AuthState, FormData>(
    signup,
    undefined
  )

  if (state?.info) {
    return (
      <p className="rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
        {state.info}
      </p>
    )
  }

  return (
    <form action={action} className="flex flex-col gap-4">
      {invite ? (
        <>
          <input type="hidden" name="invite_token" value={invite.token} />
          <p className="rounded-lg bg-neutral-50 px-3 py-2 text-sm text-neutral-600">
            Invitation pour rejoindre <strong className="font-medium text-neutral-900">{invite.agencyName}</strong>
          </p>
        </>
      ) : (
        <div className="flex flex-col gap-1.5">
          <label htmlFor="agency_name" className="text-sm font-medium text-neutral-700">
            Nom de l&apos;agence
          </label>
          <input
            id="agency_name"
            name="agency_name"
            type="text"
            placeholder="Hevrest"
            required
            className="rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900"
          />
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        <label htmlFor="full_name" className="text-sm font-medium text-neutral-700">
          Ton nom
        </label>
        <input
          id="full_name"
          name="full_name"
          type="text"
          required
          className="rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900"
        />
      </div>

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
          readOnly={!!invite}
          defaultValue={invite?.email ?? undefined}
          className="rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900 read-only:bg-neutral-100 read-only:text-neutral-500"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="password" className="text-sm font-medium text-neutral-700">
          Mot de passe
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          minLength={8}
          required
          className="rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900"
        />
        <p className="text-xs text-neutral-400">8 caractères minimum</p>
      </div>

      {state?.error && (
        <p className="text-sm text-red-600" role="alert">
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="mt-2 rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-neutral-700 disabled:opacity-60"
      >
        {pending ? 'Création…' : invite ? 'Rejoindre l’agence' : 'Créer mon agence'}
      </button>

      <p className="text-center text-sm text-neutral-500">
        Déjà un compte ?{' '}
        <Link href="/login" className="font-medium text-neutral-900 underline">
          Se connecter
        </Link>
      </p>
    </form>
  )
}

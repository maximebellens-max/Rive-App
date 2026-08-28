'use client'

import { useActionState, useState } from 'react'
import { createInvite, cancelInvite, removeTeamMember, type InviteFormState } from '@/app/actions/team'

type Member = { id: string; full_name: string; role: string }
type Invite = { id: string; email: string; token: string; created_at: string }

function InviteLinkButton({ token }: { token: string }) {
  const [copied, setCopied] = useState(false)

  function copy() {
    const url = `${window.location.origin}/signup?invite=${token}`
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <button
      type="button"
      onClick={copy}
      className="rounded-lg border border-neutral-300 px-2.5 py-1 text-xs font-medium text-neutral-700 hover:bg-neutral-100"
    >
      {copied ? 'Lien copié ✓' : 'Copier le lien'}
    </button>
  )
}

export default function TeamSection({
  isOwner,
  currentUserId,
  members,
  invites,
}: {
  isOwner: boolean
  currentUserId: string
  members: Member[]
  invites: Invite[]
}) {
  const [state, action, pending] = useActionState<InviteFormState, FormData>(createInvite, undefined)

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold text-neutral-900">Membres de l&apos;agence</h2>
        <ul className="flex flex-col divide-y divide-neutral-100 rounded-xl border border-neutral-200">
          {members.map((m) => (
            <li key={m.id} className="flex items-center justify-between gap-3 px-4 py-2.5">
              <div>
                <p className="text-sm font-medium text-neutral-900">{m.full_name || 'Sans nom'}</p>
                <p className="text-xs text-neutral-500">{m.role === 'owner' ? 'Propriétaire' : 'Agent'}</p>
              </div>
              {isOwner && m.id !== currentUserId && (
                <button
                  type="button"
                  onClick={() => removeTeamMember(m.id)}
                  className="text-xs font-medium text-danger hover:underline"
                >
                  Retirer
                </button>
              )}
            </li>
          ))}
        </ul>
      </div>

      {isOwner && (
        <>
          <div className="flex flex-col gap-2">
            <h2 className="text-sm font-semibold text-neutral-900">Invitations en attente</h2>
            {invites.length === 0 ? (
              <p className="text-sm text-neutral-400">Aucune invitation en attente.</p>
            ) : (
              <ul className="flex flex-col divide-y divide-neutral-100 rounded-xl border border-neutral-200">
                {invites.map((inv) => (
                  <li key={inv.id} className="flex items-center justify-between gap-3 px-4 py-2.5">
                    <p className="text-sm text-neutral-700">{inv.email}</p>
                    <div className="flex items-center gap-2">
                      <InviteLinkButton token={inv.token} />
                      <button
                        type="button"
                        onClick={() => cancelInvite(inv.id)}
                        className="text-xs font-medium text-danger hover:underline"
                      >
                        Annuler
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <h2 className="text-sm font-semibold text-neutral-900">Inviter un coéquipier</h2>
            <form action={action} className="flex items-end gap-2">
              <div className="flex flex-1 flex-col gap-1.5">
                <label htmlFor="invite-email" className="text-xs font-medium text-neutral-500">
                  Adresse email
                </label>
                <input
                  id="invite-email"
                  name="email"
                  type="email"
                  required
                  placeholder="mandin@hevrest.fr"
                  className="rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-accent"
                />
              </div>
              <button
                type="submit"
                disabled={pending}
                className="rounded-lg bg-accent px-3 py-2 text-sm font-medium text-white hover:bg-accent-hover disabled:opacity-60"
              >
                {pending ? 'Envoi…' : 'Inviter'}
              </button>
            </form>
            {state?.error && <p className="text-sm text-danger">{state.error}</p>}
            <p className="text-xs text-neutral-400">
              Le lien d&apos;invitation apparaîtra ci-dessus une fois créé — envoie-le toi-même
              par SMS ou email à ton coéquipier.
            </p>
          </div>
        </>
      )}
    </div>
  )
}

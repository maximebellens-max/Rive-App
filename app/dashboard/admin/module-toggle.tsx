'use client'

import { useTransition } from 'react'
import { toggleAgencyModule } from '@/app/actions/admin'

// Interrupteur auto-validé (pas de bouton "Enregistrer" séparé) — un admin
// qui vient de vendre un module veut l'activer en un clic, pas remplir un
// formulaire. Même convention que le reste du dashboard (voir
// activate-mandate-button.tsx) : useTransition plutôt qu'un état de
// chargement global.
export default function ModuleToggle({
  agencyId,
  moduleKey,
  enabled,
}: {
  agencyId: string
  moduleKey: string
  enabled: boolean
}) {
  const [pending, startTransition] = useTransition()

  return (
    <label className="inline-flex cursor-pointer items-center gap-2 text-sm">
      <input
        type="checkbox"
        checked={enabled}
        disabled={pending}
        onChange={(e) => {
          const next = e.target.checked
          startTransition(() => toggleAgencyModule(agencyId, moduleKey, next))
        }}
        className="h-4 w-4 accent-accent"
      />
      <span className={pending ? 'text-neutral-400' : 'text-neutral-700'}>
        {enabled ? 'Activé' : 'Désactivé'}
      </span>
    </label>
  )
}
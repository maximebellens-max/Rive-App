'use client'

import { useState, useTransition } from 'react'
import { regenerateIcsToken } from '@/app/actions/agency'

export default function AgendaSyncSection({ icsUrl }: { icsUrl: string }) {
  const [copied, setCopied] = useState(false)
  const [pending, startTransition] = useTransition()
  const [confirmingReset, setConfirmingReset] = useState(false)

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(icsUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Presse-papier indisponible (permissions navigateur) — le champ reste
      // sélectionnable à la main dans ce cas.
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div>
        <h2 className="text-sm font-semibold text-neutral-900">Agenda — synchronisation iPhone</h2>
        <p className="mt-1 text-xs text-neutral-500">
          Ce lien est personnel : il affiche automatiquement tes propres rendez-vous Rive (ceux que tu as créés, plus
          ceux où tu es coché comme participant) dans l&apos;app Calendrier de ton iPhone — pas ceux des autres
          agents. Mis à jour en continu, pas besoin de le réimporter.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <input
          readOnly
          value={icsUrl}
          onFocus={(e) => e.currentTarget.select()}
          className="min-w-0 flex-1 rounded-lg border border-neutral-300 bg-neutral-50 px-3 py-2 text-xs text-neutral-600 outline-none"
        />
        <button
          type="button"
          onClick={handleCopy}
          className="shrink-0 rounded-lg border border-neutral-300 px-3 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-100"
        >
          {copied ? 'Copié ✓' : 'Copier'}
        </button>
      </div>

      <details className="text-xs text-neutral-500">
        <summary className="cursor-pointer font-medium text-neutral-700">Comment l&apos;ajouter sur iPhone</summary>
        <ol className="mt-2 flex list-decimal flex-col gap-1 pl-4">
          <li>Copie le lien ci-dessus.</li>
          <li>Réglages → Calendrier → Comptes → Ajouter un compte → Autre.</li>
          <li>Ajouter un calendrier abonné, puis colle le lien dans « Serveur ».</li>
          <li>Enregistrer — les rendez-vous Rive apparaissent dans l&apos;app Calendrier, actualisés automatiquement.</li>
        </ol>
      </details>

      {!confirmingReset ? (
        <button
          type="button"
          onClick={() => setConfirmingReset(true)}
          className="w-fit text-xs text-danger hover:underline"
        >
          Régénérer le lien (invalide l&apos;ancien)
        </button>
      ) : (
        <div className="flex items-center gap-2 text-xs">
          <span className="text-neutral-500">Les abonnements existants cesseront de se mettre à jour.</span>
          <button
            type="button"
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                await regenerateIcsToken()
                setConfirmingReset(false)
              })
            }
            className="rounded bg-danger px-2 py-1 font-medium text-white disabled:opacity-50"
          >
            Confirmer
          </button>
          <button type="button" onClick={() => setConfirmingReset(false)} className="text-neutral-500 hover:underline">
            Annuler
          </button>
        </div>
      )}
    </div>
  )
}
'use client'

import { useState, useTransition } from 'react'
import { updateLandingPage, deleteLandingPage, type LandingPageState } from '@/app/actions/landing-pages'

const selectClass =
  'rounded-lg border border-neutral-300 px-2 py-1.5 text-xs outline-none focus:border-accent focus:ring-1 focus:ring-accent'

const CATEGORY_LABEL: Record<string, string> = {
  vendeur: 'Vendeurs',
  acheteur: 'Acheteurs',
  investisseur_france: 'Investisseurs France',
  investisseur_dubai: 'Investisseurs Dubaï',
  investisseur_georgie: 'Investisseurs Géorgie',
}

type LandingPage = {
  id: string
  token: string
  label: string
  url: string
  category: string
  owner_id: string | null
}

export default function LandingPageRow({
  landingPage,
  members,
  appUrl,
}: {
  landingPage: LandingPage
  members: { id: string; full_name: string }[]
  appUrl: string
}) {
  const [label, setLabel] = useState(landingPage.label)
  const [category, setCategory] = useState(landingPage.category)
  const [ownerId, setOwnerId] = useState(landingPage.owner_id ?? '')
  const [error, setError] = useState<LandingPageState>(undefined)
  const [pending, startTransition] = useTransition()
  const [showCode, setShowCode] = useState(false)
  const [copied, setCopied] = useState(false)
  const [confirmingDelete, setConfirmingDelete] = useState(false)

  const webhookUrl = `${appUrl}/api/webhooks/landing/${landingPage.token}`

  function save(nextLabel: string, nextCategory: string, nextOwnerId: string) {
    const formData = new FormData()
    formData.set('label', nextLabel)
    formData.set('url', landingPage.url)
    formData.set('category', nextCategory)
    formData.set('owner_id', nextOwnerId)
    startTransition(async () => {
      const result = await updateLandingPage(landingPage.id, undefined, formData)
      setError(result)
    })
  }

  const snippet = `async function envoyerLeadVersRive({ prenom, nom, telephone, email, reponses }) {
  try {
    await fetch("${webhookUrl}", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        first_name: prenom,
        last_name: nom,
        phone: telephone,
        email: email,
        // Facultatif : les autres réponses du formulaire (objectif, budget…),
        // affichées sur la fiche du prospect dans Rive.
        answers: reponses || [],
        // Facultatif : identifiant unique généré à l'affichage du formulaire,
        // pour éviter un doublon en cas de double clic sur "Envoyer".
        submission_id: crypto.randomUUID(),
      }),
    })
  } catch (e) {
    // Ne bloque jamais l'envoi normal du formulaire si Rive est injoignable.
  }
}`

  async function handleCopySnippet() {
    try {
      await navigator.clipboard.writeText(snippet)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Presse-papier indisponible — le bloc de code reste sélectionnable à la main.
    }
  }

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-neutral-200 px-3 py-2 text-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 flex-1 flex-col">
          <input
            value={label}
            disabled={pending}
            onChange={(e) => setLabel(e.target.value)}
            onBlur={() => save(label, category, ownerId)}
            className="min-w-0 rounded border border-transparent bg-transparent px-1 py-0.5 font-medium text-neutral-800 hover:border-neutral-200 focus:border-accent focus:outline-none"
          />
          {landingPage.url && (
            <a href={landingPage.url} target="_blank" rel="noreferrer" className="truncate px-1 text-xs text-neutral-400 hover:underline">
              {landingPage.url}
            </a>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={category}
            disabled={pending}
            onChange={(e) => {
              setCategory(e.target.value)
              save(label, e.target.value, ownerId)
            }}
            className={selectClass}
          >
            {Object.entries(CATEGORY_LABEL).map(([value, l]) => (
              <option key={value} value={value}>
                {l}
              </option>
            ))}
          </select>
          <select
            value={ownerId}
            disabled={pending}
            onChange={(e) => {
              setOwnerId(e.target.value)
              save(label, category, e.target.value)
            }}
            className={selectClass}
          >
            <option value="">— Propriétaire —</option>
            {members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.full_name || 'Sans nom'}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => setShowCode((v) => !v)}
            className="rounded-lg border border-neutral-300 px-2 py-1.5 text-xs font-medium text-neutral-600 hover:bg-neutral-100"
          >
            {showCode ? 'Masquer le code' : 'Code à transmettre'}
          </button>
          {!confirmingDelete ? (
            <button type="button" onClick={() => setConfirmingDelete(true)} className="text-xs text-danger hover:underline">
              Retirer
            </button>
          ) : (
            <span className="flex items-center gap-1.5 text-xs">
              <button
                type="button"
                onClick={() => startTransition(() => deleteLandingPage(landingPage.id))}
                className="rounded bg-danger px-2 py-1 font-medium text-danger-ink"
              >
                Confirmer
              </button>
              <button type="button" onClick={() => setConfirmingDelete(false)} className="text-neutral-500 hover:underline">
                Annuler
              </button>
            </span>
          )}
        </div>
      </div>

      {error?.error && <p className="rounded-lg bg-danger-soft px-2 py-1.5 text-xs text-danger">{error.error}</p>}

      {showCode && (
        <div className="flex flex-col gap-2 rounded-lg bg-neutral-50 p-3">
          <p className="text-xs text-neutral-600">
            Ce lien et ce code sont à transmettre à qui gère le code de cette landing page (toi-même ou un
            développeur) : ils doivent être ajoutés au moment où le formulaire de la page est envoyé, pour que chaque
            soumission arrive automatiquement dans Rive, sur le tableau « {CATEGORY_LABEL[category]} ».
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <input
              readOnly
              value={webhookUrl}
              onFocus={(e) => e.currentTarget.select()}
              className="min-w-0 flex-1 rounded-lg border border-neutral-300 bg-surface px-3 py-2 text-xs text-neutral-600 outline-none"
            />
          </div>
          <pre className="overflow-x-auto rounded-lg bg-neutral-900 p-3 text-xs text-neutral-100">
            <code>{snippet}</code>
          </pre>
          <button
            type="button"
            onClick={handleCopySnippet}
            className="w-fit rounded-lg border border-neutral-300 px-3 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-100"
          >
            {copied ? 'Copié ✓' : 'Copier le code'}
          </button>
        </div>
      )}
    </div>
  )
}
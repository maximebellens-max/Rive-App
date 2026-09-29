'use client'

import { useRef, useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { removeMandateFile } from '@/app/actions/mandate-property'
import { DIAGNOSTIC_TYPES } from '@/lib/rive/mandates'

export type MandateFile = {
  id: string
  category: 'photo' | 'document'
  diagnostic_type: string | null
  label: string
  storage_path: string
  size_bytes: number | null
  url: string | null
}

const inputClass =
  'rounded-lg border border-neutral-300 px-3 py-2 text-base outline-none focus:border-accent focus:ring-1 focus:ring-accent'

const diagnosticLabel = (key: string | null) => DIAGNOSTIC_TYPES.find((d) => d.key === key)?.label ?? null

function formatSize(bytes: number | null): string {
  if (!bytes) return ''
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} Ko`
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`
}

export default function MandateFilesSection({ mandateId, files }: { mandateId: string; files: MandateFile[] }) {
  const photos = files.filter((f) => f.category === 'photo')
  const documents = files.filter((f) => f.category === 'document')

  return (
    <div className="flex flex-col gap-6 rounded-2xl border border-neutral-200 bg-surface p-6 shadow-sm">
      <div>
        <h2 className="text-sm font-semibold text-neutral-900">Photos & documents</h2>
        <p className="mt-1 text-xs text-neutral-500">
          Stockés de façon privée dans Rive (jamais accessibles sans être connecté à l&apos;agence) — préviens si un
          envoi échoue, un fichier trop volumineux peut être refusé selon l&apos;hébergement.
        </p>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-neutral-900">Photos</h3>
        {photos.length > 0 ? (
          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {photos.map((p) => (
              <div key={p.id} className="flex flex-col gap-1.5">
                <div className="aspect-square overflow-hidden rounded-lg border border-neutral-200 bg-neutral-50">
                  {p.url && (
                    // Photos de biens uploadées par l'agent, pas des images distantes
                    // optimisables par next/image (URL signée temporaire) — <img> simple.
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.url} alt={p.label} className="h-full w-full object-cover" />
                  )}
                </div>
                <div className="flex items-center justify-between gap-1">
                  <span className="truncate text-xs text-neutral-500">{p.label}</span>
                  <form action={removeMandateFile.bind(null, mandateId, p.id, p.storage_path)}>
                    <button type="submit" className="shrink-0 text-xs text-danger hover:underline">
                      Retirer
                    </button>
                  </form>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-2 text-sm text-neutral-400">Aucune photo pour l&apos;instant.</p>
        )}

        <UploadForm mandateId={mandateId} category="photo">
          <div className="flex flex-col gap-1">
            <label className="text-xs text-neutral-500">Ajouter une photo</label>
            {/* capture="environment" propose directement l'appareil photo arrière sur
                mobile au lieu du sélecteur de fichiers générique — pratique en visite,
                pas de va-et-vient entre l'appli Photos et Rive. Sans effet sur ordinateur
                (le sélecteur de fichiers classique s'ouvre comme avant). */}
            <input type="file" name="file" accept="image/*" capture="environment" required className={inputClass} />
          </div>
        </UploadForm>
      </div>

      <div className="border-t border-neutral-100 pt-6">
        <h3 className="text-sm font-semibold text-neutral-900">Documents</h3>
        <p className="mt-1 text-xs text-neutral-500">
          Titre de propriété, rapports de diagnostics, tout justificatif utile au dossier.
        </p>

        <div className="mt-3 flex flex-col gap-2">
          {documents.map((d) => (
            <div
              key={d.id}
              className="flex items-center justify-between gap-3 rounded-lg border border-neutral-200 px-3 py-2 text-sm"
            >
              <div className="flex flex-1 flex-wrap items-center gap-x-3 gap-y-1 text-neutral-700">
                {d.url ? (
                  <a href={d.url} target="_blank" rel="noreferrer" className="font-medium hover:underline">
                    {d.label}
                  </a>
                ) : (
                  <span className="font-medium text-neutral-400">{d.label} (indisponible)</span>
                )}
                {diagnosticLabel(d.diagnostic_type) && (
                  <span className="rounded-full bg-accent-soft px-2 py-0.5 text-xs font-medium text-neutral-700">
                    {diagnosticLabel(d.diagnostic_type)}
                  </span>
                )}
                {d.size_bytes !== null && <span className="text-xs text-neutral-400">{formatSize(d.size_bytes)}</span>}
              </div>
              <form action={removeMandateFile.bind(null, mandateId, d.id, d.storage_path)}>
                <button type="submit" className="text-xs text-danger hover:underline">
                  Retirer
                </button>
              </form>
            </div>
          ))}
          {!documents.length && <p className="text-sm text-neutral-400">Aucun document pour l&apos;instant.</p>}
        </div>

        <UploadForm mandateId={mandateId} category="document" grid>
          <input name="label" placeholder="Nom du document" className={`${inputClass} col-span-2`} />
          <select name="diagnostic_type" defaultValue="" className={inputClass}>
            <option value="">Pas un diagnostic</option>
            {DIAGNOSTIC_TYPES.map((d) => (
              <option key={d.key} value={d.key}>
                Diagnostic — {d.label}
              </option>
            ))}
          </select>
          <input type="file" name="file" required className={inputClass} />
        </UploadForm>
      </div>
    </div>
  )
}

// Upload en XMLHttpRequest (via /api/mandates/[id]/files) plutôt qu'un simple
// <form action={serverAction}> : seule une requête XHR classique expose des
// évènements de progression (upload.onprogress) — utile pour un agent qui
// envoie une photo ou un diagnostic PDF depuis le terrain en 3G/4G faible,
// où l'ancien formulaire donnait l'impression que l'envoi était figé.
function UploadForm({
  mandateId,
  category,
  grid = false,
  children,
}: {
  mandateId: string
  category: 'photo' | 'document'
  grid?: boolean
  children: React.ReactNode
}) {
  const router = useRouter()
  const formRef = useRef<HTMLFormElement>(null)
  const [progress, setProgress] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const form = e.currentTarget
    const formData = new FormData(form)
    formData.set('category', category)

    setError(null)
    setProgress(0)

    const xhr = new XMLHttpRequest()
    xhr.open('POST', `/api/mandates/${mandateId}/files`)
    xhr.upload.onprogress = (ev) => {
      if (ev.lengthComputable) setProgress(Math.round((ev.loaded / ev.total) * 100))
    }
    xhr.onload = () => {
      let ok = xhr.status >= 200 && xhr.status < 300
      let message = "Échec de l'envoi du fichier."
      try {
        const body = JSON.parse(xhr.responseText)
        ok = ok && body.ok !== false
        if (body.error) message = body.error
      } catch {
        // Réponse non-JSON (erreur serveur inattendue) : le statut HTTP suffit.
      }
      setProgress(null)
      if (ok) {
        form.reset()
        router.refresh()
      } else {
        setError(message)
      }
    }
    xhr.onerror = () => {
      setProgress(null)
      setError('Connexion interrompue pendant l’envoi — réessaie une fois le réseau retrouvé.')
    }
    xhr.send(formData)
  }

  return (
    <form
      ref={formRef}
      onSubmit={handleSubmit}
      className={grid ? 'mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4' : 'mt-3 flex flex-wrap items-end gap-2'}
    >
      {children}
      <button
        type="submit"
        disabled={progress !== null}
        className={`rounded-lg border border-neutral-300 px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-100 disabled:opacity-60 ${
          grid ? 'col-span-2 sm:col-span-4 sm:w-fit' : ''
        }`}
      >
        {progress !== null ? `Envoi… ${progress}%` : category === 'document' ? 'Envoyer le document' : 'Envoyer'}
      </button>
      {progress !== null && (
        <div className={`h-1.5 w-full overflow-hidden rounded-full bg-neutral-100 ${grid ? 'col-span-2 sm:col-span-4' : ''}`}>
          <div className="h-full rounded-full bg-accent transition-[width]" style={{ width: `${progress}%` }} />
        </div>
      )}
      {error && <p className={`text-xs text-danger ${grid ? 'col-span-2 sm:col-span-4' : 'w-full'}`}>{error}</p>}
    </form>
  )
}
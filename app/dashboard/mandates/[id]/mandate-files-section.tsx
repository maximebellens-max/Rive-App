import { removeMandateFile, uploadMandateFile } from '@/app/actions/mandate-property'
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
  'rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-accent focus:ring-1 focus:ring-accent'

const diagnosticLabel = (key: string | null) => DIAGNOSTIC_TYPES.find((d) => d.key === key)?.label ?? null

function formatSize(bytes: number | null): string {
  if (!bytes) return ''
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} Ko`
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`
}

export default function MandateFilesSection({ mandateId, files }: { mandateId: string; files: MandateFile[] }) {
  const photos = files.filter((f) => f.category === 'photo')
  const documents = files.filter((f) => f.category === 'document')
  const uploadWithId = uploadMandateFile.bind(null, mandateId)

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

        <form action={uploadWithId} className="mt-3 flex flex-wrap items-end gap-2">
          <input type="hidden" name="category" value="photo" />
          <div className="flex flex-col gap-1">
            <label className="text-xs text-neutral-500">Ajouter une photo</label>
            <input type="file" name="file" accept="image/*" required className={inputClass} />
          </div>
          <button
            type="submit"
            className="rounded-lg border border-neutral-300 px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-100"
          >
            Envoyer
          </button>
        </form>
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

        <form action={uploadWithId} className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <input type="hidden" name="category" value="document" />
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
          <button
            type="submit"
            className="col-span-2 rounded-lg border border-neutral-300 px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-100 sm:col-span-4 sm:w-fit"
          >
            Envoyer le document
          </button>
        </form>
      </div>
    </div>
  )
}
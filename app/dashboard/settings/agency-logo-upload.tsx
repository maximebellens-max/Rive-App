'use client'

import { useRef, useState, useTransition } from 'react'
import { updateAgencyLogo } from '@/app/actions/agency'

const MAX_WIDTH = 480
const MAX_HEIGHT = 160

// Contrairement à la photo de profil (avatar-upload.tsx), pas de recadrage
// carré : un logo garde ses proportions d'origine, réduit si besoin pour
// tenir dans un encart raisonnable, jamais agrandi au-delà de sa taille
// réelle. Export en PNG (et non JPEG) pour préserver la transparence — la
// plupart des logos sont fournis sur fond transparent.
function resizeLogoToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('read failed'))
    reader.onload = () => {
      const img = new Image()
      img.onerror = () => reject(new Error('decode failed'))
      img.onload = () => {
        const scale = Math.min(1, MAX_WIDTH / img.width, MAX_HEIGHT / img.height)
        const w = Math.max(1, Math.round(img.width * scale))
        const h = Math.max(1, Math.round(img.height * scale))
        const canvas = document.createElement('canvas')
        canvas.width = w
        canvas.height = h
        const ctx = canvas.getContext('2d')
        if (!ctx) return reject(new Error('no canvas context'))
        ctx.drawImage(img, 0, 0, w, h)
        resolve(canvas.toDataURL('image/png'))
      }
      img.src = reader.result as string
    }
    reader.readAsDataURL(file)
  })
}

export default function AgencyLogoUpload({ logoUrl }: { logoUrl: string }) {
  const [preview, setPreview] = useState(logoUrl)
  const [error, setError] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [, startTransition] = useTransition()
  const inputRef = useRef<HTMLInputElement>(null)

  function save(dataUrl: string) {
    setUploading(true)
    startTransition(async () => {
      const res = await updateAgencyLogo(dataUrl)
      setUploading(false)
      if (res?.error) setError(res.error)
    })
  }

  async function handleFile(file: File) {
    setError(null)
    try {
      const dataUrl = await resizeLogoToDataUrl(file)
      setPreview(dataUrl)
      save(dataUrl)
    } catch {
      setError('Impossible de lire cette image.')
    }
  }

  return (
    <div className="flex items-center gap-4">
      <div className="flex h-16 w-40 items-center justify-center rounded-lg border border-dashed border-neutral-300 bg-[repeating-conic-gradient(#f4f4f5_0%_25%,transparent_0%_50%)] bg-[length:16px_16px] p-2">
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt="Logo de l'agence" className="max-h-full max-w-full object-contain" />
        ) : (
          <span className="text-xs text-neutral-400">Aucun logo</span>
        )}
      </div>
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="w-fit rounded-lg border border-neutral-300 px-3 py-1.5 text-sm font-medium text-neutral-700 hover:bg-neutral-100"
          >
            {preview ? 'Changer le logo' : 'Ajouter un logo'}
          </button>
          {preview && (
            <button
              type="button"
              onClick={() => {
                setPreview('')
                save('')
              }}
              className="text-xs text-neutral-400 hover:text-danger"
            >
              Retirer
            </button>
          )}
        </div>
        <p className="text-xs text-neutral-400">
          PNG ou JPG, fond transparent recommandé — affiché en en-tête de chaque mandat généré.
        </p>
        {uploading && <span className="text-xs text-neutral-400">Envoi…</span>}
        {error && <span className="text-xs text-danger">{error}</span>}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) handleFile(file)
          e.target.value = ''
        }}
      />
    </div>
  )
}
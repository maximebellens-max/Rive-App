'use client'

import { useRef, useState, useTransition } from 'react'
import { updateOwnAvatar } from '@/app/actions/team'
import Avatar from '../_components/avatar'

const TARGET_SIZE = 200

// Recadre l'image choisie en carré (centré) et la redimensionne/compresse
// côté client avant l'envoi — évite d'avoir à gérer un bucket de stockage
// séparé pour de petites photos de profil (voir la migration avatar_url).
function resizeToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('read failed'))
    reader.onload = () => {
      const img = new Image()
      img.onerror = () => reject(new Error('decode failed'))
      img.onload = () => {
        const canvas = document.createElement('canvas')
        canvas.width = TARGET_SIZE
        canvas.height = TARGET_SIZE
        const ctx = canvas.getContext('2d')
        if (!ctx) return reject(new Error('no canvas context'))
        const side = Math.min(img.width, img.height)
        const sx = (img.width - side) / 2
        const sy = (img.height - side) / 2
        ctx.drawImage(img, sx, sy, side, side, 0, 0, TARGET_SIZE, TARGET_SIZE)
        resolve(canvas.toDataURL('image/jpeg', 0.85))
      }
      img.src = reader.result as string
    }
    reader.readAsDataURL(file)
  })
}

export default function AvatarUpload({ name, avatarUrl }: { name: string; avatarUrl: string }) {
  const [preview, setPreview] = useState(avatarUrl)
  const [error, setError] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [, startTransition] = useTransition()
  const inputRef = useRef<HTMLInputElement>(null)

  async function handleFile(file: File) {
    setError(null)
    try {
      const dataUrl = await resizeToDataUrl(file)
      setPreview(dataUrl)
      setUploading(true)
      startTransition(async () => {
        const res = await updateOwnAvatar(dataUrl)
        setUploading(false)
        if (res?.error) setError(res.error)
      })
    } catch {
      setError('Impossible de lire cette image.')
    }
  }

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="relative rounded-full"
        aria-label="Changer ma photo de profil"
        title="Changer ma photo de profil"
      >
        <Avatar name={name} avatarUrl={preview} size={36} />
        <span className="absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-accent text-[9px] text-accent-ink ring-2 ring-surface">
          ✎
        </span>
      </button>
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
      {uploading && <span className="text-xs text-neutral-400">Envoi…</span>}
      {error && <span className="text-xs text-danger">{error}</span>}
    </div>
  )
}
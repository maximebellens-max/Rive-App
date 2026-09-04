'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { markNotificationsRead } from '@/app/actions/notifications'

export type NotificationItem = {
  id: string
  title: string
  body: string
  lead_id: string | null
  created_at: string
  read: boolean
}

// Formatage relatif volontairement simple (pas de dépendance externe) :
// les notifications de Rive portent toujours sur des événements récents
// (quelques minutes à quelques jours), pas besoin de gérer les mois/années.
function formatRelativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime()
  const minutes = Math.floor(diffMs / 60_000)
  if (minutes < 1) return "à l'instant"
  if (minutes < 60) return `il y a ${minutes} min`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `il y a ${hours} h`
  const days = Math.floor(hours / 24)
  if (days === 1) return 'hier'
  return `il y a ${days} j`
}

export default function NotificationBell({ notifications }: { notifications: NotificationItem[] }) {
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState(notifications)
  const [syncedNotifications, setSyncedNotifications] = useState(notifications)
  const containerRef = useRef<HTMLDivElement>(null)

  // La liste vient du Server Component parent (layout) — si on navigue et
  // qu'un nouveau rendu serveur ramène des notifications différentes
  // (nouveau lead entre-temps), on garde l'affichage local à jour. Ajustée
  // pendant le rendu plutôt que dans un effet (pattern recommandé par React
  // pour réinitialiser un état dérivé d'une prop) pour éviter un rendu en
  // cascade inutile.
  if (notifications !== syncedNotifications) {
    setSyncedNotifications(notifications)
    setItems(notifications)
  }

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const unreadCount = items.filter((n) => !n.read).length

  async function handleToggle() {
    const willOpen = !open
    setOpen(willOpen)
    if (willOpen && unreadCount > 0) {
      // Mise à jour optimiste : la pastille disparaît immédiatement, la
      // base est mise à jour en tâche de fond.
      setItems((prev) => prev.map((n) => ({ ...n, read: true })))
      await markNotificationsRead()
    }
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={handleToggle}
        aria-label="Notifications"
        className="relative rounded-lg border border-neutral-300 p-1.5 text-neutral-600 hover:bg-neutral-100"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[10px] font-semibold text-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-20 mt-2 w-80 rounded-xl border border-neutral-200 bg-surface shadow-lg">
          <div className="border-b border-neutral-100 px-4 py-2.5">
            <p className="text-sm font-semibold text-neutral-900">Notifications</p>
          </div>
          <div className="max-h-96 overflow-y-auto">
            {items.length === 0 ? (
              <p className="px-4 py-6 text-center text-sm text-neutral-400">Aucune notification pour le moment.</p>
            ) : (
              items.map((n) => {
                const content = (
                  <div className="flex flex-col gap-0.5 px-4 py-2.5 hover:bg-neutral-50">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-medium text-neutral-900">{n.title}</p>
                      <span className="shrink-0 text-[11px] text-neutral-400">{formatRelativeTime(n.created_at)}</span>
                    </div>
                    {n.body && <p className="text-xs text-neutral-500">{n.body}</p>}
                  </div>
                )
                return n.lead_id ? (
                  <Link key={n.id} href={`/dashboard/prospects/${n.lead_id}`} onClick={() => setOpen(false)}>
                    {content}
                  </Link>
                ) : (
                  <div key={n.id}>{content}</div>
                )
              })
            )}
          </div>
        </div>
      )}
    </div>
  )
}
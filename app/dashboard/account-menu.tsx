'use client'

// Menu compte du bandeau du haut : avatar + nom, menu déroulant façon menu
// utilisateur macOS (Réglages, Déconnexion) plutôt que le nom et le bouton
// de déconnexion posés côte à côte. Même schéma d'interaction que
// notification-bell.tsx (ref + clic en dehors pour fermer), pour rester
// cohérent avec le reste du bandeau.
import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import Avatar from './_components/avatar'
import { ChevronDownIcon, SettingsIcon, LogOutIcon } from './_components/icons'

export default function AccountMenu({
  name,
  email,
  agencyName,
  avatarUrl,
  logoutAction,
}: {
  name: string
  email: string
  agencyName?: string
  avatarUrl?: string | null
  logoutAction: (formData: FormData) => void | Promise<void>
}) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const displayName = name || email

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex items-center gap-2 rounded-lg py-1 pl-1 pr-2 text-sm text-neutral-700 hover:bg-neutral-100"
      >
        <Avatar name={displayName} avatarUrl={avatarUrl} size={26} />
        <span className="hidden max-w-32 truncate font-medium sm:inline">{displayName}</span>
        <ChevronDownIcon
          className={`h-3.5 w-3.5 text-neutral-400 transition-transform ${open ? 'rotate-180' : ''}`}
          aria-hidden="true"
        />
      </button>

      {open && (
        <div className="absolute right-0 z-20 mt-2 w-64 rounded-xl border border-neutral-200 bg-surface py-1.5 shadow-lg">
          <div className="border-b border-neutral-100 px-3.5 py-2.5">
            <p className="truncate text-sm font-semibold text-neutral-900">{displayName}</p>
            <p className="truncate text-xs text-neutral-500">{agencyName ? agencyName : email}</p>
          </div>
          <div className="py-1">
            <Link
              href="/dashboard/settings"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 px-3.5 py-2 text-sm text-neutral-700 hover:bg-neutral-100"
            >
              <SettingsIcon className="h-4 w-4 text-neutral-500" aria-hidden="true" />
              Réglages
            </Link>
          </div>
          <div className="border-t border-neutral-100 py-1">
            <form action={logoutAction}>
              <button
                type="submit"
                className="flex w-full items-center gap-2.5 px-3.5 py-2 text-left text-sm text-neutral-700 hover:bg-neutral-100"
              >
                <LogOutIcon className="h-4 w-4 text-neutral-500" aria-hidden="true" />
                Déconnexion
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
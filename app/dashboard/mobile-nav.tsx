'use client'

// Menu de navigation mobile : sous le breakpoint md, l'<aside> du menu
// latéral est masqué (voir app/dashboard/layout.tsx) et remplacé par ce
// tiroir plein écran reprenant le même SidebarNav. Deux points d'entrée
// l'ouvrent désormais — le hamburger de l'en-tête (MobileNavTrigger) ET le
// bouton "Plus" de la barre de raccourcis en bas d'écran (voir
// _components/mobile-bottom-nav.tsx) — d'où l'état partagé via
// MobileNavProvider/useMobileNav plutôt qu'un useState local ici.
import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { MenuIcon, XIcon } from './_components/icons'
import { useMobileNav } from './_components/mobile-nav-context'
import SidebarNav from './sidebar-nav'

export function MobileNavTrigger() {
  const { setOpen } = useMobileNav()

  return (
    <button
      type="button"
      onClick={() => setOpen(true)}
      aria-label="Ouvrir le menu"
      className="flex h-10 w-10 items-center justify-center rounded-lg text-neutral-600 hover:bg-neutral-100 md:hidden"
    >
      <MenuIcon className="h-5 w-5" strokeWidth={1.75} aria-hidden="true" />
    </button>
  )
}

export function MobileNavDrawer({
  customBoards,
  createBoard,
}: {
  customBoards: { id: string; name: string }[]
  createBoard: (formData: FormData) => void | Promise<void>
}) {
  const { open, setOpen } = useMobileNav()
  const pathname = usePathname()

  // Ferme le tiroir dès qu'on navigue vers une nouvelle page (clic sur un
  // lien du menu) — sinon il resterait ouvert par-dessus la page suivante.
  useEffect(() => {
    setOpen(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname])

  // Empêche la page en dessous de défiler tant que le tiroir est ouvert.
  useEffect(() => {
    if (!open) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [open])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 md:hidden">
      <button
        type="button"
        aria-label="Fermer le menu"
        onClick={() => setOpen(false)}
        className="absolute inset-0 bg-black/30"
      />
      <div
        className="absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col gap-6 overflow-y-auto bg-surface px-4 shadow-xl"
        style={{
          paddingTop: 'max(1rem, env(safe-area-inset-top))',
          paddingBottom: 'max(1rem, env(safe-area-inset-bottom))',
        }}
      >
        <div className="flex items-center justify-between">
          <span className="text-lg font-semibold tracking-tight">Rive</span>
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Fermer le menu"
            className="flex h-10 w-10 items-center justify-center rounded-lg text-neutral-600 hover:bg-neutral-100"
          >
            <XIcon className="h-5 w-5" strokeWidth={1.75} aria-hidden="true" />
          </button>
        </div>
        <SidebarNav customBoards={customBoards} createBoard={createBoard} />
      </div>
    </div>
  )
}
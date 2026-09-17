'use client'

// Menu de navigation mobile : sous le breakpoint md, l'<aside> du menu
// latéral est masqué (voir app/dashboard/layout.tsx) et remplacé par ce
// bouton "hamburger" dans l'en-tête, qui ouvre un tiroir plein écran
// reprenant le même SidebarNav. Avant ce composant, aucune des pages du
// menu (pipelines, mandats, chantiers, etc.) n'était accessible sur
// téléphone — seul le tableau de bord "Aujourd'hui" l'était.
import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { MenuIcon, XIcon } from './_components/icons'
import SidebarNav from './sidebar-nav'

export default function MobileNav({
  customBoards,
  createBoard,
}: {
  customBoards: { id: string; name: string }[]
  createBoard: (formData: FormData) => void | Promise<void>
}) {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()

  // Ferme le tiroir dès qu'on navigue vers une nouvelle page (clic sur un
  // lien du menu) — sinon il resterait ouvert par-dessus la page suivante.
  useEffect(() => {
    setOpen(false)
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

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Ouvrir le menu"
        aria-expanded={open}
        className="flex items-center justify-center rounded-lg p-1.5 text-neutral-600 hover:bg-neutral-100 md:hidden"
      >
        <MenuIcon className="h-5 w-5" strokeWidth={1.75} aria-hidden="true" />
      </button>

      {open && (
        <div className="fixed inset-0 z-50 md:hidden">
          <button
            type="button"
            aria-label="Fermer le menu"
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-black/30"
          />
          <div className="absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col gap-6 overflow-y-auto bg-surface px-4 py-4 shadow-xl">
            <div className="flex items-center justify-between">
              <span className="text-lg font-semibold tracking-tight">Rive</span>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Fermer le menu"
                className="flex items-center justify-center rounded-lg p-1.5 text-neutral-600 hover:bg-neutral-100"
              >
                <XIcon className="h-5 w-5" strokeWidth={1.75} aria-hidden="true" />
              </button>
            </div>
            <SidebarNav customBoards={customBoards} createBoard={createBoard} />
          </div>
        </div>
      )}
    </>
  )
}
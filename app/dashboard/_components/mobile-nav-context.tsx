'use client'

// État partagé du tiroir de navigation mobile : le bouton qui l'ouvre existe
// à deux endroits (hamburger de l'en-tête ET "Plus" de la barre de
// raccourcis en bas d'écran, voir mobile-bottom-nav.tsx) mais ne doit
// piloter qu'un seul tiroir — ce contexte évite de dupliquer l'état ou le
// composant du tiroir lui-même (voir mobile-nav.tsx pour le tiroir).
import { createContext, useContext, useState, type ReactNode } from 'react'

type MobileNavContextValue = { open: boolean; setOpen: (open: boolean) => void }
const MobileNavContext = createContext<MobileNavContextValue | null>(null)

export function MobileNavProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false)
  return <MobileNavContext.Provider value={{ open, setOpen }}>{children}</MobileNavContext.Provider>
}

export function useMobileNav(): MobileNavContextValue {
  const ctx = useContext(MobileNavContext)
  if (!ctx) throw new Error('useMobileNav doit être utilisé sous MobileNavProvider')
  return ctx
}
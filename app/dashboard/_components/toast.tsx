'use client'

// Confirmation d'enregistrement (et autres messages courts) toujours
// visible, quel que soit l'endroit de la page où on se trouve — avant ça,
// le seul retour après un enregistrement était le libellé du bouton
// "✓ Enregistré" (voir use-saved-flash.ts), invisible si le bouton est tout
// en bas d'un long formulaire et qu'on a modifié un champ tout en haut.
// Ce composant ne remplace pas useSavedFlash (les deux se complètent : le
// bouton confirme le clic précis, le toast confirme même hors du champ de
// vision) — voir lead-edit-form.tsx pour un exemple d'utilisation conjointe.
import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react'

type ToastVariant = 'success' | 'error'
type ToastItem = { id: number; message: string; variant: ToastVariant }

type ToastContextValue = { push: (message: string, variant?: ToastVariant) => void }
const ToastContext = createContext<ToastContextValue | null>(null)

const DURATION_MS = 2800

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([])
  const idRef = useRef(0)

  const push = useCallback((message: string, variant: ToastVariant = 'success') => {
    const id = ++idRef.current
    setItems((prev) => [...prev, { id, message, variant }])
    setTimeout(() => {
      setItems((prev) => prev.filter((t) => t.id !== id))
    }, DURATION_MS)
  }, [])

  return (
    <ToastContext.Provider value={{ push }}>
      {children}
      {/* Positionné au-dessus de la barre de raccourcis mobile (voir
          mobile-bottom-nav.tsx) ET du bouton "Enregistrer" fixé en bas de la
          fiche prospect sur mobile (voir lead-edit-form.tsx) — sans cette
          marge supplémentaire, un toast déclenché depuis ce bouton
          s'afficherait pile dessus. Protégé aussi de l'indicateur d'accueil
          iPhone par la marge de sécurité. */}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-[calc(8.5rem+env(safe-area-inset-bottom))] z-[60] flex flex-col items-center gap-2 px-4 md:bottom-6"
      >
        {items.map((t) => (
          <div
            key={t.id}
            role="status"
            className={`pointer-events-auto flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium shadow-lg ${
              t.variant === 'error' ? 'bg-danger text-danger-ink' : 'bg-neutral-900 text-neutral-50'
            }`}
          >
            {t.variant === 'error' ? '⚠️' : '✓'} {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast doit être utilisé sous ToastProvider')
  return ctx
}
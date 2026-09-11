'use client'

// Bouton partagé pour harmoniser les 5 styles qui s'étaient répétés (et
// légèrement décalés au fil du temps) dans chaque écran : primaire (accent),
// secondaire (contour), discret, et destructeur. Les boutons "danger"
// suivaient déjà deux logiques différentes selon les fichiers (confirmation
// en 2 temps ici, suppression immédiate là) — ce composant généralise le
// motif en 2 temps (le plus sûr, et déjà majoritaire dans le code) : premier
// clic = état "à confirmer" pendant quelques secondes, second clic = action
// réellement déclenchée.
//
// N'utilise pas de bibliothèque de composants externe (aucune dépendance
// ajoutée) : juste un <button> HTML avec les classes Tailwind existantes,
// régularisées.
import { forwardRef, useEffect, useRef, useState, type ButtonHTMLAttributes } from 'react'
import { cn } from '@/lib/rive/cn'

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger'
export type ButtonSize = 'sm' | 'md'

const BASE =
  'inline-flex items-center justify-center gap-1.5 rounded-lg font-medium transition disabled:opacity-50 disabled:pointer-events-none'

const SIZES: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-xs',
  md: 'px-4 py-2 text-sm',
}

const VARIANTS: Record<'primary' | 'secondary' | 'ghost', string> = {
  primary: 'bg-accent text-accent-ink hover:bg-accent-hover',
  secondary: 'border border-neutral-300 text-neutral-700 hover:bg-neutral-100',
  ghost: 'text-neutral-600 hover:bg-neutral-100',
}

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant
  size?: ButtonSize
  /** Texte affiché après le 1er clic sur un bouton "danger", avant confirmation. */
  confirmLabel?: string
  /** Délai (ms) avant annulation automatique de la confirmation "danger". */
  confirmTimeoutMs?: number
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = 'primary',
    size = 'md',
    confirmLabel = 'Confirmer',
    confirmTimeoutMs = 4000,
    className,
    children,
    onClick,
    type,
    ...props
  },
  ref
) {
  const [confirming, setConfirming] = useState(false)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    }
  }, [])

  if (variant === 'danger') {
    return (
      <button
        ref={ref}
        type={type ?? 'button'}
        className={cn(
          BASE,
          SIZES[size],
          confirming
            ? 'border border-danger bg-danger text-danger-ink hover:bg-danger-hover'
            : 'border border-danger text-danger hover:bg-danger-soft',
          className
        )}
        onClick={(e) => {
          if (!confirming) {
            setConfirming(true)
            timeoutRef.current = setTimeout(() => setConfirming(false), confirmTimeoutMs)
            return
          }
          if (timeoutRef.current) clearTimeout(timeoutRef.current)
          setConfirming(false)
          onClick?.(e)
        }}
        {...props}
      >
        {confirming ? confirmLabel : children}
      </button>
    )
  }

  return (
    <button
      ref={ref}
      type={type ?? 'button'}
      className={cn(BASE, SIZES[size], VARIANTS[variant], className)}
      onClick={onClick}
      {...props}
    >
      {children}
    </button>
  )
})

export default Button
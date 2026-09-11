'use client'

// Sélecteur de vue (Kanban / Liste / Par agent, etc.) partagé : le même
// motif de 3 boutons dans un conteneur bordé était recopié à l'identique
// dans 6 fichiers (pipelines, mandats, commissions, biens en gestion,
// investisseurs, campagnes), avec le même bug de contraste en mode sombre
// (texte blanc sur le token accent, qui devient clair en mode sombre — voir
// app/globals.css, --color-accent-ink). Un seul composant pour les 6.
import { cn } from '@/lib/rive/cn'

export type SegmentedControlOption<T extends string> = {
  value: T
  label: string
}

export default function SegmentedControl<T extends string>({
  value,
  onChange,
  options,
  className,
}: {
  value: T
  onChange: (value: T) => void
  options: SegmentedControlOption<T>[]
  className?: string
}) {
  return (
    <div className={cn('flex rounded-lg border border-neutral-300 p-0.5 text-xs', className)}>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          aria-pressed={value === option.value}
          className={cn(
            'rounded px-2.5 py-1 font-medium transition',
            value === option.value ? 'bg-accent text-accent-ink' : 'text-neutral-600 hover:text-neutral-900'
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}
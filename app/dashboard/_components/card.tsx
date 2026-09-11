// Carte partagée pour harmoniser les petites cartes de contenu (encadrés,
// tuiles chiffrées, blocs teintés) qui utilisaient chacune leur propre rayon
// et leur propre épaisseur de bordure selon le fichier. Volontairement
// minimal : un simple <div> avec les classes Tailwind existantes,
// régularisées par variante. Pas destiné aux grandes cartes de contenu type
// section de formulaire (celles-ci gardent leur balisage <section> propre),
// ni aux cartes du Kanban (traitées séparément, voir plan de suite).
import type { HTMLAttributes } from 'react'
import { cn } from '@/lib/rive/cn'

export type CardVariant = 'default' | 'muted' | 'accent'

const VARIANTS: Record<CardVariant, string> = {
  default: 'rounded-2xl border border-neutral-200 bg-surface p-4 shadow-sm',
  muted: 'rounded-xl border border-neutral-200 bg-neutral-50 p-4',
  accent: 'rounded-xl bg-accent p-4 text-accent-ink',
}

export type CardProps = HTMLAttributes<HTMLDivElement> & {
  variant?: CardVariant
}

export default function Card({ variant = 'default', className, children, ...props }: CardProps) {
  return (
    <div className={cn(VARIANTS[variant], className)} {...props}>
      {children}
    </div>
  )
}
'use client'

// Barre de raccourcis mobile façon appli Monday : en dessous du menu
// latéral (masqué sous md, voir layout.tsx), c'était jusqu'ici le hamburger
// en haut à gauche — le coin le plus dur à atteindre à une main sur un
// grand téléphone — qui était le SEUL point d'entrée vers le reste de
// l'app. Les 4 premiers raccourcis couvrent ce qui s'ouvre le plus souvent
// entre deux rendez-vous ; "Plus" ouvre le même tiroir complet que le
// hamburger (état partagé, voir mobile-nav-context.tsx) pour tout le reste.
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboardIcon,
  FolderKanbanIcon,
  MessageCircleIcon,
  FileTextIcon,
  CalculatorIcon,
  MenuIcon,
  type IconProps,
} from './icons'
import { useMobileNav } from './mobile-nav-context'

type NavTarget = {
  href: string
  label: string
  icon: (props: IconProps) => React.ReactElement
  match: (pathname: string) => boolean
}

const BASE_TARGETS: NavTarget[] = [
  { href: '/dashboard', label: 'Aujourd’hui', icon: LayoutDashboardIcon, match: (p) => p === '/dashboard' },
  {
    href: '/dashboard/pipelines/vendeur',
    label: 'Pipelines',
    icon: FolderKanbanIcon,
    match: (p) => p.startsWith('/dashboard/pipelines'),
  },
  {
    href: '/dashboard/assistant',
    label: 'Assistant',
    icon: MessageCircleIcon,
    match: (p) => p.startsWith('/dashboard/assistant'),
  },
]

// 4e raccourci : Mandats pour Hevrest, Estimations pour une agence cliente
// (qui n'a pas accès à la génération de mandats — voir migration 058) —
// jamais un slot vide plutôt que de retirer le raccourci sans remplacement.
const MANDATES_TARGET: NavTarget = {
  href: '/dashboard/mandates',
  label: 'Mandats',
  icon: FileTextIcon,
  match: (p) => p.startsWith('/dashboard/mandates'),
}
const ESTIMATIONS_TARGET: NavTarget = {
  href: '/dashboard/estimations',
  label: 'Estimations',
  icon: CalculatorIcon,
  match: (p) => p.startsWith('/dashboard/estimations'),
}

export default function MobileBottomNav({ isInterne }: { isInterne: boolean }) {
  const pathname = usePathname()
  const { setOpen } = useMobileNav()
  const TARGETS = [...BASE_TARGETS, isInterne ? MANDATES_TARGET : ESTIMATIONS_TARGET]

  return (
    <nav
      aria-label="Navigation principale"
      className="fixed inset-x-0 bottom-0 z-40 flex border-t border-neutral-200 bg-surface md:hidden"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      {TARGETS.map((t) => {
        const active = t.match(pathname)
        return (
          <Link
            key={t.href}
            href={t.href}
            aria-current={active ? 'page' : undefined}
            className={`flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] font-medium ${
              active ? 'text-accent' : 'text-neutral-500'
            }`}
          >
            <t.icon className="h-5 w-5" strokeWidth={active ? 2 : 1.75} aria-hidden="true" />
            {t.label}
          </Link>
        )
      })}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] font-medium text-neutral-500"
      >
        <MenuIcon className="h-5 w-5" strokeWidth={1.75} aria-hidden="true" />
        Plus
      </button>
    </nav>
  )
}
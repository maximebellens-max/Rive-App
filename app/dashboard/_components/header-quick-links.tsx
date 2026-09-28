'use client'

// Accès rapide aux 2 pages ouvertes le plus souvent, directement dans
// l'en-tête plutôt que de devoir repérer leur lien dans le menu latéral (ou
// ouvrir le tiroir complet) — même idée que la barre de raccourcis mobile
// (mobile-bottom-nav.tsx), version desktop. Visible uniquement à partir de
// md : en dessous, la barre du bas joue ce rôle.
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboardIcon, MessageCircleIcon, type IconProps } from './icons'

type QuickLink = {
  href: string
  label: string
  icon: (props: IconProps) => React.ReactElement
  match: (pathname: string) => boolean
}

const LINKS: QuickLink[] = [
  { href: '/dashboard', label: 'Aujourd’hui', icon: LayoutDashboardIcon, match: (p) => p === '/dashboard' },
  {
    href: '/dashboard/assistant',
    label: 'Assistant IA',
    icon: MessageCircleIcon,
    match: (p) => p.startsWith('/dashboard/assistant'),
  },
]

export default function HeaderQuickLinks() {
  const pathname = usePathname()

  return (
    <div className="hidden items-center gap-1 md:flex">
      {LINKS.map((l) => {
        const active = l.match(pathname)
        return (
          <Link
            key={l.href}
            href={l.href}
            title={l.label}
            aria-label={l.label}
            aria-current={active ? 'page' : undefined}
            className={`flex h-10 w-10 items-center justify-center rounded-lg transition ${
              active ? 'bg-accent/10 text-accent' : 'text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900'
            }`}
          >
            <l.icon className="h-[18px] w-[18px]" strokeWidth={1.75} aria-hidden="true" />
          </Link>
        )
      })}
    </div>
  )
}
'use client'

// Menu latéral principal — même logique visuelle que le menu des réglages
// (app/dashboard/settings/settings-shell.tsx) : icône + libellé, lien actif
// mis en valeur par un fond teinté plutôt qu'un simple survol. Extrait en
// composant client (contrairement à avant) car l'état "actif" dépend de
// l'URL courante, connue seulement côté client via usePathname.
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboardIcon,
  MapPinIcon,
  TrendingUpIcon,
  MegaphoneIcon,
  UsersIcon,
  HomeIcon,
  BriefcaseIcon,
  CalculatorIcon,
  FileTextIcon,
  EuroIcon,
  Building2Icon,
  KeyIcon,
  SofaIcon,
  UtensilsCrossedIcon,
  HammerIcon,
  ContactIcon,
  LayoutTemplateIcon,
  FolderKanbanIcon,
  PlusIcon,
  type IconProps,
} from './_components/icons'

type NavLink = { href: string; label: string; icon: (props: IconProps) => React.ReactElement }
type NavGroup = { label: string; links: NavLink[] }

const NAV_GROUPS: NavGroup[] = [
  {
    label: 'Vue d’ensemble',
    links: [
      { href: '/dashboard', label: 'Aujourd’hui', icon: LayoutDashboardIcon },
      { href: '/dashboard/sectors', label: 'Secteurs', icon: MapPinIcon },
      { href: '/dashboard/performance', label: 'Performance', icon: TrendingUpIcon },
      { href: '/dashboard/campaigns', label: 'Campagnes', icon: MegaphoneIcon },
    ],
  },
  {
    label: 'Pipelines',
    links: [
      { href: '/dashboard/pipelines/vendeur', label: 'Vendeurs', icon: UsersIcon },
      { href: '/dashboard/pipelines/acheteur', label: 'Acheteurs', icon: HomeIcon },
      { href: '/dashboard/pipelines/investisseur', label: 'Investisseurs', icon: BriefcaseIcon },
    ],
  },
  {
    label: 'Gestion',
    links: [
      { href: '/dashboard/estimations', label: 'Estimations', icon: CalculatorIcon },
      { href: '/dashboard/mandates', label: 'Mandats', icon: FileTextIcon },
      { href: '/dashboard/commissions', label: 'Commissions', icon: EuroIcon },
      { href: '/dashboard/investments', label: 'Projets investisseur', icon: Building2Icon },
      { href: '/dashboard/locations', label: 'Location', icon: KeyIcon },
    ],
  },
  {
    label: 'Suivi chantiers',
    links: [
      { href: '/dashboard/ameublement', label: 'Ameublement', icon: SofaIcon },
      { href: '/dashboard/cuisine', label: 'Cuisine', icon: UtensilsCrossedIcon },
      { href: '/dashboard/travaux', label: 'Travaux', icon: HammerIcon },
    ],
  },
  {
    label: 'Outils',
    links: [
      { href: '/dashboard/partners', label: 'Contacts pro', icon: ContactIcon },
      { href: '/dashboard/templates', label: 'Modèles', icon: LayoutTemplateIcon },
    ],
  },
]

function isActive(pathname: string, href: string): boolean {
  if (href === '/dashboard') return pathname === '/dashboard'
  return pathname === href || pathname.startsWith(`${href}/`)
}

function NavItem({ href, label, icon: Icon, active }: NavLink & { active: boolean }) {
  return (
    <Link
      href={href}
      aria-current={active ? 'page' : undefined}
      className={`flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition-colors ${
        active
          ? 'bg-accent/10 font-medium text-accent'
          : 'text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900'
      }`}
    >
      <Icon className="h-4 w-4 shrink-0" strokeWidth={1.75} aria-hidden="true" />
      <span className="truncate">{label}</span>
    </Link>
  )
}

export default function SidebarNav({
  customBoards,
  createBoard,
}: {
  customBoards: { id: string; name: string }[]
  createBoard: (formData: FormData) => void | Promise<void>
}) {
  const pathname = usePathname()

  return (
    <>
      {NAV_GROUPS.map((group) => (
        <div key={group.label} className="flex flex-col gap-1">
          <span className="px-2.5 text-xs font-semibold uppercase tracking-wide text-neutral-400">
            {group.label}
          </span>
          {group.links.map((link) => (
            <NavItem key={link.href} {...link} active={isActive(pathname, link.href)} />
          ))}
        </div>
      ))}
      <div className="flex flex-col gap-1">
        <span className="px-2.5 text-xs font-semibold uppercase tracking-wide text-neutral-400">
          Tableaux personnalisés
        </span>
        {customBoards.map((board) => (
          <NavItem
            key={board.id}
            href={`/dashboard/pipelines/${board.id}`}
            label={board.name}
            icon={FolderKanbanIcon}
            active={isActive(pathname, `/dashboard/pipelines/${board.id}`)}
          />
        ))}
        <form action={createBoard} className="flex gap-1 px-2.5 pt-1">
          <input
            name="name"
            placeholder="Nouveau tableau…"
            aria-label="Nom du nouveau tableau"
            className="min-w-0 flex-1 rounded-lg border border-neutral-200 px-2 py-1 text-xs outline-none focus:border-accent"
          />
          <button
            type="submit"
            aria-label="Créer le tableau"
            className="flex shrink-0 items-center justify-center rounded-lg border border-neutral-200 px-2 py-1 text-neutral-600 hover:bg-neutral-100"
          >
            <PlusIcon className="h-3.5 w-3.5" strokeWidth={2} aria-hidden="true" />
          </button>
        </form>
      </div>
    </>
  )
}
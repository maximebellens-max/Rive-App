import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getAuthedProfile } from '@/lib/supabase/session'
import { logout } from '@/app/actions/auth'
import { createBoard } from '@/app/actions/boards'

const NAV_GROUPS: { label: string; links: { href: string; label: string }[] }[] = [
  {
    label: 'Vue d’ensemble',
    links: [
      { href: '/dashboard', label: 'Aujourd’hui' },
      { href: '/dashboard/prospects', label: 'Prospects' },
      { href: '/dashboard/sectors', label: 'Secteurs' },
      { href: '/dashboard/performance', label: 'Performance' },
    ],
  },
  {
    label: 'Pipelines',
    links: [
      { href: '/dashboard/pipelines/vendeur', label: 'Vendeurs' },
      { href: '/dashboard/pipelines/acheteur', label: 'Acheteurs' },
      { href: '/dashboard/pipelines/investisseur', label: 'Investisseurs' },
    ],
  },
  {
    label: 'Gestion',
    links: [
      { href: '/dashboard/mandates', label: 'Mandats' },
      { href: '/dashboard/commissions', label: 'Commissions' },
    ],
  },
  {
    label: 'Outils',
    links: [
      { href: '/dashboard/partners', label: 'Contacts pro' },
      { href: '/dashboard/templates', label: 'Modèles' },
    ],
  },
]

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { supabase, user, profile } = await getAuthedProfile()

  if (!user) {
    redirect('/login')
  }

  const agencyName = (profile?.agencies as unknown as { name: string } | null)?.name

  const { data: customBoards } = profile?.agency_id
    ? await supabase
        .from('boards')
        .select('id, name')
        .eq('agency_id', profile.agency_id)
        .eq('kind', 'custom')
        .order('position', { ascending: true })
    : { data: [] as { id: string; name: string }[] }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-neutral-200 bg-white">
        <div className="flex items-center justify-between px-4 py-3">
          <Link href="/dashboard" className="text-lg font-semibold tracking-tight">
            Rive
          </Link>
          <div className="flex items-center gap-3 text-sm text-neutral-500">
            <Link href="/dashboard/settings" className="hover:text-neutral-900">
              Réglages
            </Link>
            <span>
              {profile?.full_name || user.email}
              {agencyName ? ` · ${agencyName}` : ''}
            </span>
            <form action={logout}>
              <button
                type="submit"
                className="rounded-lg border border-neutral-300 px-3 py-1.5 text-neutral-700 hover:bg-neutral-100"
              >
                Déconnexion
              </button>
            </form>
          </div>
        </div>
      </header>
      <div className="mx-auto flex w-full max-w-7xl flex-1 gap-8 px-4 py-8">
        <aside className="hidden w-48 shrink-0 flex-col gap-6 md:flex">
          {NAV_GROUPS.map((group) => (
            <div key={group.label} className="flex flex-col gap-1">
              <span className="px-2 text-xs font-semibold uppercase tracking-wide text-neutral-400">
                {group.label}
              </span>
              {group.links.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="rounded-lg px-2 py-1.5 text-sm text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          ))}
          <div className="flex flex-col gap-1">
            <span className="px-2 text-xs font-semibold uppercase tracking-wide text-neutral-400">
              Tableaux personnalisés
            </span>
            {(customBoards ?? []).map((board) => (
              <Link
                key={board.id}
                href={`/dashboard/pipelines/${board.id}`}
                className="truncate rounded-lg px-2 py-1.5 text-sm text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900"
              >
                {board.name}
              </Link>
            ))}
            <form action={createBoard} className="flex gap-1 px-2 pt-1">
              <input
                name="name"
                placeholder="Nouveau tableau…"
                aria-label="Nom du nouveau tableau"
                className="min-w-0 flex-1 rounded-lg border border-neutral-200 px-2 py-1 text-xs outline-none focus:border-accent"
              />
              <button
                type="submit"
                aria-label="Créer le tableau"
                className="shrink-0 rounded-lg border border-neutral-200 px-2 py-1 text-xs font-medium text-neutral-600 hover:bg-neutral-100"
              >
                +
              </button>
            </form>
          </div>
        </aside>
        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  )
}

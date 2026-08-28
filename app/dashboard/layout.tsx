import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { logout } from '@/app/actions/auth'

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
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, agencies ( name )')
    .eq('id', user.id)
    .single()

  const agencyName = (profile?.agencies as unknown as { name: string } | null)?.name

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
        </aside>
        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  )
}

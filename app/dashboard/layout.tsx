import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { logout } from '@/app/actions/auth'

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
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-6">
            <Link href="/dashboard" className="text-lg font-semibold tracking-tight">
              Rive
            </Link>
            <nav className="flex items-center gap-4 text-sm text-neutral-600">
              <Link href="/dashboard" className="hover:text-neutral-900">
                Aperçu
              </Link>
              <Link href="/dashboard/prospects" className="hover:text-neutral-900">
                Prospects
              </Link>
              <Link href="/dashboard/mandates" className="hover:text-neutral-900">
                Mandats
              </Link>
            </nav>
          </div>
          <div className="flex items-center gap-3 text-sm text-neutral-500">
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
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">{children}</main>
    </div>
  )
}

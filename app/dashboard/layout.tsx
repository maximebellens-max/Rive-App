import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getAuthedProfile } from '@/lib/supabase/session'
import { logout } from '@/app/actions/auth'
import { createBoard } from '@/app/actions/boards'
import NotificationBell, { type NotificationItem } from './notification-bell'
import ThemeToggle from './theme-toggle'
import SidebarNav from './sidebar-nav'
import { MobileNavTrigger, MobileNavDrawer } from './mobile-nav'
import AccountMenu from './account-menu'
import InstallPrompt from './_components/install-prompt'
import GlobalSearch from './global-search'
import { MobileNavProvider } from './_components/mobile-nav-context'
import { ToastProvider } from './_components/toast'
import HeaderQuickLinks from './_components/header-quick-links'
import MobileBottomNav from './_components/mobile-bottom-nav'

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

  const { data: rawNotifications } = profile?.agency_id
    ? await supabase
        .from('notifications')
        .select('id, title, body, lead_id, mandate_id, read_by, created_at')
        .eq('agency_id', profile.agency_id)
        .order('created_at', { ascending: false })
        .limit(20)
    : {
        data: [] as {
          id: string
          title: string
          body: string
          lead_id: string | null
          mandate_id: string | null
          read_by: string[]
          created_at: string
        }[],
      }

  const notifications: NotificationItem[] = (rawNotifications ?? []).map((n) => ({
    id: n.id,
    title: n.title,
    body: n.body,
    lead_id: n.lead_id,
    mandate_id: n.mandate_id,
    created_at: n.created_at,
    read: (n.read_by ?? []).includes(user.id),
  }))

  return (
    <ToastProvider>
      <MobileNavProvider>
        <div className="flex min-h-screen flex-col">
          <header className="border-b border-neutral-200 bg-surface">
            <div className="flex items-center gap-3 px-4 py-3">
              <div className="flex shrink-0 items-center gap-1">
                <MobileNavTrigger />
                <Link href="/dashboard" className="text-lg font-semibold tracking-tight">
                  Rive
                </Link>
              </div>
              <GlobalSearch />
              <div className="flex shrink-0 items-center gap-2 text-sm text-neutral-500">
                <HeaderQuickLinks />
                <ThemeToggle />
                <NotificationBell notifications={notifications} />
                <AccountMenu
                  name={profile?.full_name || ''}
                  email={user.email || ''}
                  agencyName={agencyName}
                  avatarUrl={profile?.avatar_url}
                  logoutAction={logout}
                />
              </div>
            </div>
          </header>
          <MobileNavDrawer customBoards={customBoards ?? []} createBoard={createBoard} />
          <div className="mx-auto w-full max-w-7xl px-4 pt-4">
            <InstallPrompt />
          </div>
          <div className="mx-auto flex w-full max-w-7xl flex-1 gap-8 px-4 pt-8 pb-24 md:pb-8">
            <aside className="hidden w-52 shrink-0 flex-col gap-6 md:flex">
              <SidebarNav customBoards={customBoards ?? []} createBoard={createBoard} />
            </aside>
            <main className="min-w-0 flex-1">{children}</main>
          </div>
          <MobileBottomNav />
        </div>
      </MobileNavProvider>
    </ToastProvider>
  )
}
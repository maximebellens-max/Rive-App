import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'

export default async function DashboardPage() {
  const supabase = await createClient()

  const { count: leadsCount } = await supabase
    .from('leads')
    .select('*', { count: 'exact', head: true })

  const { count: mandatesCount } = await supabase
    .from('mandates')
    .select('*', { count: 'exact', head: true })
    .eq('stage', 'en_cours')

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Aperçu</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Vue d&apos;ensemble de ton activité.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Link
          href="/dashboard/prospects"
          className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm transition hover:border-neutral-300"
        >
          <p className="text-sm text-neutral-500">Prospects</p>
          <p className="mt-2 text-3xl font-semibold tabular-nums">
            {leadsCount ?? 0}
          </p>
        </Link>

        <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
          <p className="text-sm text-neutral-500">Mandats en cours</p>
          <p className="mt-2 text-3xl font-semibold tabular-nums">
            {mandatesCount ?? 0}
          </p>
        </div>
      </div>
    </div>
  )
}

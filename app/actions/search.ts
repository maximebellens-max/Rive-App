'use server'

// Recherche globale (voir app/dashboard/global-search.tsx) : un seul champ
// dans l'en-tête pour retrouver un prospect, un mandat ou un contact pro
// sans savoir dans quelle section il est rangé. Volontairement limité à ces
// 3 tables pour l'instant — un projet investisseur ou un bien géré se
// retrouve via le prospect auquel il est rattaché.
import { createClient } from '@/lib/supabase/server'
import { CATEGORY_LABEL } from '@/lib/rive/pipelines'

export type SearchResult = {
  kind: 'lead' | 'mandate' | 'partner'
  id: string
  title: string
  subtitle: string
  href: string
}

async function getAgencyId() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { supabase, agencyId: null }

  const { data: profile } = await supabase.from('profiles').select('agency_id').eq('id', user.id).single()
  return { supabase, agencyId: profile?.agency_id ?? null }
}

export async function globalSearch(query: string): Promise<SearchResult[]> {
  const q = query.trim()
  if (q.length < 2) return []

  const { supabase, agencyId } = await getAgencyId()
  if (!agencyId) return []

  const pattern = `%${q}%`

  const [{ data: leads }, { data: mandates }, { data: partners }] = await Promise.all([
    supabase
      .from('leads')
      .select('id, name, category, phone, email')
      .eq('agency_id', agencyId)
      .or(`name.ilike.${pattern},phone.ilike.${pattern},email.ilike.${pattern}`)
      .limit(6),
    supabase
      .from('mandates')
      .select('id, address, type, stage')
      .eq('agency_id', agencyId)
      .ilike('address', pattern)
      .limit(5),
    supabase.from('partners').select('id, name, role, phone').ilike('name', pattern).limit(5),
  ])

  const results: SearchResult[] = []

  for (const l of leads ?? []) {
    results.push({
      kind: 'lead',
      id: l.id,
      title: l.name,
      subtitle: [l.category ? CATEGORY_LABEL[l.category] ?? l.category : null, l.phone || l.email]
        .filter(Boolean)
        .join(' · '),
      href: `/dashboard/prospects/${l.id}`,
    })
  }

  for (const m of mandates ?? []) {
    results.push({
      kind: 'mandate',
      id: m.id,
      title: m.address || 'Mandat sans adresse',
      subtitle: [m.type === 'vente' ? 'Mandat de vente' : 'Mandat de recherche', m.stage].filter(Boolean).join(' · '),
      href: `/dashboard/mandates/${m.id}`,
    })
  }

  for (const p of partners ?? []) {
    results.push({
      kind: 'partner',
      id: p.id,
      title: p.name,
      subtitle: [p.role, p.phone].filter(Boolean).join(' · '),
      href: `/dashboard/partners`,
    })
  }

  return results
}
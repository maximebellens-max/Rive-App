'use server'

// Actions réservées à la page /dashboard/admin (toi seul — voir migration
// 058 et lib/rive/access.ts). Chaque action revérifie isPlatformAdmin elle-
// même plutôt que de faire confiance au garde-fou déjà posé par la page :
// une Server Action est un point d'entrée HTTP à part entière, appelable
// indépendamment du rendu de la page qui l'a affichée.
import { revalidatePath } from 'next/cache'
import { getAccessContext } from '@/lib/rive/access'
import { createAdminClient } from '@/lib/supabase/admin'
import { isAgencyModule, type AgencyModule } from '@/lib/rive/billing/modules'

export async function toggleAgencyModule(agencyId: string, moduleKey: string, enabled: boolean) {
  const { isPlatformAdmin } = await getAccessContext()
  if (!isPlatformAdmin) return
  if (!isAgencyModule(moduleKey)) return

  const admin = createAdminClient()

  const { data: agency } = await admin.from('agencies').select('enabled_modules').eq('id', agencyId).single()
  if (!agency) return

  const current = new Set<AgencyModule>((agency.enabled_modules ?? []) as AgencyModule[])
  if (enabled) current.add(moduleKey)
  else current.delete(moduleKey)

  await admin
    .from('agencies')
    .update({ enabled_modules: Array.from(current) })
    .eq('id', agencyId)

  revalidatePath('/dashboard/admin')
}
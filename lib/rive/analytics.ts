// Vues Secteurs & Performance, reprises à l'identique du prototype Rive.

// Heuristique volontairement simple (pas d'accès à un fond de carte externe) :
// le secteur d'une adresse est son dernier segment séparé par une virgule.
export function extractSector(address: string | null | undefined): string | null {
  if (!address) return null
  const parts = address.split(',')
  const last = parts[parts.length - 1]?.trim()
  return last || null
}

function tokenizeLieu(critereLieu: string | null | undefined): string[] {
  if (!critereLieu) return []
  return critereLieu
    .split(/[,;/]/)
    .map((t) => t.trim())
    .filter(Boolean)
}

export type SectorStat = { sector: string; biens: number; recherches: number; total: number }

export function sectorStats(
  activeVenteMandates: { address: string | null }[],
  searchLeads: { critere_lieu: string | null }[]
): SectorStat[] {
  const stats = new Map<string, { biens: number; recherches: number }>()

  for (const m of activeVenteMandates) {
    const sector = extractSector(m.address)
    if (!sector) continue
    const entry = stats.get(sector) ?? { biens: 0, recherches: 0 }
    entry.biens += 1
    stats.set(sector, entry)
  }

  const sectors = Array.from(stats.keys())
  for (const lead of searchLeads) {
    const tokens = tokenizeLieu(lead.critere_lieu).map((t) => t.toLowerCase())
    if (!tokens.length) continue
    for (const sector of sectors) {
      if (tokens.includes(sector.toLowerCase())) {
        const entry = stats.get(sector)!
        entry.recherches += 1
      }
    }
  }

  return Array.from(stats.entries())
    .map(([sector, { biens, recherches }]) => ({ sector, biens, recherches, total: biens + recherches }))
    .sort((a, b) => b.total - a.total)
}

export const SOURCE_OPTIONS = ['Meta Ads', 'Google Ads', 'Portail immobilier', 'Recommandation', 'Site web', 'Réseau', 'Autre']

export type SourceStat = { source: string; leads: number; mandates: number; conversion: number; commissions: number }

export function sourcePerformance(
  leads: { id: string; source: string | null }[],
  mandates: { lead_id: string | null; stage: string; is_draft: boolean }[],
  commissionsByMandateLead: Map<string, number>
): SourceStat[] {
  const bySource = new Map<string, { leadIds: Set<string>; leads: number }>()

  for (const lead of leads) {
    const source = lead.source && lead.source.trim() ? lead.source.trim() : 'Non renseigné'
    const entry = bySource.get(source) ?? { leadIds: new Set(), leads: 0 }
    entry.leadIds.add(lead.id)
    entry.leads += 1
    bySource.set(source, entry)
  }

  const signedMandatesByLead = new Set(mandates.filter((m) => !m.is_draft && m.lead_id).map((m) => m.lead_id as string))

  return Array.from(bySource.entries())
    .map(([source, { leadIds, leads: leadCount }]) => {
      const mandatesCount = Array.from(leadIds).filter((id) => signedMandatesByLead.has(id)).length
      const commissions = Array.from(leadIds).reduce((sum, id) => sum + (commissionsByMandateLead.get(id) ?? 0), 0)
      return {
        source,
        leads: leadCount,
        mandates: mandatesCount,
        conversion: leadCount ? Math.round((mandatesCount / leadCount) * 100) : 0,
        commissions,
      }
    })
    .sort((a, b) => b.leads - a.leads)
}

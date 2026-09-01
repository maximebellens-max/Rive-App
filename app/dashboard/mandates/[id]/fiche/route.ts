import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { formatEUR } from '@/lib/rive/mandates'

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function slugify(s: string): string {
  return (
    s
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '') || 'bien'
  )
}

export async function GET(_request: Request, ctx: RouteContext<'/dashboard/mandates/[id]/fiche'>) {
  const { id } = await ctx.params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return new NextResponse('Unauthorized', { status: 401 })

  const { data: mandate } = await supabase.from('mandates').select('*').eq('id', id).single()
  if (!mandate) return new NextResponse('Not found', { status: 404 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, agencies ( name )')
    .eq('id', user.id)
    .single()
  const agentName = profile?.full_name || ''
  const agencyName = (profile?.agencies as unknown as { name: string } | null)?.name || 'Rive'

  const features = (mandate.features as Record<string, boolean> | null) || {}
  const featureLabels: Record<string, string> = {
    balcon: 'Balcon',
    terrasse: 'Terrasse',
    jardin: 'Jardin',
    cave: 'Cave',
    garage: 'Garage',
    box: 'Box',
    dependance: 'Dépendance',
  }
  const featureList = Object.entries(features)
    .filter(([, v]) => v)
    .map(([k]) => featureLabels[k] || k)

  const html = `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8" />
<title>${esc(mandate.address || 'Fiche bien')}</title>
<style>
  body { font-family: Georgia, 'Times New Roman', serif; color: #2b2b28; max-width: 720px; margin: 0 auto; padding: 48px 32px; }
  header { border-bottom: 3px solid #2b2b28; padding-bottom: 16px; margin-bottom: 32px; display: flex; justify-content: space-between; align-items: baseline; }
  header h1 { margin: 0; font-size: 20px; letter-spacing: 0.05em; }
  h2 { font-size: 26px; margin: 0 0 4px; }
  .price { font-size: 22px; margin: 0 0 24px; }
  table { width: 100%; border-collapse: collapse; margin: 16px 0; }
  td { padding: 8px 0; border-bottom: 1px solid #e3e0d8; font-size: 15px; }
  td:first-child { color: #6b6a64; width: 40%; }
  .notes { margin-top: 24px; font-size: 15px; line-height: 1.6; }
  footer { margin-top: 48px; border-top: 1px solid #e3e0d8; padding-top: 16px; font-size: 12px; color: #6b6a64; }
</style>
</head>
<body>
  <header>
    <h1>${esc(agencyName)}</h1>
    <span>${esc(agentName)}</span>
  </header>

  <h2>${esc(mandate.property_type || 'Bien')}</h2>
  <p style="color:#6b6a64; margin-top: 0;">${esc(mandate.address || '')}</p>
  <p class="price">${mandate.price ? formatEUR(mandate.price) : 'Prix sur demande'}</p>

  <table>
    <tr><td>Surface</td><td>${mandate.surface ?? '—'} m²</td></tr>
    ${mandate.land_surface ? `<tr><td>Terrain</td><td>${mandate.land_surface} m²</td></tr>` : ''}
    <tr><td>Pièces</td><td>${mandate.pieces ?? '—'}</td></tr>
    <tr><td>Étage</td><td>${mandate.floor ?? '—'} ${mandate.has_elevator ? '(avec ascenseur)' : ''}</td></tr>
    <tr><td>DPE</td><td>${esc(mandate.dpe || '—')}</td></tr>
    ${mandate.year_built ? `<tr><td>Année de construction</td><td>${mandate.year_built}</td></tr>` : ''}
    ${featureList.length ? `<tr><td>Prestations</td><td>${esc(featureList.join(', '))}</td></tr>` : ''}
  </table>

  ${mandate.notes ? `<div class="notes">${esc(mandate.notes).replace(/\n/g, '<br/>')}</div>` : ''}

  <footer>
    Document non contractuel — ${esc(agencyName)}${agentName ? ` · ${esc(agentName)}` : ''}
  </footer>
</body>
</html>`

  return new NextResponse(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Content-Disposition': `attachment; filename="fiche-bien-${slugify(mandate.address || mandate.property_type || 'bien')}.html"`,
    },
  })
}
import { NextResponse, type NextRequest } from 'next/server'
import { renderToBuffer } from '@react-pdf/renderer'
import { createClient } from '@/lib/supabase/server'
import { MandateDocument } from '@/lib/rive/mandate-pdf'

export async function GET(
  _request: NextRequest,
  ctx: RouteContext<'/dashboard/mandates/[id]/pdf'>
) {
  const { id } = await ctx.params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return new NextResponse('Non autorisé', { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('agency_id')
    .eq('id', user.id)
    .single()
  if (!profile?.agency_id) return new NextResponse('Agence introuvable', { status: 404 })

  const { data: agency } = await supabase.from('agencies').select('*').eq('id', profile.agency_id).single()
  const { data: mandate } = await supabase.from('mandates').select('*').eq('id', id).single()
  if (!agency || !mandate) return new NextResponse('Mandat introuvable', { status: 404 })

  const { data: parties } = await supabase
    .from('mandate_parties')
    .select('*')
    .eq('mandate_id', id)
    .order('position', { ascending: true })

  // Attribue le numéro de registre des mandats à la première génération (idempotent ensuite).
  let mandateNumber = mandate.mandate_number
  if (!mandateNumber) {
    const { data, error } = await supabase.rpc('assign_mandate_number', { p_mandate_id: id })
    if (!error) mandateNumber = data
  }

  const buffer = await renderToBuffer(
    MandateDocument({
      agency,
      mandate: { ...mandate, mandate_number: mandateNumber },
      parties: parties ?? [],
    })
  )

  const filename = `mandat-${mandateNumber ?? 'brouillon'}.pdf`

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}

// Même logique que l'action serveur uploadMandateFile (app/actions/mandate-property.ts),
// exposée ici en route API pour permettre un upload en XMLHttpRequest côté client avec
// barre de progression (voir mandate-files-section.tsx) — un <form action={...}> vers une
// Server Action ne déclenche aucun évènement de progression exploitable, une requête XHR
// classique oui (upload.onprogress).
import { NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { saveMandateFile, type MandateFileCategory } from '@/lib/rive/mandate-files'

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: mandateId } = await params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ ok: false, error: 'Non authentifié.' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('agency_id').eq('id', user.id).single()
  const agencyId = profile?.agency_id ?? null
  if (!agencyId) return NextResponse.json({ ok: false, error: 'Agence introuvable.' }, { status: 403 })

  const formData = await request.formData()
  const file = formData.get('file')
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ ok: false, error: 'Aucun fichier reçu.' }, { status: 400 })
  }

  const category: MandateFileCategory = String(formData.get('category') || '') === 'document' ? 'document' : 'photo'
  const diagnosticType = category === 'document' ? String(formData.get('diagnostic_type') || '').trim() || null : null
  const label = String(formData.get('label') || '').trim() || file.name

  const result = await saveMandateFile(supabase, {
    agencyId,
    mandateId,
    userId: user.id,
    file,
    category,
    diagnosticType,
    label,
  })
  if (!result.ok) return NextResponse.json(result, { status: 500 })

  revalidatePath(`/dashboard/mandates/${mandateId}`)
  return NextResponse.json({ ok: true })
}
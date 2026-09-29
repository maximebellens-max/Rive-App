import type { SupabaseClient } from '@supabase/supabase-js'

// Bucket de stockage privé créé par la migration 00000000000045 — jamais
// public, l'accès passe toujours par une URL signée générée côté serveur
// (voir mandateFileUrl dans app/actions/mandate-property.ts).
export const MANDATE_FILES_BUCKET = 'mandate-files'

export type MandateFileCategory = 'photo' | 'document'

// Logique d'enregistrement d'un fichier de mandat, partagée entre :
// - l'action serveur uploadMandateFile (formulaire classique, sans JS) ;
// - la route API /api/mandates/[id]/files (upload XHR avec barre de
//   progression, voir mandate-files-section.tsx) — un <form action={...}>
//   ne donne aucun événement de progression, une requête XHR classique oui.
// {agency_id}/{mandate_id}/{uuid}{extension} ; la table ne garde que les
// métadonnées.
export async function saveMandateFile(
  supabase: SupabaseClient,
  params: {
    agencyId: string
    mandateId: string
    userId: string | null
    file: File
    category: MandateFileCategory
    diagnosticType: string | null
    label: string
  }
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { agencyId, mandateId, userId, file, category, diagnosticType, label } = params

  const dot = file.name.lastIndexOf('.')
  const ext = dot >= 0 ? file.name.slice(dot) : ''
  const storagePath = `${agencyId}/${mandateId}/${crypto.randomUUID()}${ext}`

  const { error: uploadError } = await supabase.storage
    .from(MANDATE_FILES_BUCKET)
    .upload(storagePath, file, { contentType: file.type || undefined })
  if (uploadError) {
    console.error('[mandate-files] Échec de l’upload :', uploadError)
    return { ok: false, error: "Échec de l'envoi du fichier." }
  }

  const { count } = await supabase
    .from('mandate_files')
    .select('*', { count: 'exact', head: true })
    .eq('mandate_id', mandateId)
    .eq('category', category)

  const { error: insertError } = await supabase.from('mandate_files').insert({
    agency_id: agencyId,
    mandate_id: mandateId,
    category,
    diagnostic_type: diagnosticType,
    label,
    storage_path: storagePath,
    content_type: file.type || null,
    size_bytes: file.size,
    position: count ?? 0,
    uploaded_by: userId,
  })
  if (insertError) {
    console.error('[mandate-files] Échec de l’enregistrement :', insertError)
    return { ok: false, error: "Échec de l'enregistrement du fichier." }
  }

  return { ok: true }
}
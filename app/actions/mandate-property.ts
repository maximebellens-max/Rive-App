'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { DIAGNOSTIC_TYPES, type Diagnostics, type Copropriete, type OriginePropriete } from '@/lib/rive/mandates'

// Bucket de stockage privé créé par la migration 00000000000045 — jamais
// public, l'accès passe toujours par une URL signée générée côté serveur
// (voir mandateFileUrl ci-dessous, utilisée par la page fiche mandat).
const BUCKET = 'mandate-files'

function str(formData: FormData, key: string): string {
  return String(formData.get(key) || '').trim()
}

async function getAgencyId() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { supabase, agencyId: null, userId: null }

  const { data: profile } = await supabase.from('profiles').select('agency_id').eq('id', user.id).single()

  return { supabase, agencyId: profile?.agency_id ?? null, userId: user.id }
}

// ---------- Copropriété, origine de propriété, diagnostics ----------
// Un seul formulaire, un seul enregistrement (comme MandateEditForm) plutôt
// que 3 formulaires séparés — ces informations n'ont pas de raison d'être
// modifiées indépendamment les unes des autres.
export async function updateMandateProperty(mandateId: string, formData: FormData) {
  const { supabase, agencyId } = await getAgencyId()
  if (!agencyId) return

  const copropriete: Copropriete = {
    total_lots: str(formData, 'copro_total_lots'),
    charges_annuelles: str(formData, 'copro_charges_annuelles'),
    syndic_nom: str(formData, 'copro_syndic_nom'),
    syndic_contact: str(formData, 'copro_syndic_contact'),
    procedures_en_cours: str(formData, 'copro_procedures_en_cours'),
    fonds_travaux: str(formData, 'copro_fonds_travaux'),
  }

  const origine: OriginePropriete = {
    date_acquisition: str(formData, 'origine_date_acquisition'),
    mode_acquisition: str(formData, 'origine_mode_acquisition'),
    notaire: str(formData, 'origine_notaire'),
    reference_acte: str(formData, 'origine_reference_acte'),
    prix_acquisition: str(formData, 'origine_prix_acquisition'),
  }

  const diagnostics: Diagnostics = {}
  for (const d of DIAGNOSTIC_TYPES) {
    const entry = {
      date_realisation: str(formData, `diag_${d.key}_date_realisation`),
      date_validite: str(formData, `diag_${d.key}_date_validite`),
      resultat: str(formData, `diag_${d.key}_resultat`),
    }
    if (entry.date_realisation || entry.date_validite || entry.resultat) {
      diagnostics[d.key] = entry
    }
  }

  await supabase
    .from('mandates')
    .update({
      en_copropriete: formData.get('en_copropriete') === 'on',
      copropriete,
      origine_propriete: origine,
      diagnostics,
      updated_at: new Date().toISOString(),
    })
    .eq('id', mandateId)

  revalidatePath(`/dashboard/mandates/${mandateId}`)
}

// ---------- Lots de copropriété ----------
// Un mandat peut porter plusieurs lots (l'appartement + une cave, un
// parking…), chacun ajouté/retiré indépendamment — comme les mandants sur
// PartiesSection.
export async function addMandateLot(mandateId: string, formData: FormData) {
  const { supabase, agencyId } = await getAgencyId()
  if (!agencyId) return

  const { count } = await supabase
    .from('mandate_lots')
    .select('*', { count: 'exact', head: true })
    .eq('mandate_id', mandateId)

  await supabase.from('mandate_lots').insert({
    agency_id: agencyId,
    mandate_id: mandateId,
    position: count ?? 0,
    lot_number: str(formData, 'lot_number'),
    designation: str(formData, 'designation'),
    tantiemes: str(formData, 'tantiemes'),
  })

  revalidatePath(`/dashboard/mandates/${mandateId}`)
}

export async function removeMandateLot(mandateId: string, lotId: string) {
  const { supabase, agencyId } = await getAgencyId()
  if (!agencyId) return

  await supabase.from('mandate_lots').delete().eq('id', lotId)
  revalidatePath(`/dashboard/mandates/${mandateId}`)
}

// ---------- Photos & documents ----------
// Le fichier lui-même va dans le bucket de stockage privé "mandate-files"
// (jamais accessible directement — voir mandateFileUrl), sous
// {agency_id}/{mandate_id}/{uuid}{extension} ; cette table ne garde que les
// métadonnées. Un document peut être rattaché à un diagnostic précis
// (diagnostic_type) pour retrouver son justificatif depuis la fiche
// diagnostic correspondante — pas les photos, qui n'en ont pas besoin.
export async function uploadMandateFile(mandateId: string, formData: FormData) {
  const { supabase, agencyId, userId } = await getAgencyId()
  if (!agencyId) return

  const file = formData.get('file')
  if (!(file instanceof File) || file.size === 0) return

  const category = str(formData, 'category') === 'document' ? 'document' : 'photo'
  const diagnosticType = category === 'document' ? str(formData, 'diagnostic_type') || null : null
  const label = str(formData, 'label') || file.name

  const dot = file.name.lastIndexOf('.')
  const ext = dot >= 0 ? file.name.slice(dot) : ''
  const storagePath = `${agencyId}/${mandateId}/${crypto.randomUUID()}${ext}`

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(storagePath, file, { contentType: file.type || undefined })
  if (uploadError) {
    console.error('[mandate-files] Échec de l’upload :', uploadError)
    return
  }

  const { count } = await supabase
    .from('mandate_files')
    .select('*', { count: 'exact', head: true })
    .eq('mandate_id', mandateId)
    .eq('category', category)

  await supabase.from('mandate_files').insert({
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

  revalidatePath(`/dashboard/mandates/${mandateId}`)
}

export async function removeMandateFile(mandateId: string, fileId: string, storagePath: string) {
  const { supabase, agencyId } = await getAgencyId()
  if (!agencyId) return

  await supabase.storage.from(BUCKET).remove([storagePath])
  await supabase.from('mandate_files').delete().eq('id', fileId)
  revalidatePath(`/dashboard/mandates/${mandateId}`)
}

// URL signée à durée limitée (1h) pour afficher/télécharger un fichier
// privé — jamais d'URL publique directe sur ce bucket (voir migration
// 00000000000045). Renvoie null en silence si la génération échoue (fichier
// supprimé du bucket entre-temps, etc.) plutôt que de faire planter la page.
export async function mandateFileUrl(storagePath: string): Promise<string | null> {
  const supabase = await createClient()
  const { data } = await supabase.storage.from(BUCKET).createSignedUrl(storagePath, 3600)
  return data?.signedUrl ?? null
}
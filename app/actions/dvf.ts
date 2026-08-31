'use server'
 
import { createClient } from '@/lib/supabase/server'
import { searchDvf, type DvfRow, type DvfPropertyType } from '@/lib/rive/dvf-source'
 
export type DvfSearchState =
  | { error: string; results?: undefined; yearsQueried?: undefined }
  | { error?: undefined; results: DvfRow[]; yearsQueried: number[] }
  | undefined
 
const PROPERTY_TYPES: DvfPropertyType[] = ['Appartement', 'Maison', 'Tous']
 
export async function searchDvfComparables(
  _prevState: DvfSearchState,
  formData: FormData
): Promise<DvfSearchState> {
  // Donnée publique en lecture seule, mais on garde l'action derrière
  // l'authentification pour éviter qu'elle serve de proxy ouvert vers
  // files.data.gouv.fr.
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Session expirée, reconnecte-toi.' }
 
  const postalCode = String(formData.get('postal_code') || '').trim()
  const propertyTypeRaw = String(formData.get('property_type') || 'Tous')
  const propertyType = PROPERTY_TYPES.includes(propertyTypeRaw as DvfPropertyType)
    ? (propertyTypeRaw as DvfPropertyType)
    : 'Tous'
 
  const { rows, yearsQueried, error } = await searchDvf({ postalCode, propertyType })
  if (error) return { error }
  return { results: rows, yearsQueried }
}
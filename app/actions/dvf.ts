'use server'

import { createClient } from '@/lib/supabase/server'
import {
  searchDvf,
  searchDvfNearAddress,
  type DvfRow,
  type DvfRowWithDistance,
  type DvfPropertyType,
} from '@/lib/rive/dvf-source'

export type DvfSearchState =
  | { error: string; results?: undefined; yearsQueried?: undefined; radiusKm?: undefined }
  | { error?: undefined; results: (DvfRow | DvfRowWithDistance)[]; yearsQueried: number[]; radiusKm?: number }
  | undefined

const PROPERTY_TYPES: DvfPropertyType[] = ['Appartement', 'Maison', 'Tous']

export async function searchDvfComparables(
  _prevState: DvfSearchState,
  formData: FormData
): Promise<DvfSearchState> {
  // Donnée publique en lecture seule, mais on garde l'action derrière
  // l'authentification pour éviter qu'elle serve de proxy ouvert vers
  // files.data.gouv.fr / api-adresse.data.gouv.fr.
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Session expirée, reconnecte-toi.' }

  const propertyTypeRaw = String(formData.get('property_type') || 'Tous')
  const propertyType = PROPERTY_TYPES.includes(propertyTypeRaw as DvfPropertyType)
    ? (propertyTypeRaw as DvfPropertyType)
    : 'Tous'

  const address = String(formData.get('address') || '').trim()

  // Recherche par rayon autour de l'adresse exacte du bien quand elle est
  // connue : plus pertinente qu'un simple code postal, qui peut être très
  // étendu ou au contraire couper des rues limitrophes d'un même secteur.
  if (address) {
    const radiusKm = Number(formData.get('radius_km')) || 5
    const { rows, yearsQueried, error } = await searchDvfNearAddress({ address, propertyType, radiusKm })
    if (error) return { error }
    return { results: rows, yearsQueried, radiusKm }
  }

  const postalCode = String(formData.get('postal_code') || '').trim()
  const { rows, yearsQueried, error } = await searchDvf({ postalCode, propertyType })
  if (error) return { error }
  return { results: rows, yearsQueried }
}
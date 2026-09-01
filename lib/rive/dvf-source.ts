// Source des comparables DVF automatiques.
//
// DVF (Demandes de Valeurs Foncières) est la base officielle des ventes
// immobilières réellement enregistrées, publiée par la DGFiP sur
// data.gouv.fr. Le jeu de données national fait ~500 Mo (compressé) et
// n'est pas interrogeable via une API de requêtage — mais data.gouv.fr
// republie aussi, sous le même hébergement officiel (files.data.gouv.fr),
// des extraits CSV pré-découpés par département et par année ("geo-dvf"),
// bien plus légers. On va chercher ces extraits à la volée, on les filtre
// par code postal, et on les met en cache (revalidate) plutôt que de les
// stocker en base : les millésimes DVF ne sont republiés que deux fois par
// an, un cache de 24h est donc largement suffisant et la donnée reste
// toujours celle publiée officiellement.
//
// On ne gère pas ici les cas Corse (codes département "2A"/"2B") ni DOM
// (codes à 3 chiffres) : le marché de l'agence est frontalier
// franco-genevois (Haute-Savoie/Ain/Savoie), hors périmètre de ces cas.

import { gunzipSync } from 'zlib'

const GEO_DVF_BASE = 'https://files.data.gouv.fr/geo-dvf/latest/csv'
const CACHE_SECONDS = 60 * 60 * 24

export type DvfRow = {
  idMutation: string
  dateMutation: string | null
  valeurFonciere: number | null
  adresse: string
  codePostal: string
  nomCommune: string
  typeLocal: string
  surfaceReelleBati: number | null
  surfaceTerrain: number | null
  nombrePiecesPrincipales: number | null
  nombreLots: number | null
}

export type DvfPropertyType = 'Appartement' | 'Maison' | 'Tous'

// Parseur CSV minimal (RFC4180) : gère les champs entre guillemets pouvant
// contenir des virgules. Les fichiers geo-dvf n'ont pas de retour à la
// ligne à l'intérieur d'un champ, un split par ligne en amont suffit donc.
function parseCsvLine(line: string): string[] {
  const fields: string[] = []
  let cur = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          cur += '"'
          i++
        } else {
          inQuotes = false
        }
      } else {
        cur += ch
      }
    } else if (ch === '"') {
      inQuotes = true
    } else if (ch === ',') {
      fields.push(cur)
      cur = ''
    } else {
      cur += ch
    }
  }
  fields.push(cur)
  return fields
}

function toNumber(v: string | undefined): number | null {
  if (!v) return null
  const n = Number(v.replace(',', '.'))
  return isNaN(n) ? null : n
}

async function fetchDepartmentYear(department: string, year: number): Promise<DvfRow[]> {
  const url = `${GEO_DVF_BASE}/${year}/departements/${department}.csv.gz`

  let res: Response
  try {
    res = await fetch(url, { next: { revalidate: CACHE_SECONDS } })
  } catch {
    return []
  }
  if (!res.ok) return []

  let text: string
  try {
    const buf = Buffer.from(await res.arrayBuffer())
    text = gunzipSync(buf).toString('utf-8')
  } catch {
    return []
  }

  const lines = text.split('\n')
  if (!lines.length) return []
  const header = parseCsvLine(lines[0])
  const idx = (name: string) => header.indexOf(name)

  const iMutation = idx('id_mutation')
  const iDate = idx('date_mutation')
  const iValeur = idx('valeur_fonciere')
  const iNumero = idx('adresse_numero')
  const iVoie = idx('adresse_nom_voie')
  const iCp = idx('code_postal')
  const iCommune = idx('nom_commune')
  const iType = idx('type_local')
  const iSurface = idx('surface_reelle_bati')
  const iTerrain = idx('surface_terrain')
  const iPieces = idx('nombre_pieces_principales')
  const iLots = idx('nombre_lots')

  // Si les colonnes attendues sont absentes, le format du fichier source a
  // changé : on s'arrête proprement plutôt que de renvoyer des données
  // incohérentes (colonnes décalées).
  if (iValeur === -1 || iCp === -1 || iType === -1) return []

  const rows: DvfRow[] = []
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i]
    if (!line) continue
    const f = parseCsvLine(line)
    const cp = f[iCp]?.trim()
    if (!cp) continue
    rows.push({
      idMutation: iMutation !== -1 ? f[iMutation]?.trim() || '' : '',
      dateMutation: f[iDate]?.trim() || null,
      valeurFonciere: toNumber(f[iValeur]),
      adresse: [f[iNumero], f[iVoie]].filter(Boolean).join(' ').trim(),
      codePostal: cp,
      nomCommune: f[iCommune]?.trim() || '',
      typeLocal: f[iType]?.trim() || '',
      surfaceReelleBati: toNumber(f[iSurface]),
      surfaceTerrain: iTerrain !== -1 ? toNumber(f[iTerrain]) : null,
      nombrePiecesPrincipales: toNumber(f[iPieces]),
      nombreLots: iLots !== -1 ? toNumber(f[iLots]) : null,
    })
  }
  return rows
}

export type DvfSearchParams = {
  postalCode: string
  propertyType: DvfPropertyType
  maxResults?: number
  yearsBack?: number
}

export type DvfSearchResult = {
  rows: DvfRow[]
  yearsQueried: number[]
  error?: string
}

// Les millésimes DVF sont publiés avec retard (le plus récent porte sur
// l'année précédente). On part de l'an dernier et on remonte sur
// `yearsBack` années, en ignorant silencieusement celles absentes.
export async function searchDvf({
  postalCode,
  propertyType,
  maxResults = 40,
  yearsBack = 4,
}: DvfSearchParams): Promise<DvfSearchResult> {
  const cp = postalCode.trim()
  if (!/^\d{5}$/.test(cp)) {
    return { rows: [], yearsQueried: [], error: 'Code postal invalide (5 chiffres attendus).' }
  }
  const department = cp.slice(0, 2)
  const currentYear = new Date().getFullYear()
  const years = Array.from({ length: yearsBack }, (_, i) => currentYear - 1 - i)

  const perYear = await Promise.all(years.map((year) => fetchDepartmentYear(department, year)))

  const yearsQueried: number[] = []
  const matches: DvfRow[] = []
  years.forEach((year, i) => {
    const rows = perYear[i]
    if (!rows.length) return
    yearsQueried.push(year)

    // Le format geo-dvf répète une ligne par lot/local d'une même mutation
    // (ex. un bien vendu avec une cave et un garage donne 3 lignes, toutes
    // avec la même valeur_fonciere totale). Sans filtrage, ces lignes sont
    // comptées comme autant de ventes distinctes au même prix — c'est ce qui
    // fait apparaître "5 biens identiques vendus à la même adresse" et
    // fausse complètement la moyenne. On ne garde donc que les mutations à
    // un seul lot/local, seules fiables pour un prix au m² comparable.
    const mutationCounts = new Map<string, number>()
    for (const r of rows) {
      if (!r.idMutation) continue
      mutationCounts.set(r.idMutation, (mutationCounts.get(r.idMutation) || 0) + 1)
    }

    for (const r of rows) {
      if (r.codePostal !== cp) continue
      if (!r.valeurFonciere || !r.surfaceReelleBati) continue
      if (propertyType !== 'Tous' && r.typeLocal !== propertyType) continue
      if (r.idMutation && (mutationCounts.get(r.idMutation) || 0) > 1) continue
      if (r.nombreLots !== null && r.nombreLots > 1) continue
      matches.push(r)
    }
  })

  matches.sort((a, b) => (b.dateMutation || '').localeCompare(a.dateMutation || ''))

  if (!yearsQueried.length) {
    return {
      rows: [],
      yearsQueried,
      error: "Impossible de récupérer les données DVF pour ce département pour l'instant (source indisponible).",
    }
  }

  return { rows: matches.slice(0, maxResults), yearsQueried }
}
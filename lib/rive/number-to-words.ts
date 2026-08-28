// Conversion d'un nombre entier en toutes lettres (français), pour les montants
// écrits "en toutes lettres" sur les mandats (ex. "DEUX CENT SOIXANTE-DIX-HUIT MILLE EUROS").
// Couvre les montants immobiliers usuels (jusqu'au milliard).

const UNITS = ['', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf']
const TEENS = [
  'dix',
  'onze',
  'douze',
  'treize',
  'quatorze',
  'quinze',
  'seize',
  'dix-sept',
  'dix-huit',
  'dix-neuf',
]
const TENS = ['', '', 'vingt', 'trente', 'quarante', 'cinquante', 'soixante', 'soixante', 'quatre-vingt', 'quatre-vingt']

function twoDigits(n: number): string {
  if (n < 10) return UNITS[n]
  if (n < 20) return TEENS[n - 10]
  const ten = Math.floor(n / 10)
  const unit = n % 10
  if (ten === 7 || ten === 9) {
    // soixante-dix, quatre-vingt-dix
    const base = TENS[ten]
    const rest = TEENS[unit]
    return unit === 1 && ten === 7 ? `${base}-et-${rest}` : `${base}-${rest}`
  }
  if (unit === 0) return TENS[ten] + (ten === 8 ? 's' : '')
  if (unit === 1 && ten !== 8) return `${TENS[ten]}-et-un`
  return `${TENS[ten]}-${UNITS[unit]}`
}

function threeDigits(n: number): string {
  const hundred = Math.floor(n / 100)
  const rest = n % 100
  let out = ''
  if (hundred > 0) {
    out += hundred === 1 ? 'cent' : `${UNITS[hundred]} cent`
    if (rest === 0 && hundred > 1) out += 's'
  }
  if (rest > 0) out += (out ? ' ' : '') + twoDigits(rest)
  return out
}

export function numberToFrenchWords(n: number): string {
  if (n === 0) return 'zéro'
  const isNegative = n < 0
  n = Math.round(Math.abs(n))

  const billions = Math.floor(n / 1_000_000_000)
  const millions = Math.floor((n % 1_000_000_000) / 1_000_000)
  const thousands = Math.floor((n % 1_000_000) / 1000)
  const remainder = n % 1000

  const parts: string[] = []
  if (billions > 0) parts.push(`${threeDigits(billions)} milliard${billions > 1 ? 's' : ''}`)
  if (millions > 0) parts.push(`${threeDigits(millions)} million${millions > 1 ? 's' : ''}`)
  if (thousands > 0) parts.push(thousands === 1 ? 'mille' : `${threeDigits(thousands)} mille`)
  if (remainder > 0 || parts.length === 0) parts.push(threeDigits(remainder))

  return (isNegative ? 'moins ' : '') + parts.join(' ').replace(/\s+/g, ' ').trim()
}

export function amountInWords(n: number | null | undefined): string {
  if (!n && n !== 0) return ''
  return numberToFrenchWords(n).toUpperCase()
}

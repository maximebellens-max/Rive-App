// Génération et téléchargement de CSV côté client — utilisé par les tableaux
// (mandats, commissions, performance) pour permettre un export ponctuel sans
// dépendance externe. Compatible Excel/LibreOffice (séparateur virgule,
// champs entre guillemets, encodage UTF-8 avec BOM pour que les caractères
// accentués s'affichent correctement dans Excel).

function escapeCSVField(value: string): string {
  if (/[",\n\r]/.test(value)) return `"${value.replace(/"/g, '""')}"`
  return value
}

export function toCSV(headers: string[], rows: (string | number | null)[][]): string {
  const lines = [headers, ...rows].map((row) => row.map((cell) => escapeCSVField(String(cell ?? ''))).join(','))
  return lines.join('\r\n')
}

// BOM UTF-8 (﻿) : sans lui, Excel interprète les accents comme du
// Latin-1 et affiche "Ã©" à la place de "é" dans les fichiers ouverts
// directement (double-clic) plutôt qu'importés via l'assistant.
export function downloadCSV(filename: string, csv: string): void {
  const blob = new Blob([`﻿${csv}`], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
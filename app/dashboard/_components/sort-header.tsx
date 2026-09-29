'use client'

// En-tête de colonne cliquable pour trier un tableau — même bouton réutilisé
// dans les vues liste mandats/commissions et le tableau Performance, pour
// que le tri par colonne se comporte pareil partout (clic = trie croissant,
// re-clic sur la même colonne = inverse le sens).
export default function SortHeader({
  label,
  active,
  direction,
  onClick,
}: {
  label: string
  active: boolean
  direction: 'asc' | 'desc'
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-1 whitespace-nowrap font-medium hover:text-neutral-900 ${
        active ? 'text-neutral-900' : ''
      }`}
    >
      {label}
      <span className="w-2.5 text-[10px] text-neutral-400">{active ? (direction === 'asc' ? '▲' : '▼') : ''}</span>
    </button>
  )
}
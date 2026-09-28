// État "aucun résultat" harmonisé : même gabarit partout (icône + message +
// sous-texte optionnel) plutôt qu'une simple ligne de texte gris réinventée
// à chaque écran, avec sa propre formulation et sa propre mise en forme.
// `compact` réduit les espacements pour un usage dans un espace déjà
// contraint (une colonne de kanban plutôt qu'une page entière).
export default function EmptyState({
  icon = '🗂️',
  title,
  subtitle,
  compact = false,
}: {
  icon?: string
  title: string
  subtitle?: string
  compact?: boolean
}) {
  return (
    <div className={`flex flex-col items-center gap-1 text-center ${compact ? 'px-2 py-4' : 'px-4 py-10'}`}>
      <span className={compact ? 'text-lg' : 'text-2xl'} aria-hidden="true">
        {icon}
      </span>
      <p className={`font-medium text-neutral-500 ${compact ? 'text-xs' : 'text-sm text-neutral-600'}`}>{title}</p>
      {subtitle && <p className="max-w-xs text-xs text-neutral-400">{subtitle}</p>}
    </div>
  )
}
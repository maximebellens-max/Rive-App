// Badge "agent assigné" réutilisé sur les cartes prospects/clients (kanban
// pipelines) et biens (kanban + liste mandats), et dans Réglages → Équipe.
// Affiche la photo si elle existe, sinon les initiales du nom sur un fond
// neutre.
export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (!parts.length) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

export default function Avatar({
  name,
  avatarUrl,
  size = 24,
  className = '',
}: {
  name: string
  avatarUrl?: string | null
  size?: number
  className?: string
}) {
  const style = { width: size, height: size, fontSize: Math.max(9, Math.round(size * 0.4)) }

  if (avatarUrl) {
    // eslint-disable-next-line @next/next/no-img-element
    return (
      <img
        src={avatarUrl}
        alt={name}
        style={style}
        title={name}
        className={`shrink-0 rounded-full object-cover ring-1 ring-black/10 ${className}`}
      />
    )
  }

  return (
    <span
      style={style}
      title={name}
      className={`flex shrink-0 items-center justify-center rounded-full bg-neutral-200 font-semibold text-neutral-600 ring-1 ring-black/10 ${className}`}
    >
      {initials(name)}
    </span>
  )
}
'use client'

// Navigation des réglages façon "Réglages" macOS : un menu de catégories à
// gauche, une seule catégorie affichée à la fois à droite — plutôt que les 6
// blocs empilés en vrac les uns sous les autres comme avant. Chaque
// catégorie garde son contenu (formulaires, actions...) strictement
// identique, seule la présentation change.
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export type SettingsSection = {
  id: string
  label: string
  title: string
  description: string
  content: React.ReactNode
}

export default function SettingsShell({
  sections,
  initialSectionId,
}: {
  sections: SettingsSection[]
  initialSectionId: string
}) {
  const router = useRouter()
  const [activeId, setActiveId] = useState(
    sections.some((s) => s.id === initialSectionId) ? initialSectionId : sections[0]?.id
  )

  const active = sections.find((s) => s.id === activeId) ?? sections[0]

  function selectSection(id: string) {
    setActiveId(id)
    // Reflète la sélection dans l'URL (utile pour revenir directement sur la
    // bonne catégorie après un rechargement ou un lien partagé) sans
    // recharger la page ni perdre le scroll.
    router.replace(`/dashboard/settings?section=${id}`, { scroll: false })
  }

  if (!active) return null

  return (
    <div className="flex flex-col gap-6 md:flex-row md:items-start md:gap-8">
      <nav
        className="flex shrink-0 gap-1 overflow-x-auto pb-1 md:w-52 md:flex-col md:overflow-visible md:pb-0"
        aria-label="Catégories de réglages"
      >
        {sections.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => selectSection(s.id)}
            aria-current={s.id === active.id ? 'page' : undefined}
            className={`shrink-0 rounded-lg px-3 py-2 text-left text-sm font-medium whitespace-nowrap transition-colors md:whitespace-normal ${
              s.id === active.id
                ? 'bg-accent/10 text-accent'
                : 'text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900'
            }`}
          >
            {s.label}
          </button>
        ))}
      </nav>
      <div className="min-w-0 flex-1">
        <div className="mb-4">
          <h1 className="text-xl font-semibold tracking-tight">{active.title}</h1>
          <p className="mt-1 text-sm text-neutral-500">{active.description}</p>
        </div>
        <div className="max-w-2xl rounded-2xl border border-neutral-200 bg-surface p-6 shadow-sm">{active.content}</div>
      </div>
    </div>
  )
}
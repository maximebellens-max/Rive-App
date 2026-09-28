'use client'

import { useState, type ReactNode } from 'react'

export type TabItem = { key: string; label: string; content: ReactNode }

// Version partagée de mandates/[id]/mandate-tabs.tsx (même principe : `hidden`
// plutôt qu'un rendu conditionnel, pour que les onglets non actifs restent
// montés — formulaires pas réinitialisés, pas de re-fetch), dupliquée ici en
// composant commun plutôt qu'importée depuis ce fichier de route privée, pour
// être réutilisable ailleurs (fiche prospect, etc.) sans lien de dépendance
// entre les deux sections. Barre d'onglets qui défile horizontalement plutôt
// que de passer à la ligne (`overflow-x-auto` au lieu de `flex-wrap`) : sur
// un écran étroit, 4 onglets à la ligne repoussaient le contenu sous la
// ligne de pli avant même d'avoir commencé à lire quoi que ce soit.
export default function Tabs({ tabs }: { tabs: TabItem[] }) {
  const [active, setActive] = useState(tabs[0]?.key)

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-1 overflow-x-auto border-b border-neutral-200">
        {tabs.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setActive(t.key)}
            className={`-mb-px shrink-0 whitespace-nowrap border-b-2 px-4 py-2 text-sm font-medium transition ${
              active === t.key
                ? 'border-accent text-neutral-900'
                : 'border-transparent text-neutral-500 hover:text-neutral-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      {tabs.map((t) => (
        <div key={t.key} hidden={t.key !== active} className="flex flex-col gap-6">
          {t.content}
        </div>
      ))}
    </div>
  )
}
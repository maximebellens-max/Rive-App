'use client'

import { useState, type ReactNode } from 'react'

export type MandateTab = { key: string; label: string; content: ReactNode }

// `hidden` plutôt qu'un rendu conditionnel : les onglets non actifs restent
// montés (formulaires pas réinitialisés, pas de re-fetch) — juste
// visuellement masqués, comme recommandé pour ce genre de bascule.
export default function MandateTabs({ tabs }: { tabs: MandateTab[] }) {
  const [active, setActive] = useState(tabs[0]?.key)

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-1 border-b border-neutral-200">
        {tabs.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setActive(t.key)}
            className={`-mb-px border-b-2 px-4 py-2 text-sm font-medium transition ${
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
'use client'

// Champ de recherche de prospect réutilisable — même logique que le
// combobox de l'agenda (recherche par nom, sélection via un input caché),
// factorisée ici pour être partagée par les nouveaux tableaux de suivi
// (Ameublement, Cuisine, Travaux, Projets investisseur, Location) qui
// rattachent tous leurs lignes à un prospect/client existant.
import { useMemo, useState } from 'react'

export type LeadOption = { id: string; name: string }

export default function LeadCombobox({
  options,
  name = 'lead_id',
  placeholder = 'Rechercher un prospect…',
  defaultValue,
}: {
  options: LeadOption[]
  name?: string
  placeholder?: string
  defaultValue?: LeadOption | null
}) {
  const [query, setQuery] = useState(defaultValue?.name ?? '')
  const [selected, setSelected] = useState<LeadOption | null>(defaultValue ?? null)
  const [open, setOpen] = useState(false)

  const filtered = useMemo(() => {
    if (selected) return []
    const q = query.trim().toLowerCase()
    if (!q) return options.slice(0, 8)
    return options.filter((o) => o.name.toLowerCase().includes(q)).slice(0, 8)
  }, [query, selected, options])

  return (
    <div className="relative">
      <input
        type="text"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value)
          setSelected(null)
          setOpen(true)
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        autoComplete="off"
        placeholder={placeholder}
        required={!selected}
        className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-accent"
      />
      <input type="hidden" name={name} value={selected?.id ?? ''} />
      {open && filtered.length > 0 && (
        <div className="absolute left-0 right-0 top-full z-10 mt-1 max-h-56 overflow-y-auto rounded-lg border border-neutral-200 bg-surface shadow-md">
          {filtered.map((o) => (
            <button
              key={o.id}
              type="button"
              onMouseDown={() => {
                setSelected(o)
                setQuery(o.name)
                setOpen(false)
              }}
              className="block w-full truncate px-3 py-2 text-left text-sm text-neutral-700 hover:bg-neutral-100"
            >
              {o.name}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
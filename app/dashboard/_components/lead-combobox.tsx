'use client'

// Champ de recherche de prospect réutilisable — même logique que le
// combobox de l'agenda (recherche par nom, sélection via un input caché),
// factorisée ici pour être partagée par les nouveaux tableaux de suivi
// (Ameublement, Cuisine, Travaux, Projets investisseur, Location) qui
// rattachent tous leurs lignes à un prospect/client existant.
import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

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
  const [menuRect, setMenuRect] = useState<{ top: number; left: number; width: number } | null>(null)
  const wrapperRef = useRef<HTMLDivElement>(null)

  const filtered = useMemo(() => {
    if (selected) return []
    const q = query.trim().toLowerCase()
    if (!q) return options.slice(0, 8)
    return options.filter((o) => o.name.toLowerCase().includes(q)).slice(0, 8)
  }, [query, selected, options])

  // La liste de suggestions est rendue dans un portail (document.body), pas en
  // position absolue dans la cellule du tableau : les tableaux de suivi ont
  // overflow-x-auto sur leur conteneur pour le défilement horizontal, ce qui
  // force aussi overflow-y à auto (règle CSS : dès qu'un axe n'est pas
  // "visible", l'autre l'devient) et « coupait » la bulle de suggestions,
  // la faisant apparaître tronquée ou plaquée sur l'en-tête du tableau.
  useEffect(() => {
    if (!open) return
    const updateRect = () => {
      const r = wrapperRef.current?.getBoundingClientRect()
      if (r) setMenuRect({ top: r.bottom, left: r.left, width: r.width })
    }
    updateRect()
    window.addEventListener('scroll', updateRect, true)
    window.addEventListener('resize', updateRect)
    return () => {
      window.removeEventListener('scroll', updateRect, true)
      window.removeEventListener('resize', updateRect)
    }
  }, [open])

  const showMenu = open && filtered.length > 0 && menuRect

  return (
    <div ref={wrapperRef} className="relative">
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
      {showMenu &&
        createPortal(
          <div
            style={{ position: 'fixed', top: menuRect.top + 4, left: menuRect.left, width: menuRect.width }}
            className="z-50 max-h-56 overflow-y-auto rounded-lg border border-neutral-200 bg-surface shadow-md"
          >
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
          </div>,
          document.body
        )}
    </div>
  )
}
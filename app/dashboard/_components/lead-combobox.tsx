'use client'

// Champ de recherche de prospect réutilisable — même logique que le
// combobox de l'agenda (recherche par nom, sélection via un input caché),
// factorisée ici pour être partagée par les nouveaux tableaux de suivi
// (Ameublement, Cuisine, Travaux, Projets investisseur, Location) qui
// rattachent tous leurs lignes à un prospect/client existant. Permet aussi
// de créer un nouveau client à la volée, sans quitter le tableau, plutôt que
// de forcer à choisir parmi les clients déjà inscrits.
import { useEffect, useMemo, useRef, useState, useTransition } from 'react'
import { createPortal } from 'react-dom'
import { createLeadQuick } from '@/app/actions/leads'

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

  const [creating, setCreating] = useState(false)
  const [createFirstName, setCreateFirstName] = useState('')
  const [createLastName, setCreateLastName] = useState('')
  const [createError, setCreateError] = useState('')
  const [isPending, startTransition] = useTransition()

  const filtered = useMemo(() => {
    if (selected) return []
    const q = query.trim().toLowerCase()
    if (!q) return options.slice(0, 8)
    return options.filter((o) => o.name.toLowerCase().includes(q)).slice(0, 8)
  }, [query, selected, options])

  // La liste de suggestions (et le mini-formulaire de création) est rendue
  // dans un portail (document.body), pas en position absolue dans la cellule
  // du tableau : les tableaux de suivi ont overflow-x-auto sur leur
  // conteneur pour le défilement horizontal, ce qui force aussi overflow-y à
  // auto (règle CSS : dès qu'un axe n'est pas "visible", l'autre l'devient)
  // et « coupait » la bulle de suggestions, la faisant apparaître tronquée
  // ou plaquée sur l'en-tête du tableau.
  useEffect(() => {
    if (!open && !creating) return
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
  }, [open, creating])

  function startCreate() {
    // Pré-remplit avec ce qui a déjà été tapé (1er mot → prénom, reste →
    // nom), même convention que la reprise des anciennes fiches.
    const q = query.trim()
    const spaceIdx = q.indexOf(' ')
    setCreateFirstName(spaceIdx > -1 ? q.slice(0, spaceIdx) : q)
    setCreateLastName(spaceIdx > -1 ? q.slice(spaceIdx + 1).trim() : '')
    setCreateError('')
    setCreating(true)
  }

  function cancelCreate() {
    setCreating(false)
    setCreateError('')
  }

  function submitCreate() {
    if (!createFirstName.trim()) {
      setCreateError('Le prénom est obligatoire.')
      return
    }
    startTransition(async () => {
      const result = await createLeadQuick(createFirstName, createLastName)
      if ('error' in result) {
        setCreateError(result.error)
        return
      }
      setSelected(result.lead)
      setQuery(result.lead.name)
      setCreating(false)
      setOpen(false)
    })
  }

  const showMenu = (open || creating) && (filtered.length > 0 || !selected || creating) && menuRect

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
        disabled={creating}
        className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-accent disabled:bg-neutral-50 disabled:text-neutral-400"
      />
      <input type="hidden" name={name} value={selected?.id ?? ''} />
      {showMenu &&
        createPortal(
          <div
            style={{ position: 'fixed', top: menuRect.top + 4, left: menuRect.left, width: menuRect.width }}
            className="z-50 max-h-80 overflow-y-auto rounded-lg border border-neutral-200 bg-surface shadow-md"
          >
            {!creating && (
              <>
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
                <button
                  type="button"
                  onMouseDown={startCreate}
                  className="block w-full border-t border-neutral-100 px-3 py-2 text-left text-sm font-medium text-accent hover:bg-neutral-100"
                >
                  + Créer un nouveau client{query.trim() ? ` « ${query.trim()} »` : ''}
                </button>
              </>
            )}
            {creating && (
              <div className="flex flex-col gap-2 p-3">
                <p className="text-xs font-medium text-neutral-500">Nouveau client</p>
                <input
                  type="text"
                  autoFocus
                  value={createFirstName}
                  onChange={(e) => setCreateFirstName(e.target.value)}
                  placeholder="Prénom"
                  className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-accent"
                />
                <input
                  type="text"
                  value={createLastName}
                  onChange={(e) => setCreateLastName(e.target.value)}
                  placeholder="Nom"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      submitCreate()
                    }
                  }}
                  className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-accent"
                />
                {createError && <p className="text-xs text-danger">{createError}</p>}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={submitCreate}
                    className="rounded-lg bg-accent px-3 py-1.5 text-xs font-medium text-accent-ink hover:bg-accent-hover disabled:opacity-60"
                  >
                    {isPending ? 'Création…' : 'Créer et sélectionner'}
                  </button>
                  <button
                    type="button"
                    onClick={cancelCreate}
                    className="rounded-lg px-2 py-1.5 text-xs text-neutral-500 hover:bg-neutral-100"
                  >
                    Annuler
                  </button>
                </div>
              </div>
            )}
          </div>,
          document.body
        )}
    </div>
  )
}
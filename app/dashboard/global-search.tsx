'use client'

// Recherche globale dans l'en-tête : un seul champ pour retrouver un
// prospect, un mandat ou un contact pro sans savoir dans quelle section de
// Rive il est rangé — voir app/actions/search.ts pour la requête. Même
// squelette que NotificationBell (bouton + panneau, fermeture au clic
// extérieur) pour rester cohérent avec le reste de l'en-tête.
import { useEffect, useRef, useState, useTransition } from 'react'
import Link from 'next/link'
import { globalSearch, type SearchResult } from '@/app/actions/search'
import { SearchIcon } from './_components/icons'

const KIND_LABEL: Record<SearchResult['kind'], string> = {
  lead: 'Prospect',
  mandate: 'Mandat',
  partner: 'Contact pro',
}

export default function GlobalSearch() {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [results, setResults] = useState<SearchResult[]>([])
  const [pending, startTransition] = useTransition()
  const containerRef = useRef<HTMLDivElement>(null)
  // Annule une recherche encore en vol si l'agent retape entre-temps — sans
  // ça, une réponse lente pourrait écraser un résultat plus récent arrivé
  // plus vite (réponses qui se doublent dans le désordre).
  const requestIdRef = useRef(0)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    const q = query.trim()
    // Rien à charger pour une requête trop courte — le panneau de résultats
    // ne s'affiche de toute façon pas en dessous de 2 caractères (voir plus
    // bas), pas besoin de vider `results` ici pour autant.
    if (q.length < 2) return

    const requestId = ++requestIdRef.current
    const timer = setTimeout(() => {
      startTransition(async () => {
        const res = await globalSearch(q)
        if (requestIdRef.current === requestId) setResults(res)
      })
    }, 250)
    return () => clearTimeout(timer)
  }, [query])

  return (
    <div ref={containerRef} className="relative min-w-0 flex-1 max-w-md">
      <div className="flex items-center gap-2 rounded-lg border border-neutral-300 px-3 py-1.5 text-sm focus-within:border-accent focus-within:ring-1 focus-within:ring-accent">
        <SearchIcon className="h-4 w-4 shrink-0 text-neutral-400" strokeWidth={1.75} aria-hidden="true" />
        <input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
          placeholder="Rechercher un prospect, un mandat, un contact…"
          aria-label="Recherche globale"
          className="w-full min-w-0 bg-transparent outline-none placeholder:text-neutral-400"
        />
      </div>

      {open && query.trim().length >= 2 && (
        <div className="absolute left-0 right-0 z-20 mt-1.5 max-h-96 overflow-y-auto rounded-xl border border-neutral-200 bg-surface shadow-lg">
          {pending && results.length === 0 ? (
            <p className="px-4 py-3 text-center text-sm text-neutral-400">Recherche…</p>
          ) : results.length === 0 ? (
            <p className="px-4 py-3 text-center text-sm text-neutral-400">Aucun résultat pour « {query.trim()} ».</p>
          ) : (
            results.map((r) => (
              <Link
                key={`${r.kind}-${r.id}`}
                href={r.href}
                onClick={() => setOpen(false)}
                className="flex items-center justify-between gap-2 px-4 py-2.5 hover:bg-neutral-50"
              >
                <div className="flex min-w-0 flex-col">
                  <span className="truncate text-sm font-medium text-neutral-900">{r.title}</span>
                  {r.subtitle && <span className="truncate text-xs text-neutral-500">{r.subtitle}</span>}
                </div>
                <span className="shrink-0 rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] font-medium text-neutral-500">
                  {KIND_LABEL[r.kind]}
                </span>
              </Link>
            ))
          )}
        </div>
      )}
    </div>
  )
}
'use client'

// Recherche globale dans l'en-tête : un seul champ pour retrouver un
// prospect, un mandat ou un contact pro sans savoir dans quelle section de
// Rive il est rangé — voir app/actions/search.ts pour la requête. Même
// squelette que NotificationBell (bouton + panneau, fermeture au clic
// extérieur) pour rester cohérent avec le reste de l'en-tête.
//
// Deux présentations partageant le même état (query/results/pending) :
// - Desktop (md+) : barre en ligne dans l'en-tête, ouverte au focus, avec un
//   raccourci clavier ⌘K/Ctrl+K pour y sauter sans la souris.
// - Mobile : simple bouton icône ouvrant un panneau plein écran — la barre
//   en ligne d'origine devenait trop étroite à côté du logo et du hamburger
//   sur un petit écran pour rester utilisable au clavier tactile.
import { useEffect, useRef, useState, useTransition } from 'react'
import Link from 'next/link'
import { globalSearch, type SearchResult } from '@/app/actions/search'
import { SearchIcon, XIcon } from './_components/icons'

const KIND_LABEL: Record<SearchResult['kind'], string> = {
  lead: 'Prospect',
  mandate: 'Mandat',
  partner: 'Contact pro',
}

function ResultsList({
  query,
  results,
  pending,
  onNavigate,
}: {
  query: string
  results: SearchResult[]
  pending: boolean
  onNavigate: () => void
}) {
  if (pending && results.length === 0) {
    return <p className="px-4 py-3 text-center text-sm text-neutral-400">Recherche…</p>
  }
  if (results.length === 0) {
    return <p className="px-4 py-3 text-center text-sm text-neutral-400">Aucun résultat pour « {query.trim()} ».</p>
  }
  return (
    <>
      {results.map((r) => (
        <Link
          key={`${r.kind}-${r.id}`}
          href={r.href}
          onClick={onNavigate}
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
      ))}
    </>
  )
}

export default function GlobalSearch() {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [results, setResults] = useState<SearchResult[]>([])
  const [pending, startTransition] = useTransition()
  const containerRef = useRef<HTMLDivElement>(null)
  const desktopInputRef = useRef<HTMLInputElement>(null)
  const mobileInputRef = useRef<HTMLInputElement>(null)
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

  // Raccourci clavier ⌘K / Ctrl+K (desktop uniquement) : saute directement
  // dans le champ sans lâcher le clavier, comme la plupart des outils du
  // même genre (Linear, Notion…).
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        desktopInputRef.current?.focus()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

  useEffect(() => {
    if (!mobileOpen) return
    mobileInputRef.current?.focus()
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [mobileOpen])

  return (
    <>
      {/* Mobile : bouton icône seul, le champ en ligne n'a pas la place de
          rester utilisable à côté du logo et du hamburger. */}
      <button
        type="button"
        onClick={() => setMobileOpen(true)}
        aria-label="Rechercher"
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-neutral-600 hover:bg-neutral-100 md:hidden"
      >
        <SearchIcon className="h-5 w-5" strokeWidth={1.75} aria-hidden="true" />
      </button>

      {/* Desktop : barre en ligne, ouverte au focus, avec indice ⌘K. */}
      <div ref={containerRef} className="relative hidden min-w-0 flex-1 max-w-md md:block">
        <div className="flex items-center gap-2 rounded-lg border border-neutral-300 px-3 py-1.5 text-sm focus-within:border-accent focus-within:ring-1 focus-within:ring-accent">
          <SearchIcon className="h-4 w-4 shrink-0 text-neutral-400" strokeWidth={1.75} aria-hidden="true" />
          <input
            ref={desktopInputRef}
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
          <kbd className="hidden shrink-0 rounded border border-neutral-200 bg-neutral-50 px-1.5 py-0.5 text-[10px] font-medium text-neutral-400 lg:inline-block">
            ⌘K
          </kbd>
        </div>

        {open && query.trim().length >= 2 && (
          <div className="absolute left-0 right-0 z-20 mt-1.5 max-h-96 overflow-y-auto rounded-xl border border-neutral-200 bg-surface shadow-lg">
            <ResultsList query={query} results={results} pending={pending} onNavigate={() => setOpen(false)} />
          </div>
        )}
      </div>

      {/* Panneau plein écran mobile. */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 flex flex-col bg-surface md:hidden">
          <div
            className="flex items-center gap-2 border-b border-neutral-200 px-4 py-3"
            style={{ paddingTop: 'max(0.75rem, env(safe-area-inset-top))' }}
          >
            <SearchIcon className="h-4 w-4 shrink-0 text-neutral-400" strokeWidth={1.75} aria-hidden="true" />
            <input
              ref={mobileInputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Rechercher un prospect, un mandat, un contact…"
              aria-label="Recherche globale"
              className="w-full min-w-0 bg-transparent text-base outline-none placeholder:text-neutral-400"
            />
            <button
              type="button"
              onClick={() => {
                setMobileOpen(false)
                setQuery('')
              }}
              aria-label="Fermer la recherche"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-neutral-500 hover:bg-neutral-100"
            >
              <XIcon className="h-5 w-5" strokeWidth={1.75} aria-hidden="true" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto">
            {query.trim().length >= 2 ? (
              <ResultsList
                query={query}
                results={results}
                pending={pending}
                onNavigate={() => {
                  setMobileOpen(false)
                  setQuery('')
                }}
              />
            ) : (
              <p className="px-4 py-6 text-center text-sm text-neutral-400">
                Tape au moins 2 caractères pour lancer la recherche.
              </p>
            )}
          </div>
        </div>
      )}
    </>
  )
}
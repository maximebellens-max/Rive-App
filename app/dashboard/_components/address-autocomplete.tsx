'use client'

import { useEffect, useRef, useState } from 'react'

// Autocomplétion d'adresse via l'API officielle "Base Adresse Nationale"
// (adresse.data.gouv.fr) : gratuite, sans clé, et appelée directement depuis
// le navigateur du client (pas de proxy serveur nécessaire). Elle renvoie
// une adresse normalisée avec code postal et commune correctement formatés
// — ce qui fiabilise au passage la détection automatique du code postal
// utilisée par la recherche de comparables DVF.
type Suggestion = {
  label: string
  postcode: string
  city: string
}

export default function AddressAutocomplete({
  name,
  value,
  onChange,
  placeholder,
  className,
}: {
  name: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
}) {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const controller = new AbortController()
    const timeout = setTimeout(() => {
      if (value.trim().length < 3) {
        setSuggestions([])
        return
      }

      fetch(`https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(value)}&limit=5`, {
        signal: controller.signal,
      })
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (!data?.features) return
          setSuggestions(
            data.features.map((f: { properties: { label: string; postcode: string; city: string } }) => ({
              label: f.properties.label,
              postcode: f.properties.postcode,
              city: f.properties.city,
            }))
          )
        })
        .catch(() => {
          // Recherche annulée (nouvelle frappe) ou service indisponible :
          // l'utilisateur garde la main pour taper l'adresse librement.
        })
    }, 250)

    return () => {
      clearTimeout(timeout)
      controller.abort()
    }
  }, [value])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div ref={containerRef} className="relative">
      <input
        name={name}
        value={value}
        onChange={(e) => {
          onChange(e.target.value)
          setOpen(true)
        }}
        onFocus={() => setOpen(true)}
        placeholder={placeholder}
        autoComplete="off"
        className={className}
      />
      {open && suggestions.length > 0 && (
        <ul className="absolute z-10 mt-1 max-h-56 w-full overflow-auto rounded-lg border border-neutral-200 bg-surface py-1 text-sm shadow-md">
          {suggestions.map((s) => (
            <li key={s.label}>
              <button
                type="button"
                onClick={() => {
                  onChange(s.label)
                  setSuggestions([])
                  setOpen(false)
                }}
                className="block w-full px-3 py-1.5 text-left text-neutral-700 hover:bg-neutral-100"
              >
                {s.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
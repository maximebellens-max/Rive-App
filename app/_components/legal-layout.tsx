import Link from 'next/link'
import type { ReactNode } from 'react'

// Mise en page partagée par les 4 pages légales (mentions légales, CGU,
// CGV, confidentialité) — évite de dupliquer l'en-tête/pied de page dans
// chacune. Le contenu propre à chaque page passe en `children`, mis en
// forme via la classe `.legal-content` (voir app/globals.css) plutôt que
// d'ajouter une dépendance (@tailwindcss/typography) pour quatre pages de
// texte.
export function LegalLayout({
  title,
  lastUpdated,
  children,
}: {
  title: string
  lastUpdated: string
  children: ReactNode
}) {
  return (
    <main className="flex flex-1 flex-col">
      <header className="sticky top-0 z-10 border-b border-neutral-200 bg-surface/90 backdrop-blur">
        <div className="mx-auto flex w-full max-w-3xl items-center justify-between px-5 py-4 sm:px-8">
          <Link href="/" className="text-lg font-extrabold tracking-tight text-neutral-900">
            Rive
          </Link>
          <Link href="/" className="text-sm font-medium text-neutral-600 hover:text-neutral-900">
            ← Retour au site
          </Link>
        </div>
      </header>

      <article className="mx-auto w-full max-w-3xl px-5 py-12 sm:px-8 sm:py-16">
        <h1 className="text-3xl font-extrabold tracking-tight text-balance text-neutral-900 sm:text-4xl">
          {title}
        </h1>
        <p className="mt-2 text-sm text-neutral-500">Dernière mise à jour : {lastUpdated}</p>
        <div className="legal-content mt-10">{children}</div>
      </article>

      <footer className="border-t border-neutral-200 py-10">
        <div className="mx-auto flex w-full max-w-3xl flex-col items-center gap-3 px-5 text-center text-xs text-neutral-500 sm:px-8">
          <nav className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1">
            <Link href="/mentions-legales" className="hover:text-neutral-700 hover:underline">
              Mentions légales
            </Link>
            <Link href="/cgu" className="hover:text-neutral-700 hover:underline">
              CGU
            </Link>
            <Link href="/cgv" className="hover:text-neutral-700 hover:underline">
              CGV
            </Link>
            <Link href="/confidentialite" className="hover:text-neutral-700 hover:underline">
              Confidentialité
            </Link>
          </nav>
          <a href="mailto:contact.rive.crm@gmail.com" className="hover:text-neutral-700 hover:underline">
            contact.rive.crm@gmail.com
          </a>
        </div>
      </footer>
    </main>
  )
}
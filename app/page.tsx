import Link from 'next/link'

export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center px-4 text-center">
      <h1 className="text-4xl font-semibold tracking-tight">Rive</h1>
      <p className="mt-3 max-w-md text-neutral-500">
        Le CRM pensé pour les agents immobiliers indépendants et leurs agences.
      </p>
      <div className="mt-8 flex gap-3">
        <Link
          href="/login"
          className="rounded-lg border border-neutral-300 px-5 py-2.5 text-sm font-medium text-neutral-700 hover:bg-neutral-100"
        >
          Se connecter
        </Link>
        <Link
          href="/signup"
          className="rounded-lg bg-neutral-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-neutral-700"
        >
          Créer une agence
        </Link>
      </div>
    </main>
  )
}

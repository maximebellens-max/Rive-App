// Bloc de chargement générique (pulsation douce) composé dans chaque
// loading.tsx pour approcher la forme réelle de la page qui arrive —
// jusqu'ici aucune route n'avait de loading.tsx : le temps que les requêtes
// Supabase répondent (souvent plusieurs, en parallèle), l'agent ne voyait
// qu'un écran blanc, plus sensible encore en 4G entre deux rendez-vous.
export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-neutral-200 ${className}`} />
}
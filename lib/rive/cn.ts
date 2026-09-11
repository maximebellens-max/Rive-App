// Petit utilitaire de fusion de classes Tailwind, façon clsx, mais écrit à la
// main plutôt qu'importé comme dépendance npm : évite d'ajouter un
// package-lock.json à déposer (voir app/dashboard/_components/icons.tsx pour
// le même raisonnement) pour un besoin qui tient en quelques lignes. Ne fait
// pas de déduplication de classes en conflit (contrairement à
// tailwind-merge) — Button et Card n'en ont pas besoin : chaque variante
// fournit une chaîne de classes complète et cohérente, `className` ne sert
// qu'à ajouter des classes complémentaires (jamais à en écraser).
export type ClassValue = string | number | null | undefined | false | ClassValue[]

export function cn(...inputs: ClassValue[]): string {
  const out: string[] = []
  const walk = (value: ClassValue) => {
    if (!value) return
    if (Array.isArray(value)) {
      value.forEach(walk)
      return
    }
    out.push(String(value))
  }
  inputs.forEach(walk)
  return out.join(' ')
}
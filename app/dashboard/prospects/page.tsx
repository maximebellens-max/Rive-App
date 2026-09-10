import { redirect } from 'next/navigation'

// L'onglet "Prospects" a été retiré (doublon avec Vendeurs/Acheteurs/
// Investisseurs — tout prospect, saisi à la main ou reçu via Meta, tombe
// désormais directement dans l'un de ces 3 tableaux). Cette page ne reste
// que pour rediriger un ancien favori/lien vers Aujourd'hui plutôt que
// d'afficher une 404. La fiche d'un prospect (/dashboard/prospects/[id])
// reste, elle, inchangée.
export default function ProspectsPage() {
  redirect('/dashboard')
}
// Modèles de messages SMS/Email avec variables — repris à l'identique du
// prototype Rive (corrige au passage {{agent}}, qui était figé à "Maxime"
// dans le prototype : ici on passe le nom du conseiller connecté).
export const PARTNER_ROLES = ['Notaire', 'Banque / courtier', 'Artisan', 'Diagnostiqueur', 'Agent partenaire', 'Autre']

export function fillTemplatePlaceholders(
  text: string,
  vars: { prenom: string; date: string; agent: string }
): string {
  return text
    .replaceAll('{{prenom}}', vars.prenom)
    .replaceAll('{{date}}', vars.date)
    .replaceAll('{{agent}}', vars.agent)
}

export function formatDateFR(dateStr: string | null): string {
  const d = dateStr ? new Date(dateStr) : new Date()
  return d.toLocaleDateString('fr-FR')
}

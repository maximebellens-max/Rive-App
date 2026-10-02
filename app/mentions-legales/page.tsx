import { LegalLayout } from '../_components/legal-layout'

// Mentions légales obligatoires (art. 6-III de la LCEN) — identité de
// l'éditeur et de l'hébergeur. Distinct des CGU/CGV : page toujours
// accessible, sans lien avec la création d'un compte.
export const metadata = {
  title: 'Mentions légales — Rive',
}

export default function MentionsLegalesPage() {
  return (
    <LegalLayout title="Mentions légales" lastUpdated="2 octobre 2026">
      <h2>Éditeur du site</h2>
      <p>
        Le site accessible à cette adresse ainsi que le logiciel Rive (le « Service ») sont édités par :
      </p>
      <ul>
        <li>
          <strong>Maxime Bellens</strong>, entrepreneur individuel (micro-entreprise)
        </li>
        <li>SIREN : 919 936 419</li>
        <li>Adresse : 7 Rue du Clos de Pacy, 34140 Mèze, France</li>
        <li>
          Email :{' '}
          <a href="mailto:contact.rive.crm@gmail.com">contact.rive.crm@gmail.com</a>
        </li>
        <li>TVA non applicable, article 293 B du Code général des impôts (franchise en base de TVA).</li>
      </ul>
      <p>
        Rive est un logiciel métier (CRM immobilier) édité et commercialisé par Maxime Bellens à titre
        indépendant, distinctement de son activité d&apos;agent commercial exercée au sein de l&apos;agence
        Hevrest.
      </p>

      <h2>Directeur de la publication</h2>
      <p>Maxime Bellens.</p>

      <h2>Hébergement</h2>
      <p>Le site et l&apos;application sont hébergés par :</p>
      <ul>
        <li>Vercel Inc. — 440 N Barranca Avenue, PMB 4133, Covina, CA 91723, États-Unis (vercel.com)</li>
      </ul>
      <p>
        Les données du Service (comptes, fiches clients, rendez-vous, etc.) sont stockées via Supabase, dans
        des serveurs situés dans l&apos;Union européenne (région Irlande). Le détail des sous-traitants
        techniques est précisé dans la{' '}
        <a href="/confidentialite">politique de confidentialité</a>.
      </p>

      <h2>Propriété intellectuelle</h2>
      <p>
        L&apos;ensemble des éléments de ce site (textes, structure, identité visuelle) ainsi que le logiciel
        Rive sont la propriété de Maxime Bellens, sauf mention contraire, et protégés par le droit de la
        propriété intellectuelle. Toute reproduction ou représentation, totale ou partielle, sans
        autorisation préalable, est interdite.
      </p>

      <h2>Liens vers des sites tiers</h2>
      <p>
        Le Service peut renvoyer vers des sites tiers (par exemple la page de paiement sécurisée Stripe).
        L&apos;éditeur n&apos;est pas responsable du contenu de ces sites, qui disposent de leurs propres
        conditions d&apos;utilisation et politique de confidentialité.
      </p>

      <h2>Contact</h2>
      <p>
        Pour toute question relative à ce site :{' '}
        <a href="mailto:contact.rive.crm@gmail.com">contact.rive.crm@gmail.com</a>
      </p>
    </LegalLayout>
  )
}
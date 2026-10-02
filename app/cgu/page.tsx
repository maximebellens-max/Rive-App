import { LegalLayout } from '../_components/legal-layout'

// CGU — régissent l'utilisation du Service (accès, compte, comportement,
// disponibilité, responsabilité). Les conditions tarifaires et de
// facturation sont dans les CGV (page séparée), qui priment sur ces CGU
// pour tout ce qui concerne le prix et le paiement.
export const metadata = {
  title: "Conditions générales d'utilisation — Rive",
}

export default function CguPage() {
  return (
    <LegalLayout title="Conditions générales d'utilisation" lastUpdated="2 octobre 2026">
      <h2>1. Objet</h2>
      <p>
        Les présentes Conditions Générales d&apos;Utilisation (« CGU ») définissent les modalités
        d&apos;accès et d&apos;utilisation du logiciel Rive, CRM immobilier accessible en ligne (le «
        Service »), édité par Maxime Bellens (voir les{' '}
        <a href="/mentions-legales">mentions légales</a>). Elles s&apos;appliquent à toute personne (« l
        &apos;Utilisateur ») créant un compte sur Rive, pour son propre compte ou pour le compte
        d&apos;une agence immobilière.
      </p>
      <p>
        Les conditions tarifaires et de facturation du Service font l&apos;objet d&apos;un document
        distinct, les <a href="/cgv">Conditions Générales de Vente (CGV)</a>, qui priment sur les
        présentes CGU pour tout ce qui concerne le prix et le paiement.
      </p>

      <h2>2. Acceptation</h2>
      <p>
        La création d&apos;un compte sur Rive implique l&apos;acceptation pleine et entière des présentes
        CGU, des CGV et de la{' '}
        <a href="/confidentialite">politique de confidentialité</a>. Si l&apos;Utilisateur n&apos;accepte
        pas ces conditions, il ne doit pas créer de compte ni utiliser le Service.
      </p>

      <h2>3. Un service réservé aux professionnels</h2>
      <p>
        Rive est un logiciel métier destiné exclusivement à un usage professionnel, par des agences
        immobilières, agents commerciaux ou indépendants de l&apos;immobilier agissant dans le cadre de
        leur activité professionnelle. Il n&apos;est pas destiné à un usage par des consommateurs au sens
        du Code de la consommation.
      </p>

      <h2>4. Compte utilisateur</h2>
      <p>
        Pour utiliser Rive, l&apos;Utilisateur crée un compte en renseignant des informations exactes
        (identité, email professionnel). Chaque compte est rattaché à une agence. Le ou les
        administrateurs de l&apos;agence peuvent inviter d&apos;autres membres de leur équipe, dans la
        limite du nombre de postes inclus dans l&apos;offre souscrite (voir CGV).
      </p>
      <p>
        L&apos;Utilisateur est responsable de la confidentialité de ses identifiants et de toute activité
        réalisée depuis son compte. Toute perte ou utilisation non autorisée doit être signalée sans délai
        à <a href="mailto:contact.rive.crm@gmail.com">contact.rive.crm@gmail.com</a>.
      </p>

      <h2>5. Utilisation du Service</h2>
      <p>
        L&apos;Utilisateur s&apos;engage à utiliser Rive conformément à sa destination (gestion de
        prospects, clients, biens et rendez-vous immobiliers) et à la réglementation applicable à son
        activité professionnelle. Il est notamment interdit de :
      </p>
      <ul>
        <li>
          tenter de contourner les limites techniques ou tarifaires du Service (nombre de postes, quota
          d&apos;utilisation de l&apos;assistant IA, modules activés) ;
        </li>
        <li>utiliser le Service à des fins illicites, frauduleuses ou contraires aux bonnes mœurs ;</li>
        <li>tenter d&apos;accéder aux données d&apos;une autre agence que la sienne ;</li>
        <li>extraire ou réutiliser le Service pour développer un produit concurrent.</li>
      </ul>

      <h2>6. Données saisies par l&apos;agence</h2>
      <p>
        Dans le cadre de son utilisation de Rive, l&apos;agence saisit des données concernant ses propres
        prospects et clients (coordonnées, critères de recherche, échanges, rendez-vous). Pour ces
        données, l&apos;agence est responsable de traitement au sens du RGPD, et Rive agit en tant que
        sous-traitant, dans les conditions décrites dans la{' '}
        <a href="/confidentialite">politique de confidentialité</a>. Il appartient à l&apos;agence de
        s&apos;assurer qu&apos;elle dispose d&apos;une base légale pour collecter et traiter ces données, et
        d&apos;informer ses propres clients conformément à la réglementation applicable.
      </p>

      <h2>7. Modules et fonctionnalités optionnelles</h2>
      <p>
        Certaines fonctionnalités (par exemple le module Investissement ou les alertes WhatsApp) sont
        optionnelles et activées selon l&apos;offre souscrite ou sur demande. Leur disponibilité peut
        évoluer ; tout changement substantiel affectant une fonctionnalité activement utilisée par une
        agence lui sera communiqué.
      </p>
      <p>
        Concernant WhatsApp en particulier : l&apos;envoi de messages est soumis aux conditions de la
        plateforme WhatsApp Business (Meta) et suppose que les destinataires (membres de l&apos;agence)
        aient donné leur accord dans les réglages de leur compte.
      </p>

      <h2>8. Disponibilité du Service</h2>
      <p>
        L&apos;éditeur met en œuvre des moyens raisonnables pour assurer la disponibilité et la bonne
        performance du Service, sans pouvoir garantir une disponibilité continue. Des interruptions
        peuvent survenir pour maintenance, mise à jour, ou en cas de panne d&apos;un prestataire technique
        (hébergement, base de données, etc.). Dans la mesure du possible, les interventions planifiées
        sont annoncées à l&apos;avance.
      </p>

      <h2>9. Propriété intellectuelle</h2>
      <p>
        Le logiciel Rive, son code, son interface et sa documentation sont la propriété exclusive de
        l&apos;éditeur. L&apos;utilisation du Service confère à l&apos;agence un droit d&apos;usage
        personnel, non exclusif et non transférable, pour la durée de son abonnement, à l&apos;exclusion de
        tout autre droit.
      </p>
      <p>
        Les données saisies par l&apos;agence (prospects, clients, biens, notes) restent la propriété de
        l&apos;agence, qui peut en demander l&apos;export (voir politique de confidentialité).
      </p>

      <h2>10. Responsabilité</h2>
      <p>
        L&apos;éditeur met en œuvre des moyens raisonnables pour fournir un Service fiable, sans garantir
        l&apos;absence totale d&apos;erreur ou d&apos;interruption. Le contenu généré par l&apos;assistant
        IA (texte de relance, estimation, etc.) doit être relu et validé par l&apos;Utilisateur avant tout
        envoi à un tiers : l&apos;éditeur ne saurait être tenu responsable d&apos;un contenu généré par IA
        utilisé sans relecture.
      </p>
      <p>
        La responsabilité de l&apos;éditeur ne pourra être engagée qu&apos;en cas de faute prouvée, et sera
        dans tous les cas limitée au montant des sommes versées par l&apos;agence au titre des douze
        derniers mois d&apos;abonnement, sauf faute lourde ou dolosive de l&apos;éditeur.
      </p>

      <h2>11. Suspension et résiliation d&apos;accès</h2>
      <p>
        En cas de non-respect des présentes CGU, l&apos;éditeur peut suspendre ou résilier l&apos;accès au
        Service, après mise en demeure restée infructueuse, sauf manquement grave justifiant une
        suspension immédiate (par exemple une tentative d&apos;accès non autorisé aux données d&apos;une
        autre agence). Les conditions de résiliation liées à l&apos;abonnement (préavis, remboursement)
        sont précisées dans les CGV.
      </p>

      <h2>12. Évolution des CGU</h2>
      <p>
        Les présentes CGU peuvent être modifiées pour refléter une évolution du Service ou de la
        réglementation. Toute modification substantielle sera communiquée aux administrateurs de compte
        par email, avec un délai raisonnable avant son entrée en vigueur. La poursuite de
        l&apos;utilisation du Service après notification vaut acceptation des nouvelles CGU.
      </p>

      <h2>13. Droit applicable et litiges</h2>
      <p>
        Les présentes CGU sont soumises au droit français. En cas de litige, et à défaut de résolution
        amiable, les parties s&apos;efforceront de trouver une solution négociée avant toute action
        judiciaire. À défaut, les tribunaux compétents seront ceux du ressort du siège de l&apos;éditeur,
        sous réserve des règles de compétence d&apos;ordre public applicables.
      </p>

      <h2>14. Contact</h2>
      <p>
        Pour toute question relative aux présentes CGU :{' '}
        <a href="mailto:contact.rive.crm@gmail.com">contact.rive.crm@gmail.com</a>
      </p>
    </LegalLayout>
  )
}
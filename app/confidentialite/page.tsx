import { LegalLayout } from '../_components/legal-layout'

// Politique de confidentialité RGPD. Distingue bien les deux casquettes de
// l'éditeur : responsable de traitement pour les données de compte/
// facturation de l'Agence, et sous-traitant pour les données que l'Agence
// saisit sur ses propres prospects/clients (voir CGU art. 6). La liste des
// sous-traitants reflète les intégrations réellement utilisées dans le
// code (lib/rive/billing/stripe.ts, lib/rive/email.ts [Resend],
// lib/rive/whatsapp.ts + lib/rive/meta.ts [Meta], lib/rive/anthropic.ts,
// Supabase, Vercel) — à tenir à jour si une intégration change.
export const metadata = {
  title: 'Politique de confidentialité — Rive',
}

export default function ConfidentialitePage() {
  return (
    <LegalLayout title="Politique de confidentialité" lastUpdated="2 octobre 2026">
      <h2>1. Qui est responsable de vos données ?</h2>
      <p>
        Le logiciel Rive est édité par Maxime Bellens, entrepreneur individuel (voir{' '}
        <a href="/mentions-legales">mentions légales</a>). Selon la donnée concernée, l&apos;éditeur agit
        à deux titres différents :
      </p>
      <ul>
        <li>
          <strong>Responsable de traitement</strong> pour les données liées au compte de l&apos;Agence et
          de ses membres (identité, email, facturation, utilisation du Service) ;
        </li>
        <li>
          <strong>Sous-traitant</strong>, au sens du RGPD, pour les données que l&apos;Agence saisit dans
          Rive concernant ses propres prospects et clients (nom, coordonnées, critères de recherche,
          échanges, rendez-vous). Pour ces données, c&apos;est l&apos;Agence qui est responsable de
          traitement : c&apos;est elle qui détermine pourquoi et comment ces données sont collectées, et
          c&apos;est auprès d&apos;elle que ses propres clients et prospects doivent faire valoir leurs
          droits (voir article 8 ci-dessous).
        </li>
      </ul>

      <h2>2. Quelles données sont collectées, et pourquoi</h2>
      <table>
        <thead>
          <tr>
            <th>Données</th>
            <th>Finalité</th>
            <th>Base légale</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Identité, email, téléphone des membres de l&apos;Agence</td>
            <td>Création et gestion du compte, connexion, support</td>
            <td>Exécution du contrat</td>
          </tr>
          <tr>
            <td>Données de facturation (via Stripe)</td>
            <td>Facturation de l&apos;abonnement</td>
            <td>Exécution du contrat / obligation légale (comptabilité)</td>
          </tr>
          <tr>
            <td>Préférences de notification (email, push, WhatsApp)</td>
            <td>Envoi des alertes choisies par chaque membre</td>
            <td>Exécution du contrat / consentement pour WhatsApp</td>
          </tr>
          <tr>
            <td>Journaux techniques et de connexion</td>
            <td>Sécurité, prévention de la fraude, diagnostic technique</td>
            <td>Intérêt légitime</td>
          </tr>
          <tr>
            <td>
              Données saisies par l&apos;Agence sur ses prospects/clients (coordonnées, critères de
              recherche, échanges, rendez-vous, biens)
            </td>
            <td>Fournies par l&apos;Agence pour son propre usage professionnel</td>
            <td>Déterminée par l&apos;Agence (responsable de traitement pour ces données)</td>
          </tr>
        </tbody>
      </table>

      <h2>3. Durée de conservation</h2>
      <p>
        Les données de compte sont conservées pendant toute la durée de l&apos;abonnement de
        l&apos;Agence, puis supprimées ou archivées dans un délai raisonnable après résiliation, sous
        réserve des durées de conservation imposées par la loi (notamment les documents comptables et de
        facturation, conservés 10 ans conformément au Code de commerce). Les données saisies par
        l&apos;Agence sur ses prospects et clients sont conservées pendant la durée de l&apos;abonnement ;
        il appartient à l&apos;Agence de les purger ou d&apos;en demander l&apos;export avant résiliation
        si elle souhaite les conserver par ailleurs.
      </p>

      <h2>4. À qui vos données sont-elles transmises</h2>
      <p>
        Vos données sont hébergées et traitées par des prestataires techniques, chacun intervenant pour
        une finalité précise, sans pouvoir réutiliser vos données à d&apos;autres fins :
      </p>
      <table>
        <thead>
          <tr>
            <th>Prestataire</th>
            <th>Rôle</th>
            <th>Localisation</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Vercel Inc.</td>
            <td>Hébergement de l&apos;application</td>
            <td>États-Unis</td>
          </tr>
          <tr>
            <td>Supabase</td>
            <td>Base de données, authentification, stockage de fichiers</td>
            <td>Union européenne (Irlande)</td>
          </tr>
          <tr>
            <td>Stripe</td>
            <td>Traitement des paiements et de la facturation</td>
            <td>Union européenne / États-Unis</td>
          </tr>
          <tr>
            <td>Resend</td>
            <td>Envoi des emails transactionnels (alertes nouveau prospect, etc.)</td>
            <td>États-Unis</td>
          </tr>
          <tr>
            <td>Meta Platforms Ireland Ltd.</td>
            <td>
              Envoi des alertes WhatsApp (WhatsApp Business Platform) et, si l&apos;Agence l&apos;active,
              récupération des prospects issus de ses campagnes Meta Ads
            </td>
            <td>Union européenne (Irlande) / États-Unis</td>
          </tr>
          <tr>
            <td>Anthropic</td>
            <td>
              Génération de texte par l&apos;assistant IA (relances, estimations, réponses de
              l&apos;assistant conversationnel) à partir des données que vous lui soumettez
            </td>
            <td>États-Unis</td>
          </tr>
        </tbody>
      </table>
      <p>
        Vos données ne sont ni vendues, ni louées, ni utilisées à des fins publicitaires par
        l&apos;éditeur ou par ces prestataires.
      </p>

      <h2>5. Transferts hors Union européenne</h2>
      <p>
        Certains prestataires listés ci-dessus sont établis aux États-Unis et peuvent être amenés à
        traiter des données en dehors de l&apos;Union européenne. Ces transferts s&apos;appuient sur les
        garanties prévues par le RGPD pour ce type de prestataire (clauses contractuelles types de la
        Commission européenne et/ou adhésion au cadre de protection des données UE-États-Unis « Data
        Privacy Framework », selon le prestataire). Les coordonnées de stockage de la base de données elle-
        même (Supabase) restent, à la date de rédaction de cette page, situées dans l&apos;Union
        européenne.
      </p>

      <h2>6. Cookies et traceurs</h2>
      <p>
        Rive utilise uniquement des cookies strictement nécessaires au fonctionnement du Service
        (maintien de la session de connexion), déposés par notre prestataire d&apos;authentification
        Supabase. Aucun cookie de mesure d&apos;audience, de publicité ou de traçage n&apos;est utilisé à
        ce jour ; cette page sera mise à jour si cela devait changer.
      </p>

      <h2>7. Sécurité</h2>
      <p>
        L&apos;accès aux données est protégé par authentification et cloisonné par Agence (une Agence ne
        peut pas accéder aux données d&apos;une autre). Les mots de passe sont stockés sous forme
        chiffrée par notre prestataire d&apos;authentification (Supabase) et ne sont jamais accessibles en
        clair, y compris par l&apos;éditeur. Les communications avec le Service sont chiffrées (HTTPS).
      </p>

      <h2>8. Vos droits</h2>
      <p>
        Conformément au RGPD, vous disposez d&apos;un droit d&apos;accès, de rectification, d&apos;
        effacement, de portabilité, de limitation et d&apos;opposition sur les données vous concernant.
      </p>
      <ul>
        <li>
          Si vous êtes membre d&apos;une Agence utilisant Rive : pour exercer ces droits sur vos propres
          données de compte, écrivez à{' '}
          <a href="mailto:contact.rive.crm@gmail.com">contact.rive.crm@gmail.com</a>.
        </li>
        <li>
          Si vous êtes client ou prospect d&apos;une Agence qui utilise Rive pour vous suivre : l&apos;
          Agence est responsable de vos données (voir article 1) ; c&apos;est donc auprès d&apos;elle
          directement que vous devez faire valoir vos droits.
        </li>
      </ul>
      <p>
        Vous disposez également du droit d&apos;introduire une réclamation auprès de la Commission
        Nationale de l&apos;Informatique et des Libertés (CNIL) — cnil.fr.
      </p>

      <h2>9. Modifications de cette politique</h2>
      <p>
        Cette politique peut être mise à jour pour refléter une évolution du Service, de ses prestataires
        ou de la réglementation. La date de dernière mise à jour figure en haut de cette page ; toute
        modification substantielle sera communiquée aux administrateurs de compte par email.
      </p>

      <h2>10. Contact</h2>
      <p>
        Pour toute question relative à cette politique ou à vos données :{' '}
        <a href="mailto:contact.rive.crm@gmail.com">contact.rive.crm@gmail.com</a>
      </p>
    </LegalLayout>
  )
}
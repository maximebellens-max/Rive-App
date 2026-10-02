import { LegalLayout } from '../_components/legal-layout'
import {
  PLANS,
  TRIAL_DAYS,
  LAUNCH_DISCOUNT_PERCENT,
  LAUNCH_DISCOUNT_MONTHS,
  launchPriceCents,
} from '@/lib/rive/billing/plans'
import { MODULE_PRICE_CENTS } from '@/lib/rive/billing/modules'

// CGV — tarifs et conditions de paiement. Les montants sont dérivés de
// lib/rive/billing/plans.ts et lib/rive/billing/modules.ts (même source
// que la page d'accueil) pour ne jamais afficher un prix désynchronisé de
// ce qui est réellement facturé.
export const metadata = {
  title: 'Conditions générales de vente — Rive',
}

function euros(cents: number): string {
  return `${Math.round(cents / 100)} €`
}

export default function CgvPage() {
  const solo = PLANS.solo
  const equipe = PLANS.equipe
  const agence = PLANS.agence
  const investissementPriceCents = MODULE_PRICE_CENTS.investissement ?? null

  return (
    <LegalLayout title="Conditions générales de vente" lastUpdated="2 octobre 2026">
      <h2>1. Objet et champ d&apos;application</h2>
      <p>
        Les présentes Conditions Générales de Vente (« CGV ») s&apos;appliquent à tout abonnement au
        logiciel Rive (le « Service »), souscrit par une agence immobilière ou un professionnel de
        l&apos;immobilier (l&apos;« Agence ») auprès de Maxime Bellens (voir{' '}
        <a href="/mentions-legales">mentions légales</a>). Elles complètent les{' '}
        <a href="/cgu">Conditions Générales d&apos;Utilisation</a> et priment sur celles-ci pour tout ce
        qui concerne le prix et le paiement. Le Service est réservé à un usage professionnel ; les
        présentes CGV ne sont donc pas soumises aux dispositions du Code de la consommation applicables
        aux consommateurs.
      </p>

      <h2>2. Offres</h2>
      <p>Rive est proposé selon trois paliers, donnant accès à un produit identique et ne différant que
        par le nombre de postes inclus et le quota mensuel d&apos;utilisation de l&apos;assistant IA :
      </p>
      <table>
        <thead>
          <tr>
            <th>Offre</th>
            <th>Prix</th>
            <th>Postes inclus</th>
            <th>Quota IA mensuel</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>{solo.label}</td>
            <td>{euros(solo.priceCents ?? 0)} / mois</td>
            <td>{solo.seatLimit} poste</td>
            <td>{solo.aiMonthlyLimit} requêtes</td>
          </tr>
          <tr>
            <td>{equipe.label}</td>
            <td>{euros(equipe.priceCents ?? 0)} / mois</td>
            <td>{equipe.baseSeats} postes inclus</td>
            <td>{equipe.aiMonthlyLimit} requêtes</td>
          </tr>
          <tr>
            <td>{agence.label}</td>
            <td>{euros(agence.priceCents ?? 0)} / mois</td>
            <td>{agence.baseSeats} postes inclus</td>
            <td>Illimité</td>
          </tr>
        </tbody>
      </table>
      <p>
        Pour les offres {equipe.label} et {agence.label}, des postes supplémentaires au-delà du nombre
        inclus peuvent être ajoutés moyennant un supplément de {euros(equipe.extraSeatPriceCents ?? 0)} /
        mois par poste, dans les conditions précisées lors de la souscription ou indiquées dans
        l&apos;espace de gestion de l&apos;Agence.
      </p>
      <p>
        Tous les prix sont exprimés toutes taxes comprises : l&apos;éditeur, en franchise en base de TVA
        (article 293 B du Code général des impôts), ne facture pas de TVA sur ses prestations.
      </p>

      <h2>2 bis. Modules optionnels</h2>
      {investissementPriceCents !== null && (
        <p>
          Le module Investissement (tableau de bord investisseurs) est disponible en complément de toute
          offre, moyennant {euros(investissementPriceCents)} / mois supplémentaires.
        </p>
      )}
      <p>
        D&apos;autres modules optionnels peuvent être activés au cas par cas, selon des conditions
        communiquées directement à l&apos;Agence avant activation.
      </p>

      <h2>3. Essai gratuit</h2>
      <p>
        Toute nouvelle Agence bénéficie d&apos;une période d&apos;essai de {TRIAL_DAYS} jours, sans
        engagement et sans carte bancaire requise pour commencer. À l&apos;issue de cette période, l
        &apos;accès au Service nécessite la souscription d&apos;une offre payante et la configuration
        d&apos;un moyen de paiement.
      </p>

      <h2>4. Offre de lancement</h2>
      <p>
        Une remise de {LAUNCH_DISCOUNT_PERCENT} % s&apos;applique sur les {LAUNCH_DISCOUNT_MONTHS} premiers
        mois d&apos;abonnement de toute nouvelle Agence, soit, à titre indicatif :{' '}
        {euros(launchPriceCents(solo.priceCents ?? 0))} / mois pour l&apos;offre {solo.label},{' '}
        {euros(launchPriceCents(equipe.priceCents ?? 0))} / mois pour l&apos;offre {equipe.label}, et{' '}
        {euros(launchPriceCents(agence.priceCents ?? 0))} / mois pour l&apos;offre {agence.label}. Cette
        offre est susceptible d&apos;évoluer ou d&apos;être retirée à tout moment pour les nouvelles
        souscriptions, sans effet sur les abonnements déjà en cours.
      </p>

      <h2>5. Paiement et facturation</h2>
      <p>
        Le paiement s&apos;effectue par prélèvement automatique sur la carte bancaire enregistrée par l
        &apos;Agence, via notre prestataire de paiement Stripe. L&apos;éditeur n&apos;a à aucun moment
        accès aux coordonnées bancaires complètes de l&apos;Agence, qui sont traitées directement par
        Stripe.
      </p>
      <p>
        L&apos;abonnement est facturé mensuellement, à la date anniversaire de la souscription, et
        reconduit tacitement chaque mois jusqu&apos;à résiliation par l&apos;Agence.
      </p>

      <h2>6. Durée, résiliation et remboursement</h2>
      <p>
        L&apos;abonnement est sans engagement de durée. L&apos;Agence peut résilier à tout moment depuis
        son espace de gestion ou en écrivant à{' '}
        <a href="mailto:contact.rive.crm@gmail.com">contact.rive.crm@gmail.com</a>. La résiliation prend
        effet à la fin de la période de facturation en cours ; l&apos;accès au Service reste disponible
        jusqu&apos;à cette date. Sauf erreur de facturation, les sommes déjà versées pour la période en
        cours ne sont pas remboursées au prorata.
      </p>

      <h2>7. Retard ou défaut de paiement</h2>
      <p>
        En cas d&apos;échec de prélèvement, l&apos;Agence en est informée et dispose d&apos;un délai
        raisonnable pour régulariser sa situation (mise à jour du moyen de paiement). À défaut de
        régularisation, l&apos;accès au Service peut être suspendu jusqu&apos;au paiement des sommes dues.
      </p>
      <p>
        Conformément à l&apos;article L. 441-10 du Code de commerce, tout retard de paiement entraîne de
        plein droit, outre les pénalités de retard calculées au taux applicable entre professionnels,
        une indemnité forfaitaire pour frais de recouvrement de 40 €, sans préjudice d&apos;une indemnité
        complémentaire si les frais de recouvrement effectivement engagés dépassent ce montant.
      </p>

      <h2>8. Droit de rétractation</h2>
      <p>
        Le Service étant réservé à un usage professionnel en rapport direct avec l&apos;activité de
        l&apos;Agence, aucun droit de rétractation légal (applicable aux consommateurs) ne s&apos;applique.
        La période d&apos;essai de {TRIAL_DAYS} jours décrite à l&apos;article 3, qui ne nécessite aucune
        carte bancaire pour commencer, offre à l&apos;Agence une flexibilité équivalente avant tout
        engagement financier.
      </p>

      <h2>9. Responsabilité</h2>
      <p>
        Les conditions de responsabilité applicables au Service sont décrites à l&apos;article 10 des{' '}
        <a href="/cgu">CGU</a>, qui s&apos;appliquent également dans le cadre des présentes CGV.
      </p>

      <h2>10. Évolution des tarifs</h2>
      <p>
        L&apos;éditeur peut faire évoluer les tarifs de ses offres. Toute hausse de tarif applicable à un
        abonnement en cours sera communiquée à l&apos;Agence par email au moins un mois avant son entrée en
        vigueur ; l&apos;Agence pourra résilier son abonnement avant cette date si elle n&apos;accepte pas
        la nouvelle tarification.
      </p>

      <h2>11. Droit applicable et litiges</h2>
      <p>
        Les présentes CGV sont soumises au droit français. En cas de litige, et à défaut de résolution
        amiable, les parties s&apos;efforceront de trouver une solution négociée avant toute action
        judiciaire. À défaut, les tribunaux compétents seront ceux du ressort du siège de l&apos;éditeur,
        sous réserve des règles de compétence d&apos;ordre public applicables.
      </p>

      <h2>12. Contact</h2>
      <p>
        Pour toute question relative à la facturation ou aux présentes CGV :{' '}
        <a href="mailto:contact.rive.crm@gmail.com">contact.rive.crm@gmail.com</a>
      </p>
    </LegalLayout>
  )
}
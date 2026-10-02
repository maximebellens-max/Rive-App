import Link from 'next/link'
import {
  PLANS,
  TRIAL_DAYS,
  LAUNCH_DISCOUNT_PERCENT,
  LAUNCH_DISCOUNT_MONTHS,
  launchPriceCents,
} from '@/lib/rive/billing/plans'
import { MODULE_LABELS, MODULE_PRICE_CENTS } from '@/lib/rive/billing/modules'

// Page d'accueil publique — seule page du site accessible sans connexion.
// Sert aussi de "vitrine" pour toute vérification externe (ex. Stripe, lors
// de l'activation du compte de paiement) qui a besoin de comprendre ce que
// Rive vend avant d'avoir un compte.
//
// Les 3 paliers payants donnent un accès IDENTIQUE au produit — ils ne
// diffèrent QUE par le nombre d'agents inclus et le quota IA mensuel (voir
// lib/rive/billing/plans.ts). La génération de mandats/documents
// juridiques n'est volontairement pas listée : réservée à Hevrest pour
// l'instant (voir lib/rive/access.ts, canGenerateMandates), jamais vendue.
// Les chiffres affichés ici (prix, essai, offre de lancement) viennent tous
// de lib/rive/billing/plans.ts et lib/rive/billing/modules.ts — un seul
// fichier à modifier le jour où ils changent.

function euros(cents: number): string {
  return `${Math.round(cents / 100)} €`
}

const FEATURES: { title: string; description: string }[] = [
  {
    title: 'Pipeline par type de projet',
    description:
      'Vendeurs, acheteurs et investisseurs suivis dans des tableaux séparés, avec les étapes propres à chaque type de transaction — de la prise de contact à la signature.',
  },
  {
    title: 'Leads Meta Ads en direct',
    description:
      'Chaque formulaire rempli sur une campagne Facebook ou Instagram arrive automatiquement dans le bon tableau, avec toutes les réponses du prospect déjà renseignées sur sa fiche.',
  },
  {
    title: 'Alertes où vous êtes déjà',
    description:
      'Email et notification push sur le téléphone pour ne jamais manquer un nouveau prospect, un rendez-vous du jour ou une échéance de mandat.',
  },
  {
    title: 'Assistant IA conversationnel',
    description:
      'Demandez-lui par écrit ou à la voix de chercher un prospect, ajouter une note, avancer une étape ou créer un rendez-vous — il agit directement dans vos fiches et confirme ce qu’il a fait.',
  },
  {
    title: 'Relances qui ne s’oublient pas',
    description:
      'Prospect resté sans réponse, anniversaire de vente, avis Google à demander, estimation sans suite : un brouillon rédigé automatiquement, prêt à être relu et envoyé.',
  },
  {
    title: 'Estimations générées',
    description:
      'L’estimation d’un bien se génère depuis les informations déjà saisies sur la fiche du prospect, sans ressaisie ni modèle à remplir à la main.',
  },
  {
    title: 'Commissions suivies automatiquement',
    description:
      'Chaque vente conclue calcule les honoraires prévisionnels et réalisés, pour un suivi financier clair sans tableur à part.',
  },
  {
    title: 'Landing pages pour capter des leads',
    description:
      'Des pages de capture prêtes à brancher sur vos campagnes publicitaires, qui alimentent directement le bon pipeline.',
  },
]

const STEPS: { title: string; description: string }[] = [
  {
    title: 'Créez votre agence',
    description: `${TRIAL_DAYS} jours d’essai gratuit, sans carte bancaire. Votre pipeline et votre assistant IA sont prêts en quelques minutes.`,
  },
  {
    title: 'Connectez vos sources de leads',
    description: 'Meta Ads, landing pages, saisie manuelle — chaque prospect arrive directement dans le bon tableau.',
  },
  {
    title: 'Laissez Rive relancer pour vous',
    description: 'Alertes automatiques, brouillons de relance prêts à envoyer, estimations générées en un clic.',
  },
  {
    title: 'Suivez jusqu’à la signature',
    description: 'Du premier contact à la commission encaissée, tout reste au même endroit, pour vous et votre équipe.',
  },
]

const PLAN_COPY: Record<'solo' | 'equipe' | 'agence', { tagline: string; highlighted?: boolean }> = {
  solo: { tagline: 'Pour un agent indépendant qui gère seul ses mandats.' },
  equipe: { tagline: 'Pour une équipe qui partage ses prospects et son pipeline.', highlighted: true },
  agence: { tagline: 'Pour une agence qui veut tout son réseau sur la même plateforme.' },
}

const COMMON_PLAN_FEATURES = [
  'CRM complet (vendeurs, acheteurs, investisseurs)',
  'Assistant IA conversationnel',
  'Leads Meta Ads connectés',
  'Alertes email et push',
  'Relances automatiques',
  'Estimations générées',
]

const FAQ: { question: string; answer: string }[] = [
  {
    question: 'Faut-il une carte bancaire pour essayer Rive ?',
    answer: `Non. Les ${TRIAL_DAYS} jours d’essai démarrent dès la création de votre agence, sans aucune information de paiement à renseigner.`,
  },
  {
    question: 'Quelle est la différence entre les 3 paliers ?',
    answer:
      'Aucune différence de fonctionnalités : les 3 paliers donnent un accès complet et identique au produit. Ils ne diffèrent que par le nombre d’agents inclus et le quota de génération IA mensuel.',
  },
  {
    question: 'Que se passe-t-il si mon équipe dépasse le nombre d’agents inclus ?',
    answer: `Chaque agent supplémentaire au-delà du nombre inclus dans votre palier est facturé ${euros(4500)}/mois — pas besoin de changer de palier pour ajouter une personne.`,
  },
  {
    question: 'Puis-je changer de palier ou résilier à tout moment ?',
    answer:
      'Oui, sans engagement. Le changement de palier et la résiliation se font directement depuis le portail de facturation, accessible depuis vos réglages.',
  },
  {
    question: 'Mes données sont-elles en sécurité ?',
    answer:
      'Oui : chaque agence a ses propres données, strictement séparées des autres, hébergées chez des fournisseurs basés en Europe.',
  },
]

function CheckIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4 shrink-0 text-accent" aria-hidden="true">
      <path
        d="M4 10.5L8 14.5L16 6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function PlusIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4 shrink-0 text-neutral-400" aria-hidden="true">
      <path d="M10 4v12M4 10h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

export default function Home() {
  const investissementPriceCents = MODULE_PRICE_CENTS.investissement ?? null

  return (
    <main className="flex flex-1 flex-col">
      <header className="sticky top-0 z-10 border-b border-neutral-200 bg-surface/90 backdrop-blur">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-5 py-4 sm:px-8">
          <span className="text-lg font-extrabold tracking-tight text-neutral-900">Rive</span>
          <nav className="hidden items-center gap-6 text-sm font-medium text-neutral-600 sm:flex">
            <a href="#fonctionnalites" className="hover:text-neutral-900">
              Fonctionnalités
            </a>
            <a href="#tarifs" className="hover:text-neutral-900">
              Tarifs
            </a>
            <a href="#faq" className="hover:text-neutral-900">
              Questions fréquentes
            </a>
          </nav>
          <div className="flex items-center gap-2">
            <Link
              href="/login"
              className="rounded-lg px-3 py-2 text-sm font-medium text-neutral-600 hover:bg-neutral-100 sm:px-4"
            >
              Se connecter
            </Link>
            <Link
              href="/signup"
              className="rounded-lg bg-accent px-3 py-2 text-sm font-medium text-accent-ink hover:bg-accent-hover sm:px-4"
            >
              Créer mon agence
            </Link>
          </div>
        </div>
      </header>

      <section className="mx-auto flex w-full max-w-3xl flex-col items-center px-5 py-16 text-center sm:px-8 sm:py-24">
        <span className="rounded-full bg-accent-soft px-3 py-1 text-xs font-semibold text-accent">
          -{LAUNCH_DISCOUNT_PERCENT}% les {LAUNCH_DISCOUNT_MONTHS} premiers mois pour toute nouvelle agence
        </span>
        <h1 className="mt-5 text-4xl font-extrabold tracking-tight text-balance text-neutral-900 sm:text-5xl">
          Le CRM pensé pour les agents immobiliers indépendants et leurs agences
        </h1>
        <p className="mt-5 max-w-xl text-base text-neutral-600 sm:text-lg">
          Prospects, estimations, relances et commissions au même endroit — avec les leads publicitaires, les
          alertes et un assistant IA déjà branchés, pas à construire soi-même.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/signup"
            className="rounded-lg bg-accent px-6 py-3 text-sm font-medium text-accent-ink hover:bg-accent-hover"
          >
            Créer mon agence — essai gratuit {TRIAL_DAYS} jours
          </Link>
          <a
            href="#tarifs"
            className="rounded-lg border border-neutral-300 px-6 py-3 text-sm font-medium text-neutral-700 hover:bg-neutral-100"
          >
            Voir les tarifs
          </a>
        </div>
        <p className="mt-4 text-xs text-neutral-500">Sans engagement, aucune carte bancaire requise pour commencer.</p>
      </section>

      <section className="border-y border-neutral-200 bg-surface py-8">
        <div className="mx-auto w-full max-w-4xl px-5 text-center sm:px-8">
          <p className="text-sm text-neutral-600">
            Conçu et utilisé au quotidien par <span className="font-semibold text-neutral-900">Hevrest</span>, agence
            immobilière active sur le bassin genevois (France et Annecy) — Rive est né d’un vrai besoin d’agent, pas
            d’une idée abstraite de logiciel.
          </p>
        </div>
      </section>

      <section className="py-16 sm:py-20">
        <div className="mx-auto w-full max-w-5xl px-5 sm:px-8">
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2">
            <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-6">
              <h2 className="text-sm font-semibold tracking-wide text-neutral-500 uppercase">Aujourd’hui</h2>
              <ul className="mt-4 flex flex-col gap-3 text-sm text-neutral-600">
                <li>Des prospects éparpillés entre un tableur, des SMS et des post-it.</li>
                <li>Des leads publicitaires copiés à la main depuis Meta.</li>
                <li>Des relances qu’on se promet de faire « plus tard ».</li>
                <li>Des commissions recalculées à la main en fin de mois.</li>
              </ul>
            </div>
            <div className="rounded-2xl border border-accent/30 bg-accent-soft p-6">
              <h2 className="text-sm font-semibold tracking-wide text-accent uppercase">Avec Rive</h2>
              <ul className="mt-4 flex flex-col gap-3 text-sm text-neutral-700">
                <li>Un pipeline unique, par type de projet, partagé avec votre équipe.</li>
                <li>Les leads Meta Ads qui arrivent seuls, déjà classés.</li>
                <li>Des brouillons de relance rédigés automatiquement, prêts à envoyer.</li>
                <li>Des commissions suivies en temps réel, sans tableur à part.</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section id="fonctionnalites" className="border-y border-neutral-200 bg-surface py-16 sm:py-20">
        <div className="mx-auto w-full max-w-6xl px-5 sm:px-8">
          <h2 className="text-center text-2xl font-extrabold tracking-tight text-neutral-900 sm:text-3xl">
            Tout ce qu’il faut pour suivre un prospect jusqu’à la signature
          </h2>
          <div className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map((f) => (
              <div key={f.title} className="rounded-2xl border border-neutral-200 bg-neutral-50 p-5">
                <h3 className="text-sm font-semibold text-neutral-900">{f.title}</h3>
                <p className="mt-2 text-sm text-neutral-600">{f.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 sm:py-20">
        <div className="mx-auto w-full max-w-5xl px-5 sm:px-8">
          <h2 className="text-center text-2xl font-extrabold tracking-tight text-neutral-900 sm:text-3xl">
            De la création de l’agence à la première signature
          </h2>
          <div className="mt-10 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((step, i) => (
              <div key={step.title} className="flex flex-col gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-accent text-sm font-semibold text-accent-ink">
                  {i + 1}
                </span>
                <h3 className="text-sm font-semibold text-neutral-900">{step.title}</h3>
                <p className="text-sm text-neutral-600">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="tarifs" className="border-y border-neutral-200 bg-surface py-16 sm:py-24">
        <div className="mx-auto w-full max-w-5xl px-5 sm:px-8">
          <h2 className="text-center text-2xl font-extrabold tracking-tight text-neutral-900 sm:text-3xl">
            Un palier pour chaque taille d’équipe
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-center text-sm text-neutral-600">
            Les 3 paliers donnent accès à 100% du produit — ils ne diffèrent que par le nombre d’agents inclus et le
            quota de génération IA mensuel.
          </p>

          <div className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-3">
            {(Object.keys(PLAN_COPY) as (keyof typeof PLAN_COPY)[]).map((key) => {
              const plan = PLANS[key]
              const copy = PLAN_COPY[key]
              const price = plan.priceCents ?? 0
              const discounted = launchPriceCents(price)
              return (
                <div
                  key={key}
                  className={`flex flex-col rounded-2xl border p-6 shadow-sm ${
                    copy.highlighted ? 'border-accent bg-surface ring-1 ring-accent' : 'border-neutral-200 bg-surface'
                  }`}
                >
                  {copy.highlighted && (
                    <span className="mb-3 w-fit rounded-full bg-accent-soft px-2.5 py-1 text-xs font-semibold text-accent">
                      Le plus choisi
                    </span>
                  )}
                  <h3 className="text-base font-semibold text-neutral-900">{plan.label}</h3>
                  <p className="mt-1.5 text-sm text-neutral-500">{copy.tagline}</p>

                  <div className="mt-5">
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-extrabold tracking-tight text-neutral-900">
                        {euros(discounted)}
                      </span>
                      <span className="text-sm text-neutral-500">/mois</span>
                    </div>
                    <p className="mt-1 text-xs text-neutral-500">
                      <span className="line-through">{euros(price)}/mois</span> les {LAUNCH_DISCOUNT_MONTHS} premiers
                      mois, puis {euros(price)}/mois
                    </p>
                  </div>

                  <ul className="mt-5 flex flex-col gap-2.5">
                    <li className="flex items-start gap-2 text-sm font-medium text-neutral-900">
                      <CheckIcon />
                      <span>
                        {plan.baseSeats ? `${plan.baseSeats} agents inclus` : '1 agent'}
                        {plan.extraSeatPriceCents && (
                          <span className="font-normal text-neutral-500">
                            {' '}
                            (+{euros(plan.extraSeatPriceCents)}/agent supplémentaire)
                          </span>
                        )}
                      </span>
                    </li>
                    <li className="flex items-start gap-2 text-sm font-medium text-neutral-900">
                      <CheckIcon />
                      <span>
                        {plan.aiMonthlyLimit !== null
                          ? `${plan.aiMonthlyLimit} générations IA / mois`
                          : 'Génération IA illimitée'}
                      </span>
                    </li>
                    {COMMON_PLAN_FEATURES.map((feature) => (
                      <li key={feature} className="flex items-start gap-2 text-sm text-neutral-700">
                        <CheckIcon />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <Link
                    href="/signup"
                    className={`mt-6 rounded-lg px-4 py-2.5 text-center text-sm font-medium ${
                      copy.highlighted
                        ? 'bg-accent text-accent-ink hover:bg-accent-hover'
                        : 'border border-neutral-300 text-neutral-700 hover:bg-neutral-100'
                    }`}
                  >
                    Essayer {TRIAL_DAYS} jours gratuitement
                  </Link>
                </div>
              )
            })}
          </div>

          {investissementPriceCents !== null && (
            <div className="mt-8 flex flex-col items-start gap-4 rounded-2xl border border-dashed border-neutral-300 bg-neutral-50 p-6 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3">
                <PlusIcon />
                <div>
                  <h3 className="text-sm font-semibold text-neutral-900">
                    En option : module {MODULE_LABELS.investissement}
                  </h3>
                  <p className="mt-1 text-sm text-neutral-600">
                    Pour les agences qui accompagnent aussi des investisseurs : pipeline et suivi de projets
                    d’investissement dédiés, en plus de votre palier. Activé sur demande.
                  </p>
                </div>
              </div>
              <div className="shrink-0 text-sm font-semibold text-neutral-900">
                {euros(investissementPriceCents)}/mois
              </div>
            </div>
          )}
        </div>
      </section>

      <section id="faq" className="py-16 sm:py-20">
        <div className="mx-auto w-full max-w-3xl px-5 sm:px-8">
          <h2 className="text-center text-2xl font-extrabold tracking-tight text-neutral-900 sm:text-3xl">
            Questions fréquentes
          </h2>
          <div className="mt-10 flex flex-col gap-3">
            {FAQ.map((item) => (
              <details
                key={item.question}
                className="group rounded-2xl border border-neutral-200 bg-surface p-5 shadow-sm"
              >
                <summary className="flex cursor-pointer items-center justify-between gap-3 text-sm font-semibold text-neutral-900 marker:content-none">
                  {item.question}
                  <span className="shrink-0 text-neutral-400 transition-transform group-open:rotate-45">
                    <PlusIcon />
                  </span>
                </summary>
                <p className="mt-3 text-sm text-neutral-600">{item.answer}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-neutral-200 bg-accent-soft py-16 sm:py-20">
        <div className="mx-auto flex w-full max-w-3xl flex-col items-center px-5 text-center sm:px-8">
          <h2 className="text-2xl font-extrabold tracking-tight text-neutral-900 sm:text-3xl">
            Prêt à essayer Rive {TRIAL_DAYS} jours, sans engagement ?
          </h2>
          <p className="mt-3 max-w-xl text-sm text-neutral-600">
            Créez votre agence en quelques minutes. Aucune carte bancaire requise pour commencer.
          </p>
          <Link
            href="/signup"
            className="mt-6 rounded-lg bg-accent px-6 py-3 text-sm font-medium text-accent-ink hover:bg-accent-hover"
          >
            Créer mon agence
          </Link>
        </div>
      </section>

      <footer className="border-t border-neutral-200 py-10">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-center gap-2 px-5 text-center text-xs text-neutral-500 sm:px-8">
          <span>Rive — CRM immobilier</span>
          <a href="mailto:contact@rive.app" className="hover:text-neutral-700 hover:underline">
            contact@rive.app
          </a>
        </div>
      </footer>
    </main>
  )
}
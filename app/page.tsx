import Link from 'next/link'
import { PLANS } from '@/lib/rive/billing/plans'

// Page d'accueil publique — seule page du site accessible sans connexion.
// Sert aussi de "vitrine" pour toute vérification externe (ex. Stripe, lors
// de l'activation du compte de paiement) qui a besoin de comprendre ce que
// Rive vend avant d'avoir un compte : d'où une vraie description du produit
// et des paliers, pas seulement les boutons de connexion d'avant.
//
// Tarifs volontairement absents (voir lib/rive/billing/plans.ts) : les
// chiffres définitifs n'ont pas encore été validés avec de premiers agents
// indépendants, donc cette page affiche les paliers par leurs limites et
// fonctionnalités, pas par un prix — "Nous contacter" en attendant.

const FEATURES: { title: string; description: string }[] = [
  {
    title: 'Pipeline par type de projet',
    description:
      'Vendeurs, acheteurs et investisseurs suivis dans des tableaux séparés, avec les étapes propres à chaque type de transaction — de la prise de contact au mandat signé.',
  },
  {
    title: 'Leads Meta Ads en direct',
    description:
      'Chaque formulaire rempli sur une campagne Facebook ou Instagram arrive automatiquement dans le bon tableau, avec toutes les réponses du prospect déjà renseignées sur sa fiche.',
  },
  {
    title: 'Alertes où vous êtes déjà',
    description:
      'Email, notification push sur le téléphone et WhatsApp pour ne jamais manquer un nouveau prospect, un rendez-vous du jour ou une échéance de mandat.',
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
    title: 'Mandats et documents générés',
    description:
      'Estimation, mandat, fiche bien : les documents se génèrent depuis les informations déjà saisies, sans ressaisie ni modèle à remplir à la main.',
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

const PLAN_COPY: Record<'solo' | 'equipe' | 'agence', { tagline: string; features: string[] }> = {
  solo: {
    tagline: 'Pour un agent indépendant qui gère seul ses mandats.',
    features: ['1 utilisateur', 'Pipeline complet (vendeurs, acheteurs, investisseurs)', 'Alertes email et push'],
  },
  equipe: {
    tagline: 'Pour une petite équipe qui partage ses prospects et son pipeline.',
    features: ['Jusqu’à 5 utilisateurs', 'Tout Solo', 'Alertes WhatsApp', 'Connexion Meta Ads'],
  },
  agence: {
    tagline: 'Pour une agence qui veut tout son réseau sur la même plateforme.',
    features: ['Utilisateurs illimités', 'Tout Équipe', 'Génération de texte par IA sans plafond mensuel'],
  },
}

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

export default function Home() {
  return (
    <main className="flex flex-1 flex-col">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-5 py-6 sm:px-8">
        <span className="text-lg font-extrabold tracking-tight text-neutral-900">Rive</span>
        <nav className="flex items-center gap-2">
          <Link
            href="/login"
            className="rounded-lg px-4 py-2 text-sm font-medium text-neutral-600 hover:bg-neutral-100"
          >
            Se connecter
          </Link>
          <Link
            href="/signup"
            className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-ink hover:bg-accent-hover"
          >
            Créer une agence
          </Link>
        </nav>
      </header>

      <section className="mx-auto flex w-full max-w-3xl flex-col items-center px-5 py-16 text-center sm:px-8 sm:py-24">
        <h1 className="text-4xl font-extrabold tracking-tight text-balance text-neutral-900 sm:text-5xl">
          Le CRM pensé pour les agents immobiliers indépendants et leurs agences
        </h1>
        <p className="mt-5 max-w-xl text-base text-neutral-600 sm:text-lg">
          Prospects, mandats, relances et commissions au même endroit — avec les leads publicitaires, les alertes et
          un assistant IA déjà branchés, pas à construire soi-même.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/signup"
            className="rounded-lg bg-accent px-6 py-3 text-sm font-medium text-accent-ink hover:bg-accent-hover"
          >
            Créer mon agence — essai gratuit 30 jours
          </Link>
          <Link
            href="/login"
            className="rounded-lg border border-neutral-300 px-6 py-3 text-sm font-medium text-neutral-700 hover:bg-neutral-100"
          >
            Se connecter
          </Link>
        </div>
        <p className="mt-4 text-xs text-neutral-500">Sans engagement, aucune carte bancaire requise pour commencer.</p>
      </section>

      <section className="border-y border-neutral-200 bg-surface py-16 sm:py-20">
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

      <section id="tarifs" className="py-16 sm:py-24">
        <div className="mx-auto w-full max-w-5xl px-5 sm:px-8">
          <h2 className="text-center text-2xl font-extrabold tracking-tight text-neutral-900 sm:text-3xl">
            Un palier pour chaque taille d’équipe
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-center text-sm text-neutral-600">
            Tarifs communiqués sur demande, le temps de les ajuster avec les premiers agents qui rejoignent Rive —
            écrivez-nous, on en discute directement.
          </p>

          <div className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-3">
            {(Object.keys(PLAN_COPY) as (keyof typeof PLAN_COPY)[]).map((key) => {
              const plan = PLANS[key]
              const copy = PLAN_COPY[key]
              return (
                <div key={key} className="flex flex-col rounded-2xl border border-neutral-200 bg-surface p-6 shadow-sm">
                  <h3 className="text-base font-semibold text-neutral-900">{plan.label}</h3>
                  <p className="mt-1.5 text-sm text-neutral-500">{copy.tagline}</p>
                  <ul className="mt-5 flex flex-col gap-2.5">
                    {copy.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-2 text-sm text-neutral-700">
                        <CheckIcon />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <Link
                    href="/signup"
                    className="mt-6 rounded-lg border border-neutral-300 px-4 py-2.5 text-center text-sm font-medium text-neutral-700 hover:bg-neutral-100"
                  >
                    Essayer 30 jours
                  </Link>
                </div>
              )
            })}
          </div>
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
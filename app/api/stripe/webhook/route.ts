import { NextResponse, type NextRequest } from 'next/server'
import type Stripe from 'stripe'
import { createAdminClient } from '@/lib/supabase/admin'
import { getStripeClient, planForPriceId } from '@/lib/rive/billing/stripe'

// Reçoit les événements d'abonnement Stripe (paiement réussi, changement de
// palier, résiliation...) et synchronise la ligne `agencies` correspondante.
// Toujours répondre vite et avec un 200 une fois l'événement traité — même
// pour un type qu'on ignore volontairement — sinon Stripe réessaie
// indéfiniment (même principe que le webhook Meta, voir
// app/api/webhooks/meta/route.ts).
export async function POST(request: NextRequest) {
  const stripe = getStripeClient()
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
  if (!stripe || !webhookSecret) {
    // Ne devrait jamais être appelé tant que cette URL n'a pas été
    // renseignée côté Stripe, mais on répond proprement plutôt que de
    // planter si c'est le cas (ex. déploiement sans Stripe configuré).
    return new NextResponse('Stripe non configuré', { status: 503 })
  }

  const rawBody = await request.text()
  const signature = request.headers.get('stripe-signature')

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature || '', webhookSecret)
  } catch (err) {
    console.error('[stripe] Signature webhook invalide :', err)
    return new NextResponse('Invalid signature', { status: 403 })
  }

  const supabase = createAdminClient()

  try {
    switch (event.type) {
      // Paiement initial validé — on associe le client Stripe à l'agence et
      // on active son palier.
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        const agencyId = session.client_reference_id || session.metadata?.agency_id
        const customerId = typeof session.customer === 'string' ? session.customer : session.customer?.id
        const subscriptionId =
          typeof session.subscription === 'string' ? session.subscription : session.subscription?.id

        if (!agencyId || !customerId) {
          console.error('[stripe] checkout.session.completed sans agency_id/customer exploitable :', session.id)
          break
        }

        await supabase
          .from('agencies')
          .update({
            stripe_customer_id: customerId,
            stripe_subscription_id: subscriptionId ?? null,
            subscription_status: 'active',
            trial_ends_at: null,
            ...(session.metadata?.plan ? { plan: session.metadata.plan } : {}),
          })
          .eq('id', agencyId)
        break
      }

      // Changement de statut (paiement en retard, résiliation programmée,
      // réactivation...) ou changement de palier fait depuis le portail
      // Stripe plutôt que depuis Rive — le palier est redéduit du prix
      // réellement souscrit plutôt que d'une métadonnée qui pourrait être
      // périmée après un tel changement.
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        const customerId =
          typeof subscription.customer === 'string' ? subscription.customer : subscription.customer.id
        const priceId = subscription.items.data[0]?.price?.id
        const plan = priceId ? planForPriceId(priceId) : null

        await supabase
          .from('agencies')
          .update({
            subscription_status: mapStripeStatus(subscription.status, event.type),
            ...(plan ? { plan } : {}),
          })
          .eq('stripe_customer_id', customerId)
        break
      }

      default:
        // Type d'événement non géré — ignoré volontairement (ex.
        // invoice.payment_succeeded, dont on n'a pas encore besoin).
        break
    }
  } catch (err) {
    console.error(`[stripe] Échec du traitement de l'événement ${event.type} :`, err)
    // 200 quand même : une erreur de notre côté ne doit pas déclencher une
    // avalanche de réessais Stripe — l'erreur est déjà loguée pour
    // investigation manuelle.
  }

  return NextResponse.json({ received: true })
}

function mapStripeStatus(
  status: Stripe.Subscription.Status,
  eventType: 'customer.subscription.updated' | 'customer.subscription.deleted'
): 'trialing' | 'active' | 'past_due' | 'canceled' {
  if (eventType === 'customer.subscription.deleted') return 'canceled'
  switch (status) {
    case 'trialing':
      return 'trialing'
    case 'active':
      return 'active'
    case 'past_due':
    case 'unpaid':
      return 'past_due'
    default:
      // incomplete / incomplete_expired / paused : plus d'abonnement
      // effectif, traité comme résilié.
      return 'canceled'
  }
}
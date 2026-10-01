'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createCheckoutSession, createPortalSession, isPurchasablePlan } from '@/lib/rive/billing/stripe'

export type BillingState = { error?: string } | undefined

function appUrl(): string {
  return (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000').replace(/\/$/, '')
}

async function getAgencyContext() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from('profiles')
    .select('agency_id, role')
    .eq('id', user.id)
    .single()
  if (!profile?.agency_id) return null

  return { supabase, userEmail: user.email ?? '', agencyId: profile.agency_id, isOwner: profile.role === 'owner' }
}

// Démarre un paiement Stripe Checkout pour passer au palier demandé. Réservé
// au propriétaire de l'agence (c'est lui qui gère la facturation) — un
// agent membre ne doit pas pouvoir changer l'abonnement de toute l'agence.
export async function startCheckoutAction(_prevState: BillingState, formData: FormData): Promise<BillingState> {
  const ctx = await getAgencyContext()
  if (!ctx) return { error: 'Session expirée, reconnecte-toi.' }
  if (!ctx.isOwner) return { error: "Seul le propriétaire de l'agence peut gérer l'abonnement." }

  const plan = String(formData.get('plan') || '')
  if (!isPurchasablePlan(plan)) return { error: 'Palier invalide.' }

  const { data: agency } = await ctx.supabase
    .from('agencies')
    .select('stripe_customer_id')
    .eq('id', ctx.agencyId)
    .single()

  let checkoutUrl: string
  try {
    checkoutUrl = await createCheckoutSession({
      agencyId: ctx.agencyId,
      plan,
      customerEmail: ctx.userEmail,
      existingCustomerId: agency?.stripe_customer_id ?? null,
      successUrl: `${appUrl()}/dashboard/settings?section=usage&stripe=success`,
      cancelUrl: `${appUrl()}/dashboard/settings?section=usage&stripe=cancel`,
    })
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Impossible de démarrer le paiement.' }
  }

  redirect(checkoutUrl)
}

// Ouvre le portail de facturation Stripe (changer de palier, mettre à jour
// la carte, voir les factures, résilier) pour une agence déjà cliente.
export async function openBillingPortalAction(_prevState: BillingState, _formData: FormData): Promise<BillingState> {
  const ctx = await getAgencyContext()
  if (!ctx) return { error: 'Session expirée, reconnecte-toi.' }
  if (!ctx.isOwner) return { error: "Seul le propriétaire de l'agence peut gérer l'abonnement." }

  const { data: agency } = await ctx.supabase
    .from('agencies')
    .select('stripe_customer_id')
    .eq('id', ctx.agencyId)
    .single()
  if (!agency?.stripe_customer_id) return { error: 'Aucun abonnement Stripe actif pour cette agence.' }

  let portalUrl: string
  try {
    portalUrl = await createPortalSession({
      customerId: agency.stripe_customer_id,
      returnUrl: `${appUrl()}/dashboard/settings?section=usage`,
    })
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Impossible d'ouvrir le portail Stripe." }
  }

  redirect(portalUrl)
}
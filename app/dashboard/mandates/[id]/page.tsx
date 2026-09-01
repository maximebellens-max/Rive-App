import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import {
  mandateEndDate,
  mandateNoticeDate,
  mandateIsActive,
  exclusivityLabel,
  formatDate,
} from '@/lib/rive/mandates'
import { leadMatchesBien, bienIsActive, type MatchLead, type MatchMandate } from '@/lib/rive/matching'
import MandateEditForm from './mandate-edit-form'
import EstimationSection from './estimation-section'
import PartiesSection from './parties-section'
import DeleteMandateButton from './delete-mandate-button'
import GenerateMandateButton from './generate-mandate-button'
import ActivateMandateButton from './activate-mandate-button'
import VisitsSection from './visits-section'
import OffersSection from './offers-section'
import DiffusionSection from './diffusion-section'

export default async function MandateDetailPage({ params }: PageProps<'/dashboard/mandates/[id]'>) {
  const { id } = await params
  const supabase = await createClient()

  // mandate/comparables/parties ne dépendent que de l'id de l'URL : partent
  // tous les 3 en parallèle plutôt qu'à la suite les uns des autres.
  const [{ data: mandate }, { data: comparables }, { data: parties }] = await Promise.all([
    supabase.from('mandates').select('*').eq('id', id).single(),
    supabase
      .from('dvf_comparables')
      .select('id, address, sale_date, surface, land_surface, price, is_active_listing')
      .eq('mandate_id', id)
      .order('sale_date', { ascending: false }),
    supabase.from('mandate_parties').select('*').eq('mandate_id', id).order('position', { ascending: true }),
  ])
  if (!mandate) notFound()

  const endDate = mandateEndDate(mandate.signed_date, mandate.duration_months)
  const noticeDate = mandateNoticeDate(mandate.signed_date, mandate.duration_months, mandate.renewal_notice_days)
  const active = mandateIsActive(mandate.stage)

  let matchingBuyers: { id: string; name: string; budget: number | null }[] = []

  let visits: {
    id: string
    lead_id: string | null
    buyer_name: string
    visit_date: string | null
    feedback: string
    lead_name?: string
  }[] = []
  let offers: {
    id: string
    lead_id: string | null
    buyer_name: string
    amount: number | null
    offer_date: string | null
    status: string
    lead_name?: string
  }[] = []
  let buyerOptions: { id: string; name: string }[] = []

  // Visites, offres, diffusion et acheteurs correspondants n'ont de sens
  // qu'une fois le bien réellement en commercialisation — inutile de les
  // charger tant que le mandat n'est qu'un brouillon d'estimation.
  if (mandate.type === 'vente' && !mandate.is_draft) {
    // Une seule requête "acheteurs" (avec les colonnes de correspondance),
    // réutilisée à la fois pour la liste déroulante (buyerOptions) et pour
    // le calcul des acheteurs correspondants — au lieu de 2 requêtes quasi
    // identiques comme avant.
    const [{ data: visitRows }, { data: offerRows }, { data: buyers }] = await Promise.all([
      supabase
        .from('mandate_visits')
        .select('id, lead_id, buyer_name, visit_date, feedback, leads ( name )')
        .eq('mandate_id', id)
        .order('visit_date', { ascending: false }),
      supabase
        .from('mandate_offers')
        .select('id, lead_id, buyer_name, amount, offer_date, status, leads ( name )')
        .eq('mandate_id', id)
        .order('offer_date', { ascending: false }),
      supabase
        .from('leads')
        .select('id, name, category, budget, critere_type, critere_lieu, surface_min, pieces_min')
        .eq('category', 'acheteur')
        .order('name', { ascending: true }),
    ])

    visits = (visitRows ?? []).map((v) => ({
      ...v,
      lead_name: (v.leads as unknown as { name: string } | null)?.name,
    }))
    offers = (offerRows ?? []).map((o) => ({
      ...o,
      lead_name: (o.leads as unknown as { name: string } | null)?.name,
    }))
    buyerOptions = (buyers ?? []).map((b) => ({ id: b.id, name: b.name }))

    if (bienIsActive(mandate as MatchMandate)) {
      matchingBuyers = (buyers ?? []).filter((l) => leadMatchesBien(l as MatchLead, mandate as MatchMandate))
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <Link href="/dashboard/mandates" className="text-sm text-neutral-500 hover:underline">
            ← Mandats
          </Link>
          <h1 className="mt-1 flex items-center gap-2 text-xl font-semibold tracking-tight">
            {mandate.address || mandate.property_type || 'Mandat sans adresse'}
            {mandate.is_draft && (
              <span className="rounded-full bg-warn-soft px-2 py-0.5 text-xs font-medium text-warn">
                Brouillon — estimation en cours
              </span>
            )}
          </h1>
          <p className="mt-1 text-sm text-neutral-500">
            {mandate.type === 'vente' ? 'Mandat de vente' : 'Mandat de recherche'}
            {exclusivityLabel(mandate.exclusivity) ? ` · ${exclusivityLabel(mandate.exclusivity)}` : ''}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {mandate.type === 'vente' && (
            <a
              href={`/dashboard/mandates/${mandate.id}/fiche`}
              className="rounded-lg border border-neutral-300 px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-100"
            >
              Fiche bien (.html)
            </a>
          )}
          {mandate.is_draft && <ActivateMandateButton mandateId={mandate.id} />}
          {!mandate.is_draft && <GenerateMandateButton mandateId={mandate.id} />}
          <DeleteMandateButton mandateId={mandate.id} />
        </div>
      </div>

      {active && endDate && (
        <div className="rounded-2xl border border-neutral-200 bg-surface p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-neutral-900">Échéance du mandat</h2>
          <p className="mt-2 text-sm text-neutral-600">
            Le mandat se termine le <span className="font-medium">{formatDate(endDate)}</span>.
            {noticeDate && (
              <>
                {' '}
                Pense à te positionner avant le <span className="font-medium">{formatDate(noticeDate)}</span>
                {mandate.tacit_renewal
                  ? " si tu ne souhaites pas de reconduction tacite."
                  : ' pour anticiper le renouvellement.'}
              </>
            )}
          </p>
        </div>
      )}

      {matchingBuyers.length > 0 && (
        <div className="rounded-2xl border border-neutral-200 bg-surface p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-neutral-900">
            🤝 {matchingBuyers.length} acheteur{matchingBuyers.length > 1 ? 's' : ''} correspondant
            {matchingBuyers.length > 1 ? 's' : ''}
          </h2>
          <div className="mt-3 flex flex-col gap-2">
            {matchingBuyers.map((b) => (
              <Link
                key={b.id}
                href={`/dashboard/prospects/${b.id}`}
                className="flex items-center justify-between rounded-lg border border-neutral-200 px-3 py-2 text-sm hover:border-neutral-300 hover:bg-neutral-50"
              >
                <span className="font-medium text-neutral-900">{b.name}</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      <PartiesSection mandateId={mandate.id} parties={parties ?? []} />

      <div className="rounded-2xl border border-neutral-200 bg-surface p-6 shadow-sm">
        <MandateEditForm mandate={mandate} />
      </div>

      {mandate.type === 'vente' && (
        <EstimationSection
          mandateId={mandate.id}
          mandate={mandate}
          comparables={comparables ?? []}
          matchingBuyersCount={matchingBuyers.length}
        />
      )}

      {mandate.type === 'vente' && !mandate.is_draft && (
        <>
          <VisitsSection mandateId={mandate.id} visits={visits} buyerOptions={buyerOptions} />
          <OffersSection mandateId={mandate.id} offers={offers} buyerOptions={buyerOptions} />
          <DiffusionSection
            mandateId={mandate.id}
            diffusion={(mandate.diffusion as Record<string, string>) || {}}
            adPlatform={mandate.ad_platform}
            adCampaign={mandate.ad_campaign}
            adDate={mandate.ad_date}
          />
        </>
      )}
    </div>
  )
}
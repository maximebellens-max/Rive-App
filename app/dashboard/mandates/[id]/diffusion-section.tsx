import { updateDiffusion } from '@/app/actions/mandate-activity'
import { DIFFUSION_PORTALS, AD_PLATFORMS } from '@/lib/rive/diffusion'

const inputClass =
  'rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900'
const labelClass = 'text-sm font-medium text-neutral-700'

export default function DiffusionSection({
  mandateId,
  diffusion,
  adPlatform,
  adCampaign,
  adDate,
}: {
  mandateId: string
  diffusion: Record<string, string>
  adPlatform: string
  adCampaign: string
  adDate: string | null
}) {
  return (
    <form action={updateDiffusion.bind(null, mandateId)} className="flex flex-col gap-4 rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
      <h2 className="text-sm font-semibold text-neutral-900">Diffusion</h2>
      <p className="text-xs text-neutral-500">
        Renseigne la date de mise en ligne sur chaque portail — utile pour savoir quels biens n&apos;ont pas été
        rafraîchis depuis longtemps.
      </p>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {DIFFUSION_PORTALS.map((portal) => (
          <div key={portal} className="flex flex-col gap-1.5">
            <label className={labelClass}>{portal}</label>
            <input name={`portal_${portal}`} type="date" defaultValue={diffusion[portal] || ''} className={inputClass} />
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-3 border-t border-neutral-100 pt-4 sm:grid-cols-3">
        <div className="flex flex-col gap-1.5">
          <label className={labelClass}>Campagne publicitaire</label>
          <select name="ad_platform" defaultValue={adPlatform} className={inputClass}>
            <option value="">—</option>
            {AD_PLATFORMS.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <label className={labelClass}>Nom de la campagne</label>
          <input name="ad_campaign" defaultValue={adCampaign} className={inputClass} />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className={labelClass}>Date de lancement</label>
          <input name="ad_date" type="date" defaultValue={adDate ?? ''} className={inputClass} />
        </div>
      </div>

      <button type="submit" className="w-fit rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-700">
        Enregistrer la diffusion
      </button>
    </form>
  )
}

import LandingPageRow from './landing-page-row'
import LandingPageForm from './landing-page-form'

type LandingPage = {
  id: string
  token: string
  label: string
  url: string
  category: string
  owner_id: string | null
}

export default function LandingPagesSection({
  landingPages,
  members,
  appUrl,
}: {
  landingPages: LandingPage[]
  members: { id: string; full_name: string }[]
  appUrl: string
}) {
  return (
    <div className="flex flex-col gap-4 border-t border-neutral-100 pt-6">
      <div>
        <h2 className="text-sm font-semibold text-neutral-900">Landing pages — Leads automatiques</h2>
        <p className="mt-1 text-xs text-neutral-500">
          Une landing page externe (Netlify ou autre) ne peut pas se connecter à Rive toute seule, comme Meta : un
          petit bout de code doit être ajouté à sa page pour que chaque soumission de formulaire arrive
          automatiquement ici, sur le bon tableau. Ajoute une page ci-dessous pour obtenir son lien et le code à
          transmettre à qui la gère.
        </p>
      </div>

      {landingPages.length > 0 && (
        <div className="flex flex-col gap-2">
          {landingPages.map((lp) => (
            <LandingPageRow key={lp.id} landingPage={lp} members={members} appUrl={appUrl} />
          ))}
        </div>
      )}

      <LandingPageForm members={members} />
    </div>
  )
}
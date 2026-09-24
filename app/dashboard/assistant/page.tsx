import AssistantChat from './assistant-chat'

export default function AssistantPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Assistant IA</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Cherche un prospect, ajoute une note, fais-le avancer dans son pipeline, mets à jour un champ de sa
          fiche, crée un nouveau prospect, un rendez-vous, ou demande une statistique — au clavier ou au
          micro. Chaque action est appliquée tout de suite, avec une confirmation.
        </p>
      </div>

      <AssistantChat />
    </div>
  )
}
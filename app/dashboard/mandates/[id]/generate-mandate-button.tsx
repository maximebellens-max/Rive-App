export default function GenerateMandateButton({ mandateId }: { mandateId: string }) {
  return (
    <a
      href={`/dashboard/mandates/${mandateId}/pdf`}
      className="rounded-lg border border-neutral-300 px-3 py-1.5 text-sm text-neutral-700 hover:bg-neutral-100"
    >
      Télécharger le mandat (PDF)
    </a>
  )
}

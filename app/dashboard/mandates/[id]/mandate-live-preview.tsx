// Aperçu du contrat qui se remplit en direct pendant la saisie — même
// principe que la rédaction "texte à trous" de MyNotary (voir les captures
// envoyées par Maxime) : chaque donnée saisie à gauche apparaît en
// surbrillance dans le texte légal à droite, au lieu d'un formulaire séparé
// suivi d'un PDF généré à la fin. Purement un rendu : tout le texte vient de
// buildVenteSections (lib/rive/mandate-document-model.ts), la même logique
// qui produit le PDF final (mandate-pdf.tsx) — jamais de divergence entre
// ce que l'agent voit ici et ce qui sort en PDF.
import type { DocSection, Token } from '@/lib/rive/mandate-document-model'

function TokenSpan({ tok }: { tok: Token }) {
  if (tok.kind === 'text') return <>{tok.text}</>
  return (
    <span
      className={
        tok.empty
          ? 'rounded bg-warn-soft px-1 py-0.5 text-warn'
          : 'rounded bg-accent-soft px-1 py-0.5 font-medium text-accent'
      }
    >
      {tok.text}
    </span>
  )
}

export default function MandateLivePreview({
  title,
  subtitle,
  mandantBlock,
  mandataireBlock,
  sections,
}: {
  title: string
  subtitle: string
  mandantBlock: React.ReactNode
  mandataireBlock: React.ReactNode
  sections: DocSection[]
}) {
  return (
    <div className="flex flex-col gap-5 rounded-2xl border border-neutral-200 bg-surface p-6 text-sm leading-relaxed text-neutral-800 shadow-sm">
      <div className="border-b border-neutral-100 pb-4">
        <h2 className="text-base font-semibold uppercase tracking-tight text-neutral-900">{title}</h2>
        <p className="mt-1 text-xs text-neutral-500">{subtitle}</p>
      </div>

      <section className="flex flex-col gap-3">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-neutral-400">Les parties à l&apos;acte</h3>
        <div className="flex flex-col gap-3">
          <div>
            <p className="text-xs font-semibold text-neutral-500">Le Mandant</p>
            {mandantBlock}
          </div>
          <div>
            <p className="text-xs font-semibold text-neutral-500">Le Mandataire</p>
            {mandataireBlock}
          </div>
        </div>
      </section>

      {sections.map((s) => (
        <section key={s.id} className="flex flex-col gap-2 border-t border-neutral-100 pt-4">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-neutral-400">{s.title}</h3>
          {s.paragraphs.map((p, i) => (
            <p key={i}>
              {p.map((tok, j) => (
                <TokenSpan key={j} tok={tok} />
              ))}
            </p>
          ))}
        </section>
      ))}

      <p className="border-t border-neutral-100 pt-4 text-xs text-neutral-400">
        Suivi des mentions légales obligatoires (non-discrimination, données personnelles, droit de rétractation…) —
        identiques sur chaque mandat, elles n&apos;apparaissent que dans le PDF final généré.
      </p>
    </div>
  )
}
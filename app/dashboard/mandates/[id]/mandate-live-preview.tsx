'use client'

// Aperçu du contrat qui se remplit en direct pendant la saisie — même
// principe que la rédaction "texte à trous" de MyNotary (voir les captures
// envoyées par Maxime) : chaque donnée saisie à gauche apparaît en
// surbrillance dans le texte légal à droite, au lieu d'un formulaire séparé
// suivi d'un PDF généré à la fin. Purement un rendu : tout le texte vient de
// buildVenteSections (lib/rive/mandate-document-model.ts), la même logique
// qui produit le PDF final (mandate-pdf.tsx) — jamais de divergence entre
// ce que l'agent voit ici et ce qui sort en PDF.
//
// Chaque valeur en surbrillance est aussi éditable directement ici : un
// clic la transforme en petit champ de saisie (texte, nombre ou liste selon
// le champ — voir FieldMeta), et la modification remonte à onEdit, qui la
// répercute sur le vrai champ du formulaire à gauche (voir
// mandate-vente-workspace.tsx) pour qu'elle soit bien enregistrée au
// prochain "Enregistrer" — sans dupliquer la saisie.
import { useState } from 'react'
import type { DocSection, Token } from '@/lib/rive/mandate-document-model'

function TokenSpan({ tok, onEdit }: { tok: Token; onEdit?: (field: string, value: string) => void }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')

  if (tok.kind === 'text') return <>{tok.text}</>

  const chipClass = tok.empty
    ? 'rounded bg-warn-soft px-1 py-0.5 text-warn'
    : 'rounded bg-accent-soft px-1 py-0.5 font-medium text-accent'

  // Pas de gestionnaire d'édition fourni (réutilisation future en lecture
  // seule) : on retombe sur le simple surlignage d'origine.
  if (!onEdit) return <span className={chipClass}>{tok.text}</span>

  // Capturé dans une variable simple avant la fermeture ci-dessous : dans un
  // closure, TypeScript ne conserve pas le rétrécissement de type obtenu par
  // le early-return plus haut (tok.kind === 'field').
  const field = tok.field
  function commit(value: string) {
    onEdit!(field, value)
    setEditing(false)
  }

  if (editing) {
    const editClass =
      'rounded border border-accent bg-white px-1 py-0.5 text-sm text-neutral-900 outline-none focus:ring-1 focus:ring-accent'
    if (tok.meta.kind === 'select') {
      return (
        <select autoFocus className={editClass} defaultValue={tok.raw} onChange={(e) => commit(e.target.value)} onBlur={() => setEditing(false)}>
          <option value="">—</option>
          {tok.meta.options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      )
    }
    if (tok.meta.kind === 'textarea') {
      return (
        <textarea
          autoFocus
          rows={2}
          className={`${editClass} block w-full`}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={() => commit(draft)}
          onKeyDown={(e) => e.key === 'Escape' && setEditing(false)}
        />
      )
    }
    const width = tok.field === 'address' ? 'w-56' : tok.meta.kind === 'number' ? 'w-20' : 'w-40'
    return (
      <input
        autoFocus
        type={tok.meta.kind === 'number' ? 'number' : 'text'}
        step={tok.meta.kind === 'number' ? (tok.meta.step ?? 1) : undefined}
        className={`${editClass} ${width}`}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onFocus={(e) => e.target.select()}
        onBlur={() => commit(draft)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault()
            commit(draft)
          }
          if (e.key === 'Escape') setEditing(false)
        }}
      />
    )
  }

  return (
    <span
      role="button"
      tabIndex={0}
      title="Cliquer pour modifier"
      onClick={() => {
        setDraft(tok.raw)
        setEditing(true)
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          setDraft(tok.raw)
          setEditing(true)
        }
      }}
      className={`${chipClass} cursor-text underline decoration-dotted decoration-1 underline-offset-2 hover:opacity-80`}
    >
      {tok.text}
    </span>
  )
}

export default function MandateLivePreview({
  logoUrl,
  agencyName,
  title,
  subtitle,
  mandantBlock,
  mandataireBlock,
  sections,
  onEdit,
}: {
  logoUrl?: string
  agencyName?: string
  title: string
  subtitle: string
  mandantBlock: React.ReactNode
  mandataireBlock: React.ReactNode
  sections: DocSection[]
  onEdit?: (field: string, value: string) => void
}) {
  return (
    <div className="flex flex-col gap-5 rounded-2xl border border-neutral-200 bg-surface p-6 text-sm leading-relaxed text-neutral-800 shadow-sm">
      <div className="border-b border-neutral-100 pb-4">
        {logoUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={logoUrl} alt={agencyName || ''} className="mb-3 h-10 w-auto max-w-[200px] object-contain" />
        )}
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
                <TokenSpan key={j} tok={tok} onEdit={onEdit} />
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
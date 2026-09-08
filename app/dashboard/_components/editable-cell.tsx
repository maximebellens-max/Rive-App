'use client'

// Cellules éditables réutilisées par les tableaux de suivi denses
// (Ameublement, Cuisine, Travaux) : édition directe dans la cellule, sans
// ouvrir de fiche séparée — même principe que le renommage en ligne des
// colonnes de pipeline (onBlur / onChange déclenche la sauvegarde).

export function EditableText({
  value,
  onSave,
  placeholder,
  width = 'w-32',
}: {
  value: string
  onSave: (v: string) => void
  placeholder?: string
  width?: string
}) {
  return (
    <input
      type="text"
      defaultValue={value}
      placeholder={placeholder}
      onBlur={(e) => {
        const v = e.target.value.trim()
        if (v !== value) onSave(v)
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
      }}
      className={`${width} rounded border border-transparent bg-transparent px-1.5 py-1 text-xs outline-none hover:border-neutral-200 focus:border-accent focus:bg-surface`}
    />
  )
}

export function EditableNumber({
  value,
  onSave,
  width = 'w-20',
  suffix,
}: {
  value: number | null
  onSave: (v: number | null) => void
  width?: string
  suffix?: string
}) {
  return (
    <div className="flex items-center gap-1">
      <input
        type="number"
        defaultValue={value ?? ''}
        onBlur={(e) => {
          const raw = e.target.value.trim()
          const v = raw === '' ? null : Number(raw)
          if ((v ?? null) !== (value ?? null)) onSave(isNaN(v as number) ? null : v)
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
        }}
        className={`${width} rounded border border-transparent bg-transparent px-1.5 py-1 text-right text-xs tabular-nums outline-none hover:border-neutral-200 focus:border-accent focus:bg-surface`}
      />
      {suffix && <span className="text-[10px] text-neutral-400">{suffix}</span>}
    </div>
  )
}

export function EditableDate({ value, onSave }: { value: string | null; onSave: (v: string | null) => void }) {
  return (
    <input
      type="date"
      defaultValue={value ?? ''}
      onChange={(e) => onSave(e.target.value || null)}
      className="w-32 rounded border border-transparent bg-transparent px-1 py-1 text-xs outline-none hover:border-neutral-200 focus:border-accent focus:bg-surface"
    />
  )
}

const SELECT_TONE_CLASS: Record<string, string> = {
  neutral: 'bg-neutral-100 text-neutral-600',
  warn: 'bg-amber-50 text-amber-700',
  danger: 'bg-red-50 text-red-700',
  success: 'bg-emerald-50 text-emerald-700',
  info: 'bg-sky-50 text-sky-700',
}

export type SelectOption = { value: string; label: string; tone?: keyof typeof SELECT_TONE_CLASS }

export function EditableSelect({
  value,
  options,
  onSave,
}: {
  value: string
  options: SelectOption[]
  onSave: (v: string) => void
}) {
  const current = options.find((o) => o.value === value)
  const toneClass = SELECT_TONE_CLASS[current?.tone ?? 'neutral']

  return (
    <select
      value={value}
      onChange={(e) => onSave(e.target.value)}
      className={`rounded-full border-0 px-2 py-1 text-[11px] font-medium outline-none ${toneClass}`}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  )
}

export function EditableCheck({ checked, onSave, title }: { checked: boolean; onSave: (v: boolean) => void; title: string }) {
  return (
    <label className="inline-flex cursor-pointer items-center gap-1 text-[10px] text-neutral-500" title={title}>
      <input type="checkbox" checked={checked} onChange={(e) => onSave(e.target.checked)} className="h-3 w-3" />
      {title}
    </label>
  )
}
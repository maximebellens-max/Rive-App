'use client'

import { useState } from 'react'
import Link from 'next/link'
import { fillTemplatePlaceholders, formatDateFR } from '@/lib/rive/templates'

type Template = { id: string; name: string; channel: string; subject: string; body: string }

export default function MessageSection({
  lead,
  templates,
  agentName,
}: {
  lead: { name: string; action_date: string | null }
  templates: Template[]
  agentName: string
}) {
  const [selectedId, setSelectedId] = useState(templates[0]?.id ?? '')
  const [generated, setGenerated] = useState<{ subject: string; body: string } | null>(null)
  const [copied, setCopied] = useState(false)

  if (!templates.length) {
    return (
      <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-neutral-900">Message</h2>
        <p className="mt-2 text-sm text-neutral-500">
          Aucun modèle disponible.{' '}
          <Link href="/dashboard/templates" className="underline">
            Gérer mes modèles →
          </Link>
        </p>
      </div>
    )
  }

  function generate() {
    const template = templates.find((t) => t.id === selectedId)
    if (!template) return
    const vars = {
      prenom: lead.name.trim().split(/\s+/)[0] || lead.name,
      date: formatDateFR(lead.action_date),
      agent: agentName || 'ton conseiller',
    }
    setGenerated({
      subject: fillTemplatePlaceholders(template.subject, vars),
      body: fillTemplatePlaceholders(template.body, vars),
    })
    setCopied(false)
  }

  async function copy() {
    if (!generated) return
    const text = generated.subject ? `${generated.subject}\n\n${generated.body}` : generated.body
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      setCopied(false)
    }
  }

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-neutral-900">Message</h2>
        <Link href="/dashboard/templates" className="text-xs text-neutral-500 hover:underline">
          Gérer mes modèles →
        </Link>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <select
          value={selectedId}
          onChange={(e) => setSelectedId(e.target.value)}
          className="rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-900"
        >
          {templates.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name} ({t.channel === 'email' ? 'Email' : 'SMS'})
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={generate}
          className="rounded-lg border border-neutral-300 px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-100"
        >
          Générer le message
        </button>
      </div>

      {generated && (
        <div className="flex flex-col gap-2">
          {generated.subject && (
            <input readOnly value={generated.subject} className="rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm" />
          )}
          <textarea
            readOnly
            value={generated.body}
            rows={4}
            className="rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm"
          />
          <button
            type="button"
            onClick={copy}
            className="w-fit rounded-lg bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-neutral-700"
          >
            {copied ? 'Copié ✓' : 'Copier'}
          </button>
        </div>
      )}
    </div>
  )
}

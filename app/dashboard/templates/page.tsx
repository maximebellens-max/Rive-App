import { createClient } from '@/lib/supabase/server'
import TemplateForm from './template-form'
import TemplateRow from './template-row'

export default async function TemplatesPage() {
  const supabase = await createClient()

  const { data: templates } = await supabase.from('message_templates').select('*').order('created_at', { ascending: true })

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Modèles de messages</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Variables disponibles : <code>{'{{prenom}}'}</code>, <code>{'{{date}}'}</code>, <code>{'{{agent}}'}</code>
        </p>
      </div>

      <TemplateForm />

      <div className="flex flex-col gap-3">
        {templates?.map((t) => (
          <TemplateRow key={t.id} template={t} />
        ))}
      </div>
    </div>
  )
}

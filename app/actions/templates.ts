'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

async function getAgencyId() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { supabase, agencyId: null }

  const { data: profile } = await supabase.from('profiles').select('agency_id').eq('id', user.id).single()
  return { supabase, agencyId: profile?.agency_id ?? null }
}

function str(formData: FormData, key: string): string {
  return String(formData.get(key) || '').trim()
}

export type TemplateFormState = { error?: string } | undefined

export async function createTemplate(_prevState: TemplateFormState, formData: FormData): Promise<TemplateFormState> {
  const { supabase, agencyId } = await getAgencyId()
  if (!agencyId) return { error: 'Session expirée, reconnecte-toi.' }

  const name = str(formData, 'name')
  const body = str(formData, 'body')
  if (!name || !body) return { error: 'Le nom et le contenu sont obligatoires.' }

  const { error } = await supabase.from('message_templates').insert({
    agency_id: agencyId,
    name,
    channel: str(formData, 'channel') === 'email' ? 'email' : 'sms',
    subject: str(formData, 'subject'),
    body,
  })

  if (error) return { error: 'Impossible de créer le modèle.' }
  revalidatePath('/dashboard/templates')
}

export async function updateTemplate(templateId: string, _prevState: TemplateFormState, formData: FormData): Promise<TemplateFormState> {
  const { supabase, agencyId } = await getAgencyId()
  if (!agencyId) return { error: 'Session expirée, reconnecte-toi.' }

  const { error } = await supabase
    .from('message_templates')
    .update({
      name: str(formData, 'name'),
      channel: str(formData, 'channel') === 'email' ? 'email' : 'sms',
      subject: str(formData, 'subject'),
      body: str(formData, 'body'),
    })
    .eq('id', templateId)

  if (error) return { error: 'Impossible d’enregistrer les modifications.' }
  revalidatePath('/dashboard/templates')
  return undefined
}

export async function deleteTemplate(templateId: string) {
  const { supabase, agencyId } = await getAgencyId()
  if (!agencyId) return

  await supabase.from('message_templates').delete().eq('id', templateId)
  revalidatePath('/dashboard/templates')
}

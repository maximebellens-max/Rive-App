'use server'

import { getAuthedProfile } from '@/lib/supabase/session'
import { runAssistantTurn, type ChatMessage } from '@/lib/rive/assistant-agent'

export async function sendAssistantMessage(
  history: ChatMessage[],
  userText: string
): Promise<{ messages: ChatMessage[]; reply: string; error?: string }> {
  const { supabase, user, profile } = await getAuthedProfile()
  if (!user || !profile?.agency_id) {
    return { messages: history, reply: '', error: 'Session expirée, reconnecte-toi.' }
  }

  const messages: ChatMessage[] = [...history, { role: 'user', content: [{ type: 'text', text: userText }] }]

  return runAssistantTurn(
    {
      supabase,
      agencyId: profile.agency_id,
      agencyName: (profile.agencies as unknown as { name: string } | null)?.name,
      userName: profile.full_name,
    },
    messages
  )
}
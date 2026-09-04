'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

// Marque toutes les notifications de l'agence comme lues par l'utilisateur
// connecté (appelée à l'ouverture de la cloche de notifications). Le calcul
// se fait côté base via mark_notifications_read() plutôt qu'en JS pour rester
// atomique même si plusieurs membres ouvrent la cloche en même temps.
export async function markNotificationsRead() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return

  await supabase.rpc('mark_notifications_read')
  revalidatePath('/dashboard', 'layout')
}
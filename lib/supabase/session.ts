import { cache } from 'react'
import { createClient } from './server'

// getUser() revalide le JWT auprès du serveur Supabase Auth à chaque appel
// (aller-retour réseau volontaire, pour la sécurité). Sans mise en cache,
// le layout du dashboard ET chaque page appellent cette fonction séparément
// à chaque navigation, doublant inutilement la latence. React.cache()
// mémorise le résultat pour la durée d'une seule requête : tous les
// Server Components rendus pour une même navigation (layout + page)
// partagent un seul aller-retour, au lieu d'un par composant.
// https://nextjs.org/docs — "Reusing data with React.cache"
export const getAuthedProfile = cache(async () => {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { supabase, user: null, profile: null }

  const { data: profile } = await supabase
    .from('profiles')
    .select('agency_id, full_name, role, agencies ( name )')
    .eq('id', user.id)
    .single()

  return { supabase, user, profile }
})

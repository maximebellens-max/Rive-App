'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export type AuthState = { error?: string; info?: string } | undefined

export async function login(
  _prevState: AuthState,
  formData: FormData
): Promise<AuthState> {
  const email = String(formData.get('email') || '').trim()
  const password = String(formData.get('password') || '')

  if (!email || !password) {
    return { error: 'Merci de renseigner ton email et ton mot de passe.' }
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    return { error: 'Email ou mot de passe incorrect.' }
  }

  revalidatePath('/', 'layout')
  redirect('/dashboard')
}

export async function signup(
  _prevState: AuthState,
  formData: FormData
): Promise<AuthState> {
  const email = String(formData.get('email') || '').trim()
  const password = String(formData.get('password') || '')
  const fullName = String(formData.get('full_name') || '').trim()
  const agencyName = String(formData.get('agency_name') || '').trim()
  const inviteToken = String(formData.get('invite_token') || '').trim()

  // Avec une invitation, l'agence existe déjà : le nom d'agence n'est pas requis.
  if (!email || !password || !fullName || (!agencyName && !inviteToken)) {
    return { error: 'Merci de remplir tous les champs.' }
  }
  if (password.length < 8) {
    return { error: 'Le mot de passe doit contenir au moins 8 caractères.' }
  }

  const supabase = await createClient()
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
        agency_name: agencyName,
        ...(inviteToken ? { invite_token: inviteToken } : {}),
      },
    },
  })

  if (error) {
    if (error.message.toLowerCase().includes('already registered')) {
      return { error: 'Un compte existe déjà avec cet email.' }
    }
    return { error: "Une erreur est survenue lors de l'inscription." }
  }

  // Si la confirmation par email est activée sur le projet Supabase, il n'y a
  // pas de session immédiate : on prévient l'utilisateur au lieu de rediriger.
  if (data.user && !data.session) {
    return {
      info: 'Compte créé. Vérifie ta boîte mail pour confirmer ton adresse avant de te connecter.',
    }
  }

  revalidatePath('/', 'layout')
  redirect('/dashboard')
}

export async function logout() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  revalidatePath('/', 'layout')
  redirect('/login')
}

// Toujours le même message de succès, que l'email existe ou non dans la
// base : ne jamais révéler à un visiteur si une adresse est enregistrée
// chez Hevrest (énumération de comptes). Le lien envoyé pointe vers
// /auth/confirm (voir app/auth/confirm/route.ts, déjà générique sur le
// paramètre "type") avec type=recovery et next=/auth/reset-password — le
// template email "Reset Password" doit être configuré dans le dashboard
// Supabase pour pointer vers {{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery&next=/auth/reset-password,
// exactement comme le template "Confirm signup" existant.
const RESET_REQUESTED_MESSAGE =
  'Si un compte existe avec cet email, un lien de réinitialisation vient de lui être envoyé.'

export async function requestPasswordReset(
  _prevState: AuthState,
  formData: FormData
): Promise<AuthState> {
  const email = String(formData.get('email') || '').trim()

  if (!email) {
    return { error: 'Merci de renseigner ton email.' }
  }

  const supabase = await createClient()
  // L'erreur éventuelle (email inconnu, etc.) n'est jamais affichée : on
  // renvoie toujours le même message, pour ne rien révéler à l'appelant.
  await supabase.auth.resetPasswordForEmail(email)

  return { info: RESET_REQUESTED_MESSAGE }
}

export async function updatePassword(
  _prevState: AuthState,
  formData: FormData
): Promise<AuthState> {
  const password = String(formData.get('password') || '')
  const confirm = String(formData.get('confirm') || '')

  if (password.length < 8) {
    return { error: 'Le mot de passe doit contenir au moins 8 caractères.' }
  }
  if (password !== confirm) {
    return { error: 'Les deux mots de passe ne correspondent pas.' }
  }

  const supabase = await createClient()
  // Nécessite la session de récupération posée par /auth/confirm en suivant
  // le lien reçu par email : sans elle, updateUser refuserait de toute façon,
  // mais ce contrôle donne un message clair plutôt qu'une erreur Supabase brute.
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'Ce lien a expiré ou est invalide. Demande un nouveau lien de réinitialisation.' }
  }

  const { error } = await supabase.auth.updateUser({ password })
  if (error) {
    // Cas fréquent et sinon peu clair : Supabase refuse silencieusement (avec
    // un message générique côté client) si le nouveau mot de passe est
    // identique à l'ancien — error.code === 'same_password' côté API.
    if (error.code === 'same_password') {
      return { error: 'Ce mot de passe est déjà le tien : choisis-en un différent de l’ancien.' }
    }
    return { error: 'Impossible de mettre à jour le mot de passe. Réessaie ou redemande un lien.' }
  }

  revalidatePath('/', 'layout')
  redirect('/dashboard')
}
'use client'

import { createClient } from '@/lib/supabase'

export async function signUp(
  email: string,
  password: string,
  userName: string
) {
  const supabase = createClient()

  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${window.location.origin}/auth/callback`,
      data: {
        user_name: userName,
      },
    },
  })

  if (authError) {
    return { data: null, error: authError }
  }

  // Create citizen profile
  if (authData.user) {
    const { error: profileError } = await supabase
      .from('citizens')
      .insert({
        id: authData.user.id,
        user_name: userName,
        email: email,
        voting_power: 1.0,
      })

    if (profileError) {
      return { data: null, error: profileError }
    }
  }

  return { data: authData, error: null }
}

export async function signIn(email: string, password: string) {
  const supabase = createClient()

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  return { data, error }
}

export async function signOut() {
  const supabase = createClient()
  return await supabase.auth.signOut()
}

export async function getCurrentUser() {
  const supabase = createClient()

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  return { user, error }
}

export async function getCurrentCitizen() {
  const supabase = createClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return { citizen: null, error: authError }
  }

  const { data: citizen, error: dbError } = await supabase
    .from('citizens')
    .select('*')
    .eq('id', user.id)
    .single()

  return { citizen, error: dbError }
}

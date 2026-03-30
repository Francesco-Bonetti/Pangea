"use server"

import { createServerSupabaseClient } from "./supabase"
import { redirect } from "next/navigation"

// ── Sign Up ────────────────────────────────────────────────────────────────────
export async function signUp(email: string, password: string, displayName: string) {
  const supabase = await createServerSupabaseClient()
  const { data, error } = await supabase.auth.signUp({
    email, password,
    options: { data: { display_name: displayName } },
  })
  if (error) throw error
  if (data.user) {
    const { error: profileError } = await supabase
      .from("citizens")
      .insert({ id: data.user.id, display_name: displayName })
    if (profileError) throw profileError
  }
  return data
}

// ── Sign In ────────────────────────────────────────────────────────────────────
export async function signIn(email: string, password: string) {
  const supabase = await createServerSupabaseClient()
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw error
  return data
}

// ── Sign In with OAuth ─────────────────────────────────────────────────────────
export async function signInWithOAuth(provider: "google" | "github") {
  const supabase = await createServerSupabaseClient()
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: { redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback` },
  })
  if (error) throw error
  if (data.url) redirect(data.url)
}

// ── Sign Out ───────────────────────────────────────────────────────────────────
export async function signOut() {
  const supabase = await createServerSupabaseClient()
  const { error } = await supabase.auth.signOut()
  if (error) throw error
  redirect("/")
}

// ── Get Current Session ────────────────────────────────────────────────────────
export async function getSession() {
  const supabase = await createServerSupabaseClient()
  const { data: { session } } = await supabase.auth.getSession()
  return session
}

// ── Get Current User ───────────────────────────────────────────────────────────
export async function getCurrentUser() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

// ── Get Citizen Profile ────────────────────────────────────────────────────────
export async function getCurrentCitizen() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data } = await supabase.from("citizens").select("*").eq("id", user.id).single()
  return data
}

// ── OAuth Callback ─────────────────────────────────────────────────────────────
export async function exchangeCodeForSession(code: string) {
  const supabase = await createServerSupabaseClient()
  const { error } = await supabase.auth.exchangeCodeForSession(code)
  if (error) throw error
}

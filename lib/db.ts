'use client'

import { createClient } from '@/lib/supabase'

export async function getProposals(filter?: string) {
  const supabase = createClient()

  let query = supabase
    .from('proposals')
    .select(
      `
      *,
      citizens (display_name),
      votes (id)
    `
    )
    .order('created_at', { ascending: false })

  if (filter === 'open') {
    query = query.eq('status', 'open')
  } else if (filter === 'closed') {
    query = query.eq('status', 'closed')
  }

  const { data, error } = await query

  return { data, error }
}

export async function getProposalById(id: string) {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('proposals')
    .select(
      `

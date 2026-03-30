'use client'

import { createClient } from '@/lib/supabase'

export async function getProposals(filter?: string) {
  const supabase = createClient()

  let query = supabase
    .from('proposals')
    .select(
      `
      *,
      citizens (user_name),
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
      *,
      citizens (user_name),
      votes (*)
    `
    )
    .eq('id', id)
    .single()

  return { data, error }
}

export async function vote(
  proposalId: string,
  citizenId: string,
  voteType: 'yes' | 'no' | 'abstain'
) {
  const supabase = createClient()

  // Check if user already voted
  const { data: existing } = await supabase
    .from('votes')
    .select('id')
    .eq('proposal_id', proposalId)
    .eq('citizen_id', citizenId)
    .single()

  if (existing) {
    // Update existing vote
    const { data, error } = await supabase
      .from('votes')
      .update({ vote_type: voteType })
      .eq('proposal_id', proposalId)
      .eq('citizen_id', citizenId)
      .select()
      .single()

    return { data, error }
  }

  // Insert new vote
  const { data, error } = await supabase
    .from('votes')
    .insert({
      proposal_id: proposalId,
      citizen_id: citizenId,
      vote_type: voteType,
    })
    .select()
    .single()

  return { data, error }
}

export async function getDelegations(citizenId: string) {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('delegations')
    .select(
      `
      *,
      delegated_to:citizens!delegations_delegated_to_fkey (user_name)
    `
    )
    .eq('citizen_id', citizenId)

  return { data, error }
}

export async function createDelegation(
  citizenId: string,
  delegatedToId: string
) {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('delegations')
    .insert({
      citizen_id: citizenId,
      delegated_to: delegatedToId,
    })
    .select()
    .single()

  return { data, error }
}

export async function removeDelegation(delegationId: string) {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('delegations')
    .delete()
    .eq('id', delegationId)

  return { data, error }
}

export async function getCitizen(citizenId: string) {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('citizens')
    .select('*')
    .eq('id', citizenId)
    .single()

  return { data, error }
}

export async function getCitizens() {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('citizens')
    .select('*')
    .order('user_name', { ascending: true })

  return { data, error }
}

export async function updateCitizen(
  citizenId: string,
  updates: Record<string, any>
) {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('citizens')
    .update(updates)
    .eq('id', citizenId)
    .select()
    .single()

  return { data, error }
}

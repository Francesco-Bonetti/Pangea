import { createClient } from "./supabase"
import type { Citizen, Proposal, Vote, Delegation, ProposalTally, ProposalCategory, ProposalStatus, VoteChoice, TablesInsert, TablesUpdate } from "./database.types"

// ── Citizens ───────────────────────────────────────────────────────────────────
export async function getCitizen(id: string): Promise<Citizen | null> {
  const supabase = createClient()
  const { data } = await supabase.from("citizens").select("*").eq("id", id).single()
  return data
}

export async function updateCitizen(id: string, updates: TablesUpdate<"citizens">): Promise<Citizen> {
  const supabase = createClient()
  const { data, error } = await supabase.from("citizens")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", id).select().single()
  if (error) throw error
  return data
}

// ── Proposals ──────────────────────────────────────────────────────────────────
export async function getProposals(options?: { category?: ProposalCategory; status?: ProposalStatus; limit?: number }): Promise<Proposal[]> {
  const supabase = createClient()
  let query = supabase.from("proposals").select("*").order("prop_number", { ascending: false })
  if (options?.category) query = query.eq("category", options.category)
  if (options?.status) query = query.eq("status", options.status)
  if (options?.limit) query = query.limit(options.limit)
  const { data, error } = await query
  if (error) throw error
  return data
}

export async function getProposal(id: string): Promise<Proposal | null> {
  const supabase = createClient()
  const { data } = await supabase.from("proposals")
    .select("*, citizens(display_name, is_verified, reputation_score)")
    .eq("id", id).single()
  return data as unknown as Proposal
}

export async function getProposalByNumber(propNumber: number): Promise<Proposal | null> {
  const supabase = createClient()
  const { data } = await supabase.from("proposals")
    .select("*, citizens(display_name, is_verified, reputation_score)")
    .eq("prop_number", propNumber).single()
  return data as unknown as Proposal
}

export async function createProposal(proposal: TablesInsert<"proposals">): Promise<Proposal> {
  const supabase = createClient()
  const { data, error } = await supabase.from("proposals").insert(proposal).select().single()
  if (error) throw error
  return data
}

export async function updateProposalStatus(id: string, status: ProposalStatus): Promise<Proposal> {
  const supabase = createClient()
  const { data, error } = await supabase.from("proposals")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", id).select().single()
  if (error) throw error
  return data
}

// ── Proposal Tally (View) ──────────────────────────────────────────────────────
export async function getProposalTally(proposalId: string): Promise<ProposalTally | null> {
  const supabase = createClient()
  const { data } = await supabase.from("proposal_tally").select("*").eq("proposal_id", proposalId).single()
  return data
}

export async function getAllTallies(): Promise<ProposalTally[]> {
  const supabase = createClient()
  const { data, error } = await supabase.from("proposal_tally").select("*").order("prop_number", { ascending: false })
  if (error) throw error
  return data
}

// ── Votes ──────────────────────────────────────────────────────────────────────
export async function getVotesForProposal(proposalId: string): Promise<Vote[]> {
  const supabase = createClient()
  const { data, error } = await supabase.from("votes")
    .select("*, citizens(display_name, is_verified)")
    .eq("proposal_id", proposalId)
  if (error) throw error
  return data as unknown as Vote[]
}

export async function getVoteByUser(proposalId: string, voterId: string): Promise<Vote | null> {
  const supabase = createClient()
  const { data } = await supabase.from("votes").select("*")
    .eq("proposal_id", proposalId).eq("voter_id", voterId).single()
  return data
}

export async function castVote(proposalId: string, voterId: string, choice: VoteChoice, weight = 1.0, delegatedFrom: string[] = []): Promise<Vote> {
  const supabase = createClient()
  const { data, error } = await supabase.from("votes")
    .upsert({ proposal_id: proposalId, voter_id: voterId, choice, weight, delegated_from: delegatedFrom }, { onConflict: "proposal_id,voter_id" })
    .select().single()
  if (error) throw error
  return data
}

// ── Delegations ────────────────────────────────────────────────────────────────
export async function getDelegationsFrom(delegatorId: string): Promise<Delegation[]> {
  const supabase = createClient()
  const { data, error } = await supabase.from("delegations")
    .select("*, citizens!delegations_delegate_id_fkey(display_name, is_verified)")
    .eq("delegator_id", delegatorId).eq("is_active", true)
  if (error) throw error
  return data as unknown as Delegation[]
}

export async function getDelegationsTo(delegateId: string): Promise<Delegation[]> {
  const supabase = createClient()
  const { data, error } = await supabase.from("delegations")
    .select("*, citizens!delegations_delegator_id_fkey(display_name, is_verified)")
    .eq("delegate_id", delegateId).eq("is_active", true)
  if (error) throw error
  return data as unknown as Delegation[]
}

export async function createDelegation(delegatorId: string, delegateId: string, domain?: string): Promise<Delegation> {
  const supabase = createClient()
  const { data, error } = await supabase.from("delegations")
    .insert({ delegator_id: delegatorId, delegate_id: delegateId, domain })
    .select().single()
  if (error) throw error
  return data
}

export async function revokeDelegation(id: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase.from("delegations")
    .update({ is_active: false, updated_at: new Date().toISOString() }).eq("id", id)
  if (error) throw error
}

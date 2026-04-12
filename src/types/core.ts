// ============================================
// PANGEA CORE DTOs — Pure boundary types
// These types define the contract between Core and Edge.
// Core = append-only layer (profiles, laws, votes, delegations).
// NEVER import Supabase raw objects or React components here.
// ============================================

// --- Scalar Enums & Literals ---

export type IdentityTier = 0 | 1 | 2 | 3;
export type IdentityProvider = "email" | "phone" | "spid" | "cie" | "eidas";

export type ProposalStatus = "draft" | "curation" | "active" | "closed" | "repealed";
export type ProposalType = "new" | "amendment" | "repeal";
export type VoteType = "yea" | "nay" | "abstain";
export type UserRole = "citizen" | "moderator" | "admin";
export type GuardianActionType = "set_bootstrap_lock" | "remove_bootstrap_lock" | "degrade_admin" | "emergency_freeze";
export type LawLockCategory = "reinforced" | "structural" | "ordinary";
export type DelegationStatus = "pending" | "accepted" | "rejected" | "expired";

export type GroupType = "jurisdiction" | "party" | "community" | "working_group" | "religion" | "custom" | "igo" | "ngo";

export type GeographicAreaLevel = "world" | "continent" | "sub_region" | "country" | "territory" | "region" | "city";
export type SovereigntyStatus = "sovereign" | "territory" | "disputed" | "special" | "antarctic";

/** Geographic area (reference tree — separate from groups) */
export interface GeographicAreaDTO {
  id: string;
  name: string;
  description: string | null;
  parent_id: string | null;
  level: GeographicAreaLevel;
  iso_alpha2: string | null;
  iso_alpha3: string | null;
  iso_numeric: string | null;
  emoji_flag: string | null;
  sovereignty_status: SovereigntyStatus;
  administering_country_id: string | null;
  created_at: string;
}
export type GroupMemberRole =
  | "founder"
  | "co_founder"
  | "president"
  | "vice_president"
  | "admin"
  | "moderator"
  | "secretary"
  | "treasurer"
  | "member"
  | "observer";
export type JurisdictionType = "virtual" | "geographic";

export type ElectionStatus = "upcoming" | "candidature" | "voting" | "closed" | "cancelled";
export type CandidateStatus = "registered" | "approved" | "withdrawn" | "disqualified";
export type ElectionType = "general" | "jurisdiction" | "party" | "position" | "group";

export type HashEntityType = "law" | "proposal" | "vote" | "delegation" | "amendment" | "election" | "election_vote";
export type HashOperation = "hash_created" | "hash_verified" | "hash_mismatch" | "merkle_root_created" | "integrity_check";

export type CooldownActionType =
  | "proposal_create"
  | "proposal_vote"
  | "law_create"
  | "discussion_create"
  | "comment_create"
  | "election_vote"
  | "delegation_create"
  | "group_create";

// --- Core Entity DTOs ---
// These are pure data shapes — no optional join fields,
// no Supabase-specific quirks. Use these at module boundaries.

/** Minimal profile DTO passed across Core→Edge boundary */
export interface ProfileDTO {
  id: string;
  uid: string | null;
  full_name: string | null;
  bio: string | null;
  role: UserRole;
  user_code: string | null;
  identity_tier: IdentityTier;
  allow_delegations: boolean;
  is_searchable: boolean;
  created_at: string;
}

/** Identity proof record (anti-Sybil) */
export interface IdentityProofDTO {
  id: string;
  user_id: string;
  provider_type: IdentityProvider;
  proof_hash: string;
  tier_granted: IdentityTier;
  verified_at: string;
  expires_at: string | null;
  created_at: string;
}

/** Group (recursive entity: jurisdiction, party, community, etc.) */
export interface GroupDTO {
  id: string;
  uid: string | null;
  name: string;
  description: string | null;
  group_type: GroupType;
  logo_emoji: string;
  founder_id: string | null;
  parent_group_id: string | null;
  geographic_area_id: string | null;
  settings: GroupSettingsDTO;
  is_active: boolean;
  created_at: string;
  // Type-specific optional fields
  jurisdiction_type: JurisdictionType | null;
  location_name: string | null;
  manifesto: string | null;
}

export interface GroupSettingsDTO {
  // Privacy & Access
  visibility: "public" | "private" | "members_only";
  // Membership
  can_post: "anyone" | "members" | "admins";
  join_policy: "open" | "approval" | "invite_only";
  // Structure
  can_create_subgroups: "anyone" | "members" | "admins";
  // Governance (T11 — optional, defaults applied server-side)
  voting_duration_days?: number;        // 1-30, default 7
  approval_threshold_pct?: number;      // 1-100, default 50
  min_quorum_pct?: number;              // 0-100, default 0 (no quorum)
  allow_anonymous_proposals?: boolean;  // default false
}

export interface GroupMemberDTO {
  id: string;
  group_id: string;
  user_id: string;
  role: GroupMemberRole;
  vote_weight: number;
  joined_at: string;
}

export interface GroupLinkDTO {
  id: string;
  source_group_id: string;
  target_group_id: string;
  link_type: string;
  is_active: boolean;
  created_at: string;
}

/** Law (append-only, hierarchical) */
export interface LawDTO {
  id: string;
  uid: string | null;
  title: string;
  content: string;
  law_code: string;
  jurisdiction_id: string;
  category_id: string | null;
  parent_id: string | null;
  status: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface CategoryDTO {
  id: string;
  uid: string | null;
  name: string;
  description: string | null;
  parent_id: string | null;
  created_at: string;
}

/** Proposal (lifecycle: draft→curation→active→closed) */
export interface ProposalDTO {
  id: string;
  uid: string | null;
  author_id: string;
  title: string;
  content: string;
  dispositivo: string | null;
  status: ProposalStatus;
  proposal_type: ProposalType;
  parent_proposal_id: string | null;
  jurisdiction_id: string | null;
  group_id: string | null;
  category_id: string | null;
  expires_at: string | null;
  incubator_passed: boolean;
  incubator_t2_upvotes: number;
  created_at: string;
}

export interface ProposalOptionDTO {
  id: string;
  proposal_id: string;
  title: string;
  description: string | null;
  created_at: string;
}

/** Vote (append-only, sealed with is_final) */
export interface VoteDTO {
  id: string;
  uid: string | null;
  proposal_id: string;
  voter_id: string;
  vote_type: VoteType;
  voting_weight: number;
  is_final: boolean;
  created_at: string;
}

export interface VoteAllocationDTO {
  id: string;
  vote_id: string;
  option_id: string;
  allocation_percentage: number;
}

/** Delegation (liquid democracy, with decay) */
export interface DelegationDTO {
  id: string;
  uid: string | null;
  delegator_id: string;
  delegate_id: string;
  category_id: string | null;
  status: DelegationStatus;
  created_at: string;
  last_pinged_at: string | null;
  confirmed_at: string | null;
}

/** Election */
export interface ElectionDTO {
  id: string;
  uid: string | null;
  title: string;
  description: string | null;
  election_type: ElectionType;
  group_id: string | null;
  position_name: string;
  position_id: string | null;
  max_winners: number;
  status: ElectionStatus;
  candidature_start: string;
  candidature_end: string;
  voting_start: string;
  voting_end: string;
  created_by: string;
  created_at: string;
}

export interface CandidateDTO {
  id: string;
  election_id: string;
  user_id: string;
  group_id: string | null;
  platform: string | null;
  status: CandidateStatus;
  created_at: string;
}

export interface ElectionVoteDTO {
  id: string;
  election_id: string;
  voter_id: string;
  candidate_id: string;
  voting_weight: number;
  created_at: string;
}

// --- Integrity & Audit ---

export interface ContentHashDTO {
  id: string;
  entity_type: HashEntityType;
  entity_id: string;
  content_hash: string;
  previous_hash: string | null;
  version: number;
  hashed_fields: Record<string, unknown>;
  created_at: string;
  created_by: string | null;
}

export interface MerkleTreeDTO {
  id: string;
  entity_type: HashEntityType;
  root_hash: string;
  leaf_count: number;
  period_start: string;
  period_end: string;
  leaf_hashes: string[];
  created_at: string;
}

// --- RPC Response DTOs ---
// These are the shapes returned by SECURITY DEFINER functions.
// Edge code should rely on these, never call the DB directly for Core ops.

export interface CooldownResultDTO {
  cooldown_seconds: number;
  tier: IdentityTier;
  multiplier: number;
  gamma: number;
  is_first_action: boolean;
  dissent_d2: number;
  quorum_met: boolean;
  quorum_threshold: number;
  t2_votes: number;
  action_count: number;
  period_actions: number;
  effective_strikes: number;
  strike_decay_applied: number;
  burst_active: boolean;
  burst_count: number;
  is_first_law_free: boolean;
  staking_info: StakingInfoDTO | null;
  error: string | null;
}

export interface StakingInfoDTO {
  type: "none" | "first_free" | "quadratic_staking";
  message: string | null;
  base_days: number;
  effective_strikes: number;
  raw_strikes: number;
  strike_multiplier: number;
  total_cooldown_days: number;
}

export interface AccessCheckResultDTO {
  can_proceed: boolean;
  wait_seconds: number;
  reason: string | null;
  cooldown: CooldownResultDTO | null;
}

export interface VerifyIdentityResultDTO {
  success: boolean;
  tier: IdentityTier | null;
  provider: IdentityProvider | null;
  error: string | null;
  message: string | null;
}

export interface UpsertVoteResultDTO {
  success: boolean;
  vote_id: string | null;
  action: "created" | "updated" | null;
  is_final: boolean;
  hash_verified: boolean;
  error: string | null;
  message: string | null;
}

// --- Aggregated Results (RPC) ---

export interface ProposalResultsDTO {
  yea_count: number;
  nay_count: number;
  abstain_count: number;
}

export interface DistributedResultDTO {
  option_id: string;
  option_title: string;
  weighted_score: number;
  total_votes: number;
}

export interface ProposalIntegrityDTO {
  status: string;
  results_available: boolean;
  total_votes: number;
  all_sealed: boolean;
  verified_count: number;
  mismatch_count: number;
  missing_hash_count: number;
  integrity_ok: boolean;
  audit_complete: boolean;
}

export interface ElectionResultEntryDTO {
  candidate_id: string;
  candidate_user_id: string;
  candidate_name: string;
  candidate_party_id: string | null;
  candidate_party_name: string | null;
  candidate_platform: string | null;
  total_weighted_votes: number;
  vote_count: number;
  rank: number | null;
}

// --- Constants ---

export const IDENTITY_TIER_LABELS: Record<IdentityTier, string> = {
  0: "ghost",
  1: "resident",
  2: "citizen",
  3: "guarantor",
};

export const TIER_REQUIREMENTS = {
  read: 0 as IdentityTier,
  comment: 0 as IdentityTier,
  discuss: 0 as IdentityTier,
  vote: 2 as IdentityTier,
  propose: 2 as IdentityTier,
  delegate: 1 as IdentityTier,
  run_for_election: 2 as IdentityTier,
  create_group: 1 as IdentityTier,
} as const;

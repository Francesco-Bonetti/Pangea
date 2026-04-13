// ============================================
// PANGEA TYPES - Global Democratic Platform
// Phase 2: Liquid Democracy + Community Review + Distributed Multi-Vote
// ============================================

// --- Status & Enums ---
export type ProposalStatus = "draft" | "curation" | "active" | "trial" | "second_vote" | "closed" | "repealed";
export type VoteType = "yea" | "nay" | "abstain";
export type UserRole = "citizen" | "moderator" | "admin";

// --- Guardian System (T03) ---
export interface GuardianStatus {
  is_active: boolean;
  guardian_name: string;
  verified_citizens: number;
  sunset_threshold: number;
  progress_pct: number;
  emergency_freeze: boolean;
  // Art. 10: 4-phase sunset
  phase: 0 | 1 | 2 | 3;
  phase1_threshold: number;
  phase2_threshold: number;
}

export type GuardianActionType =
  | "set_bootstrap_lock"
  | "remove_bootstrap_lock"
  | "degrade_admin"
  | "emergency_freeze";

export type LawLockCategory = "reinforced" | "structural" | "ordinary";
export type DelegationStatus = "pending" | "accepted" | "rejected" | "expired";
export type ProposalType = "new" | "amendment" | "repeal";

// --- Identity Tiers (Diamond Edition DE-01) ---
export type IdentityTier = 0 | 1 | 2 | 3;
export type IdentityProvider = "email" | "phone" | "spid" | "cie" | "eidas";

// Tier labels for UI
export const IDENTITY_TIER_LABELS: Record<IdentityTier, string> = {
  0: "ghost",       // T0: email only
  1: "resident",    // T1: + phone verified
  2: "citizen",     // T2: + SPID/CIE verified
  3: "guarantor",   // T3: Phase 2 with staking
};

// Tier minimum requirements for actions
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

// --- Privacy Enums ---
export type ProfileVisibility = "public" | "registered_only" | "private";
export type DmPolicy = "everyone" | "followed_only" | "nobody";
export type ActivityVisibility = "public" | "registered_only" | "private";

// --- Hash Integrity Enums ---
export type HashEntityType = "law" | "proposal" | "vote" | "delegation" | "amendment" | "election" | "election_vote";
export type HashOperation = "hash_created" | "hash_verified" | "hash_mismatch" | "merkle_root_created" | "integrity_check";

// --- Entità Base ---
export interface Profile {
  id: string;
  uid?: string | null;
  full_name: string | null;
  bio: string | null;
  role?: UserRole;
  user_code?: string | null;
  allow_delegations?: boolean;
  is_searchable?: boolean;
  is_guardian?: boolean;
  identity_tier: IdentityTier;
  public_profile_active: boolean;
  created_at: string;
}

// --- Identity Proofs (Diamond Edition DE-02) ---
export interface UserIdentityProof {
  id: string;
  user_id: string;
  provider_type: IdentityProvider;
  proof_hash: string;
  tier_granted: IdentityTier;
  verified_at: string;
  expires_at: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

// Response from verify_identity RPC
export interface VerifyIdentityResult {
  success: boolean;
  tier?: IdentityTier;
  provider?: IdentityProvider;
  error?: string;
  message?: string;
}

// --- Cooldown Action Types (Diamond Edition DE-06) ---
export type CooldownActionType =
  | "proposal_create"
  | "proposal_vote"
  | "law_create"
  | "discussion_create"
  | "comment_create"
  | "election_vote"
  | "delegation_create"
  | "group_create";

// Response from get_pangea_cooldown RPC (DE-08 v2)
export interface CooldownResult {
  cooldown_seconds: number;
  tier: IdentityTier;
  multiplier: number;
  gamma: number;
  is_first_action: boolean;
  dissent_d2?: number;
  quorum_met?: boolean;
  quorum_threshold?: number;
  t2_votes?: number;
  action_count?: number;
  period_actions?: number;
  // Anti-spam hardening (v2)
  effective_strikes?: number;
  strike_decay_applied?: number;
  burst_active?: boolean;
  burst_count?: number;
  error?: string;
  // Quadratic Staking (v3 — DE-18/20)
  is_first_law_free?: boolean;
  staking_info?: StakingInfo;
}

// Staking info returned by get_pangea_cooldown v3
export interface StakingInfo {
  type: "none" | "first_free" | "quadratic_staking";
  message?: string;
  base_days?: number;
  effective_strikes?: number;
  raw_strikes?: number;
  strike_multiplier?: number;
  total_cooldown_days?: number;
}

// Response from check_pangea_access RPC (DE-09)
export interface AccessCheckResult {
  can_proceed: boolean;
  wait_seconds: number;
  reason?: "COOLDOWN_ACTIVE" | "USER_NOT_FOUND" | string;
  cooldown?: CooldownResult;
}

export interface Category {
  id: string;
  uid?: string | null;
  name: string;
  description: string | null;
  parent_id?: string | null;
  created_by?: string | null;
  created_at: string;
}

export interface Proposal {
  id: string;
  uid?: string | null;
  author_id: string;
  title: string;
  content: string;
  dispositivo: string | null;
  status: ProposalStatus;
  proposal_type?: ProposalType;
  parent_proposal_id?: string | null;
  created_at: string;
  expires_at: string | null;
  category_id: string | null;
  // T09: Group scope (nullable = global proposal)
  group_id?: string | null;
  // Art. 8.3: Legislative tier
  tier?: "constitutional" | "core" | "platform" | "ordinary";
  // T23: Double vote + trial
  target_law_id?: string | null;
  trial_duration_days?: number | null;
  first_vote_passed?: boolean | null;
  first_vote_closed_at?: string | null;
  trial_started_at?: string | null;
  trial_ends_at?: string | null;
  // Quadratic Staking (DE-21)
  incubator_passed?: boolean;
  incubator_t2_upvotes?: number;
  signal_count?: number;
  // Join
  profiles?: Profile;
  categories?: Category;
  groups?: { name: string; logo_emoji: string };
}

export interface Vote {
  id: string;
  uid?: string | null;
  proposal_id: string;
  voter_id: string;
  vote_type: VoteType;
  voting_weight: number;
  is_final: boolean;
  created_at: string;
}

// Response from upsert_proposal_vote RPC (DE-13)
export interface UpsertVoteResult {
  success: boolean;
  vote_id?: string;
  action?: "created" | "updated";
  is_final?: boolean;
  hash_verified?: boolean;
  error?: string;
  message?: string;
}

// Response from get_my_proposal_vote RPC (DE-13)
export interface MyProposalVote {
  has_voted: boolean;
  vote_id?: string;
  vote_type?: VoteType;
  voting_weight?: number;
  is_final?: boolean;
  created_at?: string;
  allocations?: Array<{
    option_id: string;
    allocation_percentage: number;
  }>;
}

// --- Democrazia Liquida ---
export interface Delegation {
  id: string;
  uid?: string | null;
  delegator_id: string;
  delegate_id: string | null;            // NULL when delegate is a group
  delegate_group_id?: string | null;     // NULL when delegate is a citizen
  category_id: string | null;
  status?: DelegationStatus;
  is_transitive: boolean;                // Art. 7.4: delegator can restrict transitivity
  created_at: string;
  last_pinged_at?: string | null;
  confirmed_at?: string | null;          // = accepted_at
  revoked_at?: string | null;
  expired_at?: string | null;
  // Join
  delegator?: Profile;
  delegate?: Profile;
  categories?: Category;
}

export interface DelegationConfig {
  id: string;
  group_id: string;
  accept_delegations: boolean;
  authorized_member_ids: string[];
  created_at: string;
  updated_at: string;
}

// --- Community Review ---
export interface ProposalSignal {
  id: string;
  proposal_id: string;
  supporter_id: string;
  signal_strength: number;
  created_at: string;
}

// --- Distributed Plural Voting ---
export interface ProposalOption {
  id: string;
  proposal_id: string;
  title: string;
  description: string | null;
  created_at: string;
}

export interface VoteAllocation {
  id: string;
  vote_id: string;
  option_id: string;
  allocation_percentage: number;
}

// --- Aggregated Results (RPC) ---

// Legacy results (binary vote)
export interface ProposalResults {
  yea_count: number;
  nay_count: number;
  abstain_count: number;
}

// Distributed Plural Voting Results
export interface DistributedResult {
  option_id: string;
  option_title: string;
  weighted_score: number;
  total_votes: number;
}

// --- Tags (Hashtag System) ---
export interface Tag {
  id: string;
  uid?: string | null;
  name: string;
  slug: string;
  usage_count: number;
  created_at: string;
  created_by?: string | null;
}

// --- Social/Commenti ---
export interface Comment {
  id: string;
  uid?: string | null;
  author_id: string;
  proposal_id: string | null;
  law_id: string | null;
  parent_id: string | null;
  body: string;
  likes_count: number;
  dislikes_count: number;
  replies_count: number;
  is_edited: boolean;
  created_at: string;
  updated_at: string;
  // Join
  profiles?: { full_name: string | null };
}

export interface CommentReaction {
  id: string;
  comment_id: string;
  user_id: string;
  reaction_type: "like" | "dislike";
  created_at: string;
}

// --- Recursive Tree Group System (Phase 5 — A2) ---
export type GroupType = "jurisdiction" | "party" | "community" | "working_group" | "religion" | "custom" | "igo" | "ngo";
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

export interface GroupSettings {
  // Privacy & Access
  visibility: "public" | "private" | "members_only";
  // Membership
  can_post: "anyone" | "members" | "admins";
  join_policy: "open" | "approval" | "invite_only";
  // Structure
  can_create_subgroups: "anyone" | "members" | "admins";
  // Governance (T11)
  voting_duration_days?: number;
  approval_threshold_pct?: number;
  min_quorum_pct?: number;
  allow_anonymous_proposals?: boolean;
}

// T10: A single locked setting inherited from an ancestor
export interface LockedSetting {
  value: string;
  locked_by_id: string;
  locked_by_name: string;
}

// T10: Map of setting keys to their lock info (from get_effective_locks RPC)
export type EffectiveLocks = Record<string, LockedSetting>;

// T10: Map of setting keys to boolean (stored on the group itself)
export type GroupLockedSettings = Record<string, boolean>;

// T21: Governance config — decision-making process (separate from operational settings)
export interface GovernanceConfig {
  voting_method?: "simple_majority" | "supermajority" | "consensus";
  proposal_review_days?: number;
  min_members_to_propose?: number;
  allow_delegated_voting?: boolean;
  max_proposal_duration_days?: number;
  require_quorum?: boolean;
  tier_ceiling?: "constitutional" | "core" | "platform" | "ordinary";
}

// T21: Resolved governance with source tracking (from get_effective_governance RPC)
export interface GovernanceSource {
  value: unknown;
  from_group_id: string | null;
  from_group_name: string;
  inherited: boolean;
}
export interface EffectiveGovernance {
  resolved: Required<GovernanceConfig>;
  sources: Record<string, GovernanceSource>;
}

// T22: Proposal tier validation result
export interface ProposalTierValidation {
  valid: boolean;
  reason: string | null;
  tier_ceiling: string;
  chain_depth: number;
}

export interface Group {
  id: string;
  uid?: string | null;
  name: string;
  description: string | null;
  group_type: GroupType;
  logo_emoji: string;
  founder_id: string | null;
  parent_group_id: string | null;
  geographic_area_id?: string | null;
  settings: GroupSettings;
  governance_config: GovernanceConfig;
  locked_settings: GroupLockedSettings;
  is_active: boolean;
  created_at: string;
  // Jurisdiction-specific
  jurisdiction_type?: JurisdictionType | null;
  location_name?: string | null;
  location_coords?: Record<string, number> | null;
  // Party-specific
  manifesto?: string | null;
  // Joins / computed
  profiles?: Profile;
  member_count?: number;
  child_count?: number;
}

export interface GroupMember {
  id: string;
  group_id: string;
  user_id: string;
  role: GroupMemberRole;
  vote_weight: number;
  joined_at: string;
  // Join
  profiles?: Profile;
  groups?: Group;
}

export interface GroupVote {
  id: string;
  group_id: string;
  proposal_id: string;
  vote_type: VoteType;
  decided_by: string;
  created_at: string;
  // Join
  groups?: Group;
  proposals?: Proposal;
}

export interface GroupForumPost {
  id: string;
  uid?: string | null;
  group_id: string;
  author_id: string;
  title: string | null;
  body: string;
  is_admin_only: boolean;
  parent_id: string | null;
  upvotes_count: number;
  downvotes_count: number;
  replies_count: number;
  views_count: number;
  is_pinned: boolean;
  is_locked: boolean;
  created_at: string;
  updated_at: string;
  // Join
  profiles?: { full_name: string | null };
  groups?: { name: string; logo_emoji: string };
}

export interface GroupForumVote {
  id: string;
  user_id: string;
  post_id: string;
  vote_type: "up" | "down";
  created_at: string;
}

export interface GroupTreeNode {
  id: string;
  uid: string;
  name: string;
  description: string | null;
  group_type: GroupType;
  logo_emoji: string;
  parent_group_id: string | null;
  is_active: boolean;
  depth: number;
  member_count: number;
  child_count: number;
  children?: GroupTreeNode[];
}

export interface GroupAncestor {
  id: string;
  uid: string;
  name: string;
  logo_emoji: string;
  group_type: GroupType;
  depth: number;
}

// Legacy aliases for backward compatibility during migration
export type Party = Group;
export type PartyMemberRole = GroupMemberRole;
export type PartyMember = GroupMember;
export type PartyVote = GroupVote;
export type PartyForumPost = GroupForumPost;
export type Jurisdiction = Group;
export type JurisdictionMemberRole = GroupMemberRole;
export type JurisdictionMember = GroupMember;

export interface LawConflict {
  new_law_id: string;
  new_law_title: string;
  new_law_code: string;
  existing_law_id: string;
  existing_law_title: string;
  existing_law_code: string;
  existing_jurisdiction_name: string;
  new_jurisdiction_name: string;
  parent_law_title: string;
  parent_law_code: string;
}

// --- Privacy Settings ---
export interface PrivacySettings {
  id: string;
  user_id: string;

  // Profile visibility
  profile_visibility: ProfileVisibility;

  // Individual field toggles
  show_full_name: boolean;
  show_bio: boolean;
  show_email: boolean;
  show_join_date: boolean;
  show_user_code: boolean;

  // Activity & social visibility
  show_activity: boolean;
  show_delegations: boolean;
  show_group_membership: boolean;
  show_party_membership?: boolean;
  show_jurisdiction_membership?: boolean;
  show_online_status: boolean;

  // Display name (alternative to real name)
  display_name: string | null;

  // Messaging & social policies
  dm_policy: DmPolicy;
  allow_friend_requests: boolean;
  allow_mentions: boolean;

  // Activity visibility granularity
  activity_visibility: ActivityVisibility;

  // Notification preferences
  notify_mentions: boolean;
  notify_replies: boolean;
  notify_delegations: boolean;
  notify_proposals: boolean;
  notify_dm: boolean;

  // Public profile settings (Art. 2.4 dual profile)
  public_display_name: string | null;
  public_show_bio: boolean;
  public_show_email: boolean;
  public_show_activity: boolean;
  public_show_delegations: boolean;
  public_show_group_membership: boolean;

  // Timestamps
  created_at: string;
  updated_at: string;
}

// Privacy-safe display profile (returned by get_display_profile RPC)
export interface DisplayProfile {
  id: string;
  full_name: string | null;
  display_name: string | null;
  bio: string | null;
  role: UserRole;
  user_code: string | null;
  created_at: string | null;
  public_profile_active?: boolean;
  show_activity?: boolean;
  show_delegations?: boolean;
  show_group_membership?: boolean;
  show_party_membership?: boolean;
  show_jurisdiction_membership?: boolean;
  dm_policy?: DmPolicy;
  allow_mentions?: boolean;
  is_private?: boolean;
  is_restricted?: boolean;
}

// --- Group Join Requests (Art. 4.4 private groups) ---
export type JoinRequestStatus = "pending" | "approved" | "rejected";

export interface GroupJoinRequest {
  id: string;
  group_id: string;
  user_id: string;
  message: string | null;
  status: JoinRequestStatus;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  // Joined fields from RPC
  full_name?: string | null;
  user_code?: string | null;
  display_name?: string | null;
}

// --- Compositi ---
export interface ProposalWithResults extends Proposal {
  results?: ProposalResults;
  distributed_results?: DistributedResult[];
  has_voted?: boolean;
  options?: ProposalOption[];
  signal_count?: number;
  total_votes?: number; // V3: blind voting — turnout count for active proposals
}

// --- Discussion Forum ---
export type DiscussionChannel = {
  id: string;
  uid?: string | null;
  name: string;
  slug: string;
  description: string | null;
  emoji: string;
  color: string;
  sort_order: number;
  is_active: boolean;
  parent_id: string | null;
  depth: number;
  child_count: number;
  discussion_count: number;
  created_at: string;
  // Client-side tree
  children?: DiscussionChannel[];
};

export type Discussion = {
  id: string;
  uid?: string | null;
  author_id: string;
  channel_id: string;
  group_id?: string | null;
  title: string;
  body: string;
  is_pinned: boolean;
  is_locked: boolean;
  upvotes_count: number;
  downvotes_count: number;
  replies_count: number;
  views_count: number;
  created_at: string;
  updated_at: string;
  // Joins
  profiles?: { full_name: string | null };
  discussion_channels?: DiscussionChannel;
  tags?: Tag[];
};

export type DiscussionReply = {
  id: string;
  uid?: string | null;
  discussion_id: string;
  author_id: string;
  body: string;
  parent_reply_id: string | null;
  upvotes_count: number;
  downvotes_count: number;
  created_at: string;
  updated_at: string;
  // Joins
  profiles?: { full_name: string | null };
};

export type DiscussionVote = {
  id: string;
  user_id: string;
  discussion_id: string | null;
  reply_id: string | null;
  vote_type: 'up' | 'down';
  created_at: string;
};

export type ReportReason = 'spam' | 'offensive' | 'off_topic' | 'misinformation' | 'other';

export type DiscussionReport = {
  id: string;
  reporter_id: string;
  discussion_id: string | null;
  reply_id: string | null;
  reason: ReportReason;
  description: string | null;
  status: 'pending' | 'reviewed' | 'dismissed' | 'action_taken';
  created_at: string;
};

// --- Personal Posts (Phase 5 — B5) ---
export type PersonalPost = {
  id: string;
  uid?: string | null;
  author_id: string;
  body: string;
  upvotes_count: number;
  downvotes_count: number;
  replies_count: number;
  is_pinned: boolean;
  created_at: string;
  updated_at: string;
  // Joins
  profiles?: { full_name: string | null };
};

export type PostVote = {
  id: string;
  user_id: string;
  post_id: string;
  vote_type: 'up' | 'down';
  created_at: string;
};

export type PostReply = {
  id: string;
  uid?: string | null;
  post_id: string;
  author_id: string;
  body: string;
  parent_reply_id: string | null;
  upvotes_count: number;
  downvotes_count: number;
  created_at: string;
  updated_at: string;
  profiles?: { full_name: string | null };
};

// --- Direct Messaging (E2E Encrypted) ---
export type DmMessageType = 'text' | 'system' | 'key_exchange';

export interface UserKeys {
  id: string;
  user_id: string;
  public_key: string;
  encrypted_private_key: string;
  key_salt: string;
  created_at: string;
  updated_at: string;
}

export interface DmConversation {
  id: string;
  created_at: string;
  updated_at: string;
  last_message_at: string;
}

export interface DmParticipant {
  id: string;
  conversation_id: string;
  user_id: string;
  joined_at: string;
  last_read_at: string;
  is_muted: boolean;
  // Joins
  profiles?: Profile;
}

export interface DmMessage {
  id: string;
  conversation_id: string;
  sender_id: string;
  encrypted_content: string;
  nonce: string;
  message_type: DmMessageType;
  is_edited: boolean;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
  // Client-side only (after decryption)
  decrypted_content?: string;
}

export interface ConversationWithDetails extends DmConversation {
  participants: DmParticipant[];
  last_message?: DmMessage;
  unread_count?: number;
  other_user?: Profile & { public_key?: string };
}

// --- Follow System ---
export type FollowTargetType = "citizen" | "group" | "party" | "jurisdiction";

export interface Follow {
  id: string;
  follower_id: string;
  target_type: FollowTargetType;
  target_id: string;
  created_at: string;
}

export type FeedEventType =
  | "proposal_created"
  | "vote_cast"
  | "law_approved"
  | "discussion_created"
  | "party_vote"
  | "member_joined"
  | "election_created"
  | "candidate_registered";

// --- Elections & Candidatures (Phase 4) ---
export type ElectionStatus = "upcoming" | "candidature" | "voting" | "closed" | "cancelled";
export type CandidateStatus = "registered" | "approved" | "withdrawn" | "disqualified";
export type ElectionType = "general" | "jurisdiction" | "party" | "position" | "group";

export interface Election {
  id: string;
  uid?: string | null;
  title: string;
  description: string | null;
  election_type: ElectionType;
  group_id: string | null;
  // Legacy (kept for backward compat during migration)
  jurisdiction_id?: string | null;
  party_id?: string | null;
  position_name: string;
  position_id?: string | null;  // T13: links to group_positions
  max_winners: number;
  status: ElectionStatus;
  candidature_start: string;
  candidature_end: string;
  voting_start: string;
  voting_end: string;
  created_by: string;
  created_at: string;
  results_summary: ElectionResultEntry[] | null;
  // Joins
  profiles?: Profile;
  groups?: { name: string; logo_emoji: string; group_type: string };
  // Legacy joins
  jurisdictions?: { name: string; logo_emoji: string };
  parties?: { name: string; logo_emoji: string };
  candidate_count?: number;
}

export interface Candidate {
  id: string;
  election_id: string;
  user_id: string;
  group_id: string | null;
  party_id?: string | null;
  platform: string | null;
  status: CandidateStatus;
  created_at: string;
  withdrawn_at: string | null;
  // Joins
  profiles?: Profile;
  groups?: { name: string; logo_emoji: string };
  parties?: { name: string; logo_emoji: string };
}

export interface ElectionVote {
  id: string;
  election_id: string;
  voter_id: string;
  candidate_id: string;
  voting_weight: number;
  created_at: string;
}

export interface ElectionResultEntry {
  candidate_id: string;
  candidate_user_id: string;
  candidate_name: string;
  candidate_party_id: string | null;
  candidate_party_name: string | null;
  candidate_platform: string | null;
  total_weighted_votes: number;
  vote_count: number;
  rank?: number;
}

export interface FeedEvent {
  id: string;
  actor_id: string | null;
  actor_group_id: string | null;
  // Legacy
  actor_party_id?: string | null;
  actor_jurisdiction_id?: string | null;
  event_type: FeedEventType;
  title: string;
  description: string | null;
  link: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

// --- Hash-Based Data Integrity ---
export interface ContentHash {
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

export interface MerkleTree {
  id: string;
  entity_type: HashEntityType;
  root_hash: string;
  leaf_count: number;
  period_start: string;
  period_end: string;
  leaf_hashes: string[];
  created_at: string;
}

export interface HashAuditLogEntry {
  id: string;
  operation: HashOperation;
  entity_type: string | null;
  entity_id: string | null;
  content_hash: string | null;
  expected_hash: string | null;
  actual_hash: string | null;
  verification_result: boolean | null;
  details: Record<string, unknown> | null;
  triggered_by: string | null;
  created_at: string;
}

export interface IntegrityStats {
  total_hashes: number;
  hashes_by_type: Record<string, number> | null;
  merkle_trees: number;
  latest_merkle_roots: Array<{
    entity_type: string;
    root_hash: string;
    leaf_count: number;
    created_at: string;
  }> | null;
  recent_verifications: number;
  recent_mismatches: number;
  audit_log_total: number;
}

export interface VerificationResult {
  verified: boolean;
  entity_type?: string;
  entity_id?: string;
  content_hash?: string;
  version?: number;
  hashed_at?: string;
  previous_hash?: string | null;
  chain_length?: number;
  error?: string;
}

export interface HashSearchResult {
  found: boolean;
  hash?: string;
  entity_type?: string;
  entity_id?: string;
  content_hash?: string;
  version?: number;
  created_at?: string;
  hashed_fields?: Record<string, unknown>;
  previous_hash?: string | null;
}

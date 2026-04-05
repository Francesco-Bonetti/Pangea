// ============================================
// PANGEA TYPES - Global Democratic Platform
// Phase 2: Liquid Democracy + Community Review + Distributed Multi-Vote
// ============================================

// --- Status & Enums ---
export type ProposalStatus = "draft" | "curation" | "active" | "closed" | "repealed";
export type VoteType = "yea" | "nay" | "abstain";
export type UserRole = "citizen" | "moderator" | "admin";
export type DelegationStatus = "pending" | "accepted" | "rejected";
export type ProposalType = "new" | "amendment" | "repeal";

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
  full_name: string | null;
  bio: string | null;
  role?: UserRole;
  user_code?: string | null;
  allow_delegations?: boolean;
  is_searchable?: boolean;
  created_at: string;
}

export interface Category {
  id: string;
  name: string;
  description: string | null;
  parent_id?: string | null;
  created_by?: string | null;
  created_at: string;
}

export interface Proposal {
  id: string;
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
  // Join
  profiles?: Profile;
  categories?: Category;
}

export interface Vote {
  id: string;
  proposal_id: string;
  voter_id: string;
  vote_type: VoteType;
  voting_weight: number;
  created_at: string;
}

// --- Democrazia Liquida ---
export interface Delegation {
  id: string;
  delegator_id: string;
  delegate_id: string;
  category_id: string | null;
  status?: DelegationStatus;
  created_at: string;
  // Join
  delegator?: Profile;
  delegate?: Profile;
  categories?: Category;
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
  name: string;
  slug: string;
  usage_count: number;
  created_at: string;
  created_by?: string | null;
}

// --- Social/Commenti ---
export interface Comment {
  id: string;
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

// --- Partiti Politici (Fase 4) ---
export type PartyMemberRole = "member" | "admin" | "founder";

export interface Party {
  id: string;
  name: string;
  description: string | null;
  manifesto: string | null;
  logo_emoji: string;
  founder_id: string;
  is_active: boolean;
  created_at: string;
  // Join
  profiles?: Profile;
  member_count?: number;
}

export interface PartyMember {
  id: string;
  party_id: string;
  user_id: string;
  role: PartyMemberRole;
  vote_weight: number;
  joined_at: string;
  // Join
  profiles?: Profile;
  parties?: Party;
}

export interface PartyVote {
  id: string;
  party_id: string;
  proposal_id: string;
  vote_type: VoteType;
  decided_by: string;
  created_at: string;
  // Join
  parties?: Party;
  proposals?: Proposal;
}

export interface PartyForumPost {
  id: string;
  party_id: string;
  author_id: string;
  title: string | null;
  body: string;
  is_admin_only: boolean;
  parent_id: string | null;
  created_at: string;
  // Join
  profiles?: { full_name: string | null };
}

// --- Sotto-giurisdizioni (Fase 4) ---
export type JurisdictionType = "virtual" | "geographic";
export type JurisdictionMemberRole = "member" | "admin" | "founder";

export interface Jurisdiction {
  id: string;
  name: string;
  description: string | null;
  type: JurisdictionType;
  logo_emoji: string;
  founder_id: string;
  parent_jurisdiction_id: string | null;
  location_name: string | null;
  location_coords: Record<string, number> | null;
  is_active: boolean;
  created_at: string;
  // Join
  profiles?: Profile;
  member_count?: number;
}

export interface JurisdictionMember {
  id: string;
  jurisdiction_id: string;
  user_id: string;
  role: JurisdictionMemberRole;
  joined_at: string;
  // Join
  profiles?: Profile;
  jurisdictions?: Jurisdiction;
}

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
  show_party_membership: boolean;
  show_jurisdiction_membership: boolean;
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
  show_activity?: boolean;
  show_delegations?: boolean;
  show_party_membership?: boolean;
  show_jurisdiction_membership?: boolean;
  dm_policy?: DmPolicy;
  allow_mentions?: boolean;
  is_private?: boolean;
  is_restricted?: boolean;
}

// --- Compositi ---
export interface ProposalWithResults extends Proposal {
  results?: ProposalResults;
  distributed_results?: DistributedResult[];
  has_voted?: boolean;
  options?: ProposalOption[];
  signal_count?: number;
}

// --- Discussion Forum ---
export type DiscussionChannel = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  emoji: string;
  color: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
};

export type Discussion = {
  id: string;
  author_id: string;
  channel_id: string;
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
export type FollowTargetType = "citizen" | "party" | "jurisdiction";

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
export type ElectionType = "general" | "jurisdiction" | "party" | "position";

export interface Election {
  id: string;
  title: string;
  description: string | null;
  election_type: ElectionType;
  jurisdiction_id: string | null;
  party_id: string | null;
  position_name: string;
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
  jurisdictions?: { name: string; logo_emoji: string };
  parties?: { name: string; logo_emoji: string };
  candidate_count?: number;
}

export interface Candidate {
  id: string;
  election_id: string;
  user_id: string;
  party_id: string | null;
  platform: string | null;
  status: CandidateStatus;
  created_at: string;
  withdrawn_at: string | null;
  // Joins
  profiles?: Profile;
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
  actor_party_id: string | null;
  actor_jurisdiction_id: string | null;
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

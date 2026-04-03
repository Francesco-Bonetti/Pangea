// ============================================
// TIPI AGORA - Piattaforma Democratica Pangea
// Fase 2: Democrazia Liquida + Mercato di Curatela + Voto Multiplo Distribuito
// ============================================

// --- Status & Enums ---
export type ProposalStatus = "draft" | "curation" | "active" | "closed" | "repealed";
export type VoteType = "yea" | "nay" | "abstain";
export type UserRole = "citizen" | "moderator" | "admin";
export type DelegationStatus = "pending" | "accepted" | "rejected";
export type ProposalType = "new" | "amendment" | "repeal";

// --- Entità Base ---
export interface Profile {
  id: string;
  full_name: string | null;
  bio: string | null;
  role?: UserRole;
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

// --- Mercato di Curatela ---
export interface ProposalSignal {
  id: string;
  proposal_id: string;
  supporter_id: string;
  signal_strength: number;
  created_at: string;
}

// --- Voto Multiplo Distribuito ---
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

// --- Risultati Aggregati (RPC) ---

// Risultati legacy (voto binario)
export interface ProposalResults {
  yea_count: number;
  nay_count: number;
  abstain_count: number;
}

// Risultati Voto Multiplo Distribuito
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

// --- Compositi ---
export interface ProposalWithResults extends Proposal {
  results?: ProposalResults;
  distributed_results?: DistributedResult[];
  has_voted?: boolean;
  options?: ProposalOption[];
  signal_count?: number;
}

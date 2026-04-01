// ============================================
// TIPI AGORA - Piattaforma Democratica Pangea
// Fase 2: Democrazia Liquida + Mercato di Curatela + Voto Multiplo Distribuito
// ============================================

// --- Status & Enums ---
export type ProposalStatus = "draft" | "curation" | "active" | "closed";
export type VoteType = "yea" | "nay" | "abstain";

// --- Entità Base ---
export interface Profile {
  id: string;
  full_name: string | null;
  bio: string | null;
  created_at: string;
}

export interface Category {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
}

export interface Proposal {
  id: string;
  author_id: string;
  title: string;
  content: string;
  dispositivo: string | null;
  status: ProposalStatus;
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

// --- Compositi ---
export interface ProposalWithResults extends Proposal {
  results?: ProposalResults;
  distributed_results?: DistributedResult[];
  has_voted?: boolean;
  options?: ProposalOption[];
  signal_count?: number;
}

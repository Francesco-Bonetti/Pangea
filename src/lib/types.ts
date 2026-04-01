// ============================================
// TIPI AGORA - Piattaforma Democratica Pangea
// ============================================

export type ProposalStatus = "draft" | "active" | "closed";
export type VoteType = "yea" | "nay" | "abstain";

export interface Profile {
  id: string;
  full_name: string | null;
  bio: string | null;
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
  // Join con profiles
  profiles?: Profile;
}

export interface Vote {
  id: string;
  proposal_id: string;
  voter_id: string;
  vote_type: VoteType;
  created_at: string;
}

// Risultati aggregati RPC (nessun dato personale)
export interface ProposalResults {
  yea_count: number;
  nay_count: number;
  abstain_count: number;
}

export interface ProposalWithResults extends Proposal {
  results?: ProposalResults;
  has_voted?: boolean;
}

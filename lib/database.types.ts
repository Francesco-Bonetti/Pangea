export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  __InternalSupabase: { PostgrestVersion: "14.4" }
  public: {
    Tables: {
      citizens: {
        Row: { bio: string | null; created_at: string; did: string | null; display_name: string; id: string; is_verified: boolean; reputation_score: number; updated_at: string }
        Insert: { bio?: string | null; created_at?: string; did?: string | null; display_name: string; id: string; is_verified?: boolean; reputation_score?: number; updated_at?: string }
        Update: { bio?: string | null; created_at?: string; did?: string | null; display_name?: string; id?: string; is_verified?: boolean; reputation_score?: number; updated_at?: string }
        Relationships: []
      }
      delegations: {
        Row: { created_at: string; delegate_id: string; delegator_id: string; domain: string | null; id: string; is_active: boolean; updated_at: string }
        Insert: { created_at?: string; delegate_id: string; delegator_id: string; domain?: string | null; id?: string; is_active?: boolean; updated_at?: string }
        Update: { created_at?: string; delegate_id?: string; delegator_id?: string; domain?: string | null; id?: string; is_active?: boolean; updated_at?: string }
        Relationships: [
          { foreignKeyName: "delegations_delegate_id_fkey"; columns: ["delegate_id"]; isOneToOne: false; referencedRelation: "citizens"; referencedColumns: ["id"] },
          { foreignKeyName: "delegations_delegator_id_fkey"; columns: ["delegator_id"]; isOneToOne: false; referencedRelation: "citizens"; referencedColumns: ["id"] }
        ]
      }
      proposals: {
        Row: { author_id: string | null; body: string; category: string; created_at: string; id: string; prop_number: number; status: string; summary: string; title: string; updated_at: string; voting_ends_at: string }
        Insert: { author_id?: string | null; body: string; category: string; created_at?: string; id?: string; prop_number: number; status?: string; summary: string; title: string; updated_at?: string; voting_ends_at: string }
        Update: { author_id?: string | null; body?: string; category?: string; created_at?: string; id?: string; prop_number?: number; status?: string; summary?: string; title?: string; updated_at?: string; voting_ends_at?: string }
        Relationships: [{ foreignKeyName: "proposals_author_id_fkey"; columns: ["author_id"]; isOneToOne: false; referencedRelation: "citizens"; referencedColumns: ["id"] }]
      }
      votes: {
        Row: { choice: string; created_at: string; delegated_from: string[] | null; id: string; proposal_id: string; voter_id: string; weight: number }
        Insert: { choice: string; created_at?: string; delegated_from?: string[] | null; id?: string; proposal_id: string; voter_id: string; weight?: number }
        Update: { choice?: string; created_at?: string; delegated_from?: string[] | null; id?: string; proposal_id?: string; voter_id?: string; weight?: number }
        Relationships: [
          { foreignKeyName: "votes_proposal_id_fkey"; columns: ["proposal_id"]; isOneToOne: false; referencedRelation: "proposals"; referencedColumns: ["id"] },
          { foreignKeyName: "votes_voter_id_fkey"; columns: ["voter_id"]; isOneToOne: false; referencedRelation: "citizens"; referencedColumns: ["id"] }
        ]
      }
    }
    Views: {
      proposal_tally: {
        Row: { abstain_weight: number | null; no_weight: number | null; prop_number: number | null; proposal_id: string | null; status: string | null; title: string | null; total_votes: number | null; total_weight: number | null; voting_ends_at: string | null; yes_weight: number | null }
        Relationships: []
      }
    }
    Functions: { [_ in never]: never }
    Enums: { [_ in never]: never }
    CompositeTypes: { [_ in never]: never }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">
type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<T extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])> =
  (DefaultSchema["Tables"] & DefaultSchema["Views"])[T] extends { Row: infer R } ? R : never

export type TablesInsert<T extends keyof DefaultSchema["Tables"]> =
  DefaultSchema["Tables"][T] extends { Insert: infer I } ? I : never

export type TablesUpdate<T extends keyof DefaultSchema["Tables"]> =
  DefaultSchema["Tables"][T] extends { Update: infer U } ? U : never

// Convenience types
export type Citizen = Tables<"citizens">
export type Proposal = Tables<"proposals">
export type Vote = Tables<"votes">
export type Delegation = Tables<"delegations">
export type ProposalTally = Tables<"proposal_tally">
export type ProposalCategory = "civil" | "treasury" | "environment" | "ethics" | "comms" | "constitutional" | "other"
export type ProposalStatus = "open" | "passed" | "rejected" | "archived" | "pending"
export type VoteChoice = "yes" | "no" | "abstain"

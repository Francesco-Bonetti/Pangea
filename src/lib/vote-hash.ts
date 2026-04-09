// ============================================
// VOTE HASHING — Commit-and-Reveal (DE-14)
// Pangea — Secure Ballot
// ============================================
// Client-side generation of vote hash and salt.
// Hash format: SHA-256( vote_type | allocations_json | salt )
// The same format is verified server-side in upsert_proposal_vote RPC.
// ============================================

/**
 * Generate a cryptographically random hex salt (32 bytes = 64 hex chars)
 */
export function generateVoteSalt(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Compute SHA-256 hash of the vote data.
 * Format must match server-side: vote_type | allocations_json | salt
 */
export async function computeVoteHash(
  voteType: string,
  allocations: Record<string, number> | null,
  salt: string
): Promise<string> {
  // Build allocations JSON matching server format
  // Server uses COALESCE(p_allocations::text, '[]')
  const allocJson = allocations
    ? JSON.stringify(
        Object.entries(allocations)
          .filter(([, pct]) => pct > 0)
          .map(([optionId, pct]) => ({
            option_id: optionId,
            allocation_percentage: pct,
          }))
      )
    : "[]";

  const input = `${voteType}|${allocJson}|${salt}`;
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

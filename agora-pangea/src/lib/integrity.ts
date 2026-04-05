/**
 * PANGEA — Hash-Based Data Integrity System
 *
 * Client-side utilities for:
 * - SHA-256 content hashing (Web Crypto API)
 * - Merkle tree construction & verification
 * - Hash chain validation
 * - Public verification helpers
 */

// ── SHA-256 Hashing ──

/**
 * Compute SHA-256 hash of a string using Web Crypto API
 */
export async function sha256(data: string): Promise<string> {
  const encoder = new TextEncoder();
  const buffer = encoder.encode(data);
  const hashBuffer = await crypto.subtle.digest("SHA-256", buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Compute SHA-256 hash of a JSON object (deterministic serialization)
 */
export async function hashObject(obj: Record<string, unknown>): Promise<string> {
  // Sort keys for deterministic serialization
  const sorted = JSON.stringify(obj, Object.keys(obj).sort());
  return sha256(sorted);
}

// ── Merkle Tree ──

export interface MerkleProof {
  leaf: string;
  proof: Array<{ hash: string; position: "left" | "right" }>;
  root: string;
}

/**
 * Build a Merkle tree from an array of leaf hashes
 * Returns the root hash and the tree layers
 */
export async function buildMerkleTree(
  leaves: string[]
): Promise<{ root: string; layers: string[][] }> {
  if (leaves.length === 0) {
    return { root: "", layers: [] };
  }

  // Ensure even number of leaves by duplicating last if odd
  let currentLayer = [...leaves];
  const layers: string[][] = [currentLayer];

  while (currentLayer.length > 1) {
    const nextLayer: string[] = [];
    for (let i = 0; i < currentLayer.length; i += 2) {
      const left = currentLayer[i];
      const right = currentLayer[i + 1] || left; // Duplicate last if odd
      const combined = await sha256(left + right);
      nextLayer.push(combined);
    }
    layers.push(nextLayer);
    currentLayer = nextLayer;
  }

  return { root: currentLayer[0], layers };
}

/**
 * Generate a Merkle proof for a specific leaf
 */
export async function generateMerkleProof(
  leaves: string[],
  targetIndex: number
): Promise<MerkleProof | null> {
  if (targetIndex < 0 || targetIndex >= leaves.length) return null;

  const { root, layers } = await buildMerkleTree(leaves);
  const proof: MerkleProof["proof"] = [];

  let idx = targetIndex;
  for (let i = 0; i < layers.length - 1; i++) {
    const layer = layers[i];
    const isRight = idx % 2 === 1;
    const siblingIdx = isRight ? idx - 1 : idx + 1;

    if (siblingIdx < layer.length) {
      proof.push({
        hash: layer[siblingIdx],
        position: isRight ? "left" : "right",
      });
    } else {
      proof.push({
        hash: layer[idx],
        position: isRight ? "left" : "right",
      });
    }

    idx = Math.floor(idx / 2);
  }

  return { leaf: leaves[targetIndex], proof, root };
}

/**
 * Verify a Merkle proof
 */
export async function verifyMerkleProof(proof: MerkleProof): Promise<boolean> {
  let currentHash = proof.leaf;

  for (const step of proof.proof) {
    if (step.position === "left") {
      currentHash = await sha256(step.hash + currentHash);
    } else {
      currentHash = await sha256(currentHash + step.hash);
    }
  }

  return currentHash === proof.root;
}

// ── Hash Chain Verification ──

export interface HashChainEntry {
  content_hash: string;
  previous_hash: string | null;
  version: number;
  created_at: string;
}

/**
 * Verify the integrity of a hash chain
 */
export function verifyHashChain(chain: HashChainEntry[]): {
  valid: boolean;
  brokenAt?: number;
  message: string;
} {
  if (chain.length === 0) {
    return { valid: true, message: "Empty chain" };
  }

  // Sort by version
  const sorted = [...chain].sort((a, b) => a.version - b.version);

  // First entry should have no previous hash
  if (sorted[0].previous_hash !== null) {
    return {
      valid: false,
      brokenAt: 0,
      message: "First entry in chain has a previous_hash (should be null)",
    };
  }

  // Each subsequent entry should reference the previous hash
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i].previous_hash !== sorted[i - 1].content_hash) {
      return {
        valid: false,
        brokenAt: i,
        message: `Chain broken at version ${sorted[i].version}: expected previous_hash ${sorted[i - 1].content_hash} but got ${sorted[i].previous_hash}`,
      };
    }
  }

  return {
    valid: true,
    message: `Chain verified: ${sorted.length} version(s), all links intact`,
  };
}

// ── Entity Type Labels ──

export const entityTypeLabels: Record<string, string> = {
  law: "Law",
  proposal: "Proposal",
  vote: "Vote",
  delegation: "Delegation",
  amendment: "Amendment",
  election: "Election",
  election_vote: "Election Vote",
};

// ── Hash Formatting ──

/**
 * Format a hash for display (truncated)
 */
export function formatHash(hash: string, length: number = 12): string {
  if (!hash) return "—";
  if (hash.length <= length) return hash;
  return `${hash.slice(0, length / 2)}...${hash.slice(-length / 2)}`;
}

/**
 * Format a hash with full display and copy support
 */
export function formatHashFull(hash: string): string {
  return hash || "—";
}

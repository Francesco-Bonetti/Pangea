-- =============================================
-- DIAMOND EDITION — STEP 3 (continued)
-- DE-14: Commit-and-Reveal — commit phase
-- DE-15: Hide vote breakdown during active phase
-- Applied: 2026-04-09
-- =============================================

-- ─── DE-14: Add commit-reveal columns to votes ───

-- vote_hash: SHA-256 hash of (vote_type|allocations_json|salt)
-- vote_salt: random hex salt generated client-side (stored for verification)
-- These create a verifiable audit trail: anyone can recompute the hash
-- and confirm it matches, proving the vote was not altered post-submission.
ALTER TABLE public.votes
  ADD COLUMN IF NOT EXISTS vote_hash text,
  ADD COLUMN IF NOT EXISTS vote_salt text;

-- Index for integrity audits (find votes missing hashes)
CREATE INDEX IF NOT EXISTS idx_votes_vote_hash ON public.votes(vote_hash) WHERE vote_hash IS NOT NULL;

-- ─── DE-14: Update upsert_proposal_vote to accept and verify hash ───

CREATE OR REPLACE FUNCTION public.upsert_proposal_vote(
  p_proposal_id uuid,
  p_voter_id uuid,
  p_vote_type text,
  p_voting_weight numeric DEFAULT 1,
  p_vote_hash text DEFAULT NULL,
  p_vote_salt text DEFAULT NULL,
  p_allocations jsonb DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_existing_vote record;
  v_result jsonb;
  v_vote_id uuid;
  v_expected_hash text;
  v_hash_input text;
BEGIN
  -- Check if proposal is active
  IF NOT EXISTS (
    SELECT 1 FROM proposals WHERE id = p_proposal_id AND status = 'active'
  ) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'PROPOSAL_NOT_ACTIVE',
      'message', 'This proposal is not in active voting phase'
    );
  END IF;

  -- Verify hash integrity if hash is provided
  -- Hash format: SHA-256( vote_type | allocations_json | salt )
  IF p_vote_hash IS NOT NULL AND p_vote_salt IS NOT NULL THEN
    v_hash_input := p_vote_type || '|' || COALESCE(p_allocations::text, '[]') || '|' || p_vote_salt;
    v_expected_hash := encode(digest(v_hash_input, 'sha256'), 'hex');

    IF v_expected_hash != p_vote_hash THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'HASH_MISMATCH',
        'message', 'Vote hash verification failed — data may have been tampered with'
      );
    END IF;
  END IF;

  -- Check if voter has an existing sealed vote
  SELECT id, is_final INTO v_existing_vote
  FROM votes
  WHERE proposal_id = p_proposal_id AND voter_id = p_voter_id;

  IF v_existing_vote IS NOT NULL AND v_existing_vote.is_final THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'VOTE_SEALED',
      'message', 'Your vote has been sealed and cannot be changed'
    );
  END IF;

  -- UPSERT: insert new vote or update existing one
  IF v_existing_vote IS NOT NULL THEN
    UPDATE votes
    SET vote_type = p_vote_type,
        voting_weight = p_voting_weight,
        vote_hash = p_vote_hash,
        vote_salt = p_vote_salt,
        created_at = now()
    WHERE id = v_existing_vote.id
    RETURNING id INTO v_vote_id;

    -- Clear old allocations (will be re-inserted by the client)
    DELETE FROM vote_allocations WHERE vote_id = v_vote_id;

    v_result := jsonb_build_object(
      'success', true,
      'vote_id', v_vote_id,
      'action', 'updated',
      'is_final', false,
      'hash_verified', (p_vote_hash IS NOT NULL)
    );
  ELSE
    INSERT INTO votes (proposal_id, voter_id, vote_type, voting_weight, is_final, vote_hash, vote_salt)
    VALUES (p_proposal_id, p_voter_id, p_vote_type, p_voting_weight, false, p_vote_hash, p_vote_salt)
    RETURNING id INTO v_vote_id;

    v_result := jsonb_build_object(
      'success', true,
      'vote_id', v_vote_id,
      'action', 'created',
      'is_final', false,
      'hash_verified', (p_vote_hash IS NOT NULL)
    );
  END IF;

  RETURN v_result;
END;
$$;

-- ─── DE-15: Turnout-only RPC for active proposals ───
-- Returns ONLY the count of votes (turnout), not the breakdown.
-- Full results are returned only for closed proposals.

CREATE OR REPLACE FUNCTION public.get_proposal_turnout(
  p_proposal_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_status text;
  v_total_votes integer;
  v_total_weight numeric;
BEGIN
  SELECT status INTO v_status FROM proposals WHERE id = p_proposal_id;

  IF v_status IS NULL THEN
    RETURN jsonb_build_object('error', 'PROPOSAL_NOT_FOUND');
  END IF;

  SELECT COUNT(*)::integer, COALESCE(SUM(voting_weight), 0)
  INTO v_total_votes, v_total_weight
  FROM votes
  WHERE proposal_id = p_proposal_id;

  RETURN jsonb_build_object(
    'proposal_id', p_proposal_id,
    'status', v_status,
    'total_votes', v_total_votes,
    'total_weight', v_total_weight,
    'results_visible', (v_status = 'closed')
  );
END;
$$;

-- ─── DE-15: Override get_distributed_proposal_results for phase awareness ───
-- When proposal is active: return option titles but zero scores (only turnout)
-- When proposal is closed: return full results

CREATE OR REPLACE FUNCTION public.get_distributed_proposal_results(
  p_proposal_id uuid
)
RETURNS TABLE(
  option_id uuid,
  option_title text,
  weighted_score numeric,
  vote_count bigint,
  total_votes bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_status text;
  v_total bigint;
BEGIN
  SELECT status INTO v_status FROM proposals WHERE id = p_proposal_id;

  -- Count total votes for this proposal
  SELECT COUNT(*) INTO v_total FROM votes WHERE proposal_id = p_proposal_id;

  IF v_status = 'active' THEN
    -- ACTIVE: return option names + turnout, but ZERO scores (anti-herding)
    RETURN QUERY
    SELECT
      po.id AS option_id,
      po.title AS option_title,
      0::numeric AS weighted_score,
      0::bigint AS vote_count,
      v_total AS total_votes
    FROM proposal_options po
    WHERE po.proposal_id = p_proposal_id
    ORDER BY po.created_at;
  ELSE
    -- CLOSED (or other): return full results
    RETURN QUERY
    SELECT
      po.id AS option_id,
      po.title AS option_title,
      COALESCE(SUM(va.allocation_percentage * v.voting_weight / 100.0), 0) AS weighted_score,
      COUNT(DISTINCT v.id) AS vote_count,
      v_total AS total_votes
    FROM proposal_options po
    LEFT JOIN vote_allocations va ON va.option_id = po.id
    LEFT JOIN votes v ON v.id = va.vote_id
    WHERE po.proposal_id = p_proposal_id
    GROUP BY po.id, po.title, po.created_at
    ORDER BY po.created_at;
  END IF;
END;
$$;

-- Grant execute
GRANT EXECUTE ON FUNCTION public.get_proposal_turnout TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_proposal_turnout TO anon;
GRANT EXECUTE ON FUNCTION public.get_distributed_proposal_results TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_distributed_proposal_results TO anon;
GRANT EXECUTE ON FUNCTION public.upsert_proposal_vote TO authenticated;

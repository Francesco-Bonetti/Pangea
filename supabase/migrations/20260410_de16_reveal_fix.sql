-- =============================================
-- DIAMOND EDITION — DE-16 FIX
-- Fix hash verification in reveal phase:
-- 1. Ensure pgcrypto extension for digest()
-- 2. Add vote_allocations_raw to store exact JSON used for hashing
-- 3. Fix reveal_proposal_votes to use stored raw text
-- 4. Add get_proposal_integrity RPC for UI
-- Applied: 2026-04-10
-- =============================================

-- ─── Ensure pgcrypto is available (needed for digest/SHA-256) ───
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ─── Store raw allocations JSON used for hashing ───
-- This fixes the ordering mismatch: client JSON order != server ORDER BY
ALTER TABLE public.votes
  ADD COLUMN IF NOT EXISTS vote_allocations_raw text;

-- Backfill existing votes: reconstruct from vote_allocations
-- (best effort — ordering may differ from original, but these are pre-fix votes)
UPDATE votes v
SET vote_allocations_raw = COALESCE(
  (SELECT jsonb_agg(
    jsonb_build_object('option_id', va.option_id, 'allocation_percentage', va.allocation_percentage)
    ORDER BY va.option_id
  )::text
  FROM vote_allocations va WHERE va.vote_id = v.id),
  '[]'
)
WHERE v.vote_allocations_raw IS NULL
  AND v.vote_hash IS NOT NULL;

-- ─── Fix upsert_proposal_vote: store raw allocations ───
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
  v_alloc_text text;
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

  -- Normalize allocations text for hashing
  v_alloc_text := COALESCE(p_allocations::text, '[]');

  -- Verify hash integrity if hash is provided
  -- Hash format: SHA-256( vote_type | allocations_json | salt )
  IF p_vote_hash IS NOT NULL AND p_vote_salt IS NOT NULL THEN
    v_hash_input := p_vote_type || '|' || v_alloc_text || '|' || p_vote_salt;
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
        vote_allocations_raw = v_alloc_text,
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
    INSERT INTO votes (proposal_id, voter_id, vote_type, voting_weight, is_final, vote_hash, vote_salt, vote_allocations_raw)
    VALUES (p_proposal_id, p_voter_id, p_vote_type, p_voting_weight, false, p_vote_hash, p_vote_salt, v_alloc_text)
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

-- ─── Fix reveal_proposal_votes: use stored raw allocations ───
CREATE OR REPLACE FUNCTION public.reveal_proposal_votes(
  p_proposal_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_status text;
  v_sealed_count integer := 0;
  v_verified_count integer := 0;
  v_mismatch_count integer := 0;
  v_missing_count integer := 0;
  v_vote record;
  v_hash_input text;
  v_recomputed_hash text;
BEGIN
  -- 1. Validate: proposal must be closed
  SELECT status INTO v_status FROM proposals WHERE id = p_proposal_id;

  IF v_status IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'PROPOSAL_NOT_FOUND');
  END IF;

  IF v_status != 'closed' THEN
    RETURN jsonb_build_object('success', false, 'error', 'PROPOSAL_NOT_CLOSED');
  END IF;

  -- 2. Seal all unsealed votes
  UPDATE votes
  SET is_final = true
  WHERE proposal_id = p_proposal_id AND is_final = false;
  GET DIAGNOSTICS v_sealed_count = ROW_COUNT;

  -- 3. Verify hash integrity for every vote
  FOR v_vote IN
    SELECT v.id, v.vote_type, v.vote_hash, v.vote_salt,
           COALESCE(v.vote_allocations_raw, '[]') AS alloc_raw
    FROM votes v
    WHERE v.proposal_id = p_proposal_id
  LOOP
    IF v_vote.vote_hash IS NULL THEN
      -- Vote cast without hash (pre-DE-14 or fallback)
      v_missing_count := v_missing_count + 1;

      INSERT INTO vote_integrity_log (proposal_id, vote_id, expected_hash, actual_hash, status)
      VALUES (p_proposal_id, v_vote.id, '', NULL, 'missing_hash');
    ELSE
      -- Recompute: SHA-256( vote_type | allocations_raw | salt )
      -- Uses the EXACT same text that was stored at commit time
      v_hash_input := v_vote.vote_type || '|' || v_vote.alloc_raw || '|' || v_vote.vote_salt;
      v_recomputed_hash := encode(digest(v_hash_input, 'sha256'), 'hex');

      IF v_recomputed_hash = v_vote.vote_hash THEN
        v_verified_count := v_verified_count + 1;

        INSERT INTO vote_integrity_log (proposal_id, vote_id, expected_hash, actual_hash, status)
        VALUES (p_proposal_id, v_vote.id, v_vote.vote_hash, v_recomputed_hash, 'verified');
      ELSE
        v_mismatch_count := v_mismatch_count + 1;

        INSERT INTO vote_integrity_log (proposal_id, vote_id, expected_hash, actual_hash, status)
        VALUES (p_proposal_id, v_vote.id, v_vote.vote_hash, v_recomputed_hash, 'mismatch');
      END IF;
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'proposal_id', p_proposal_id,
    'sealed_count', v_sealed_count,
    'verified_count', v_verified_count,
    'mismatch_count', v_mismatch_count,
    'missing_hash_count', v_missing_count,
    'integrity_ok', (v_mismatch_count = 0)
  );
END;
$$;

-- ─── Public integrity query (for UI) ───
-- Returns aggregated integrity status for a closed proposal.
-- Visible to all authenticated users (transparency).

CREATE OR REPLACE FUNCTION public.get_proposal_integrity(
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
  v_verified integer;
  v_mismatches integer;
  v_missing integer;
  v_all_sealed boolean;
BEGIN
  SELECT status INTO v_status FROM proposals WHERE id = p_proposal_id;

  IF v_status IS NULL THEN
    RETURN jsonb_build_object('error', 'PROPOSAL_NOT_FOUND');
  END IF;

  IF v_status != 'closed' THEN
    RETURN jsonb_build_object('status', 'not_closed', 'results_available', false);
  END IF;

  -- Count total votes
  SELECT COUNT(*)::integer INTO v_total_votes
  FROM votes WHERE proposal_id = p_proposal_id;

  -- Check if all votes are sealed
  SELECT NOT EXISTS (
    SELECT 1 FROM votes WHERE proposal_id = p_proposal_id AND is_final = false
  ) INTO v_all_sealed;

  -- Get integrity counts from log
  SELECT
    COALESCE(SUM(CASE WHEN status = 'verified' THEN 1 ELSE 0 END), 0)::integer,
    COALESCE(SUM(CASE WHEN status = 'mismatch' THEN 1 ELSE 0 END), 0)::integer,
    COALESCE(SUM(CASE WHEN status = 'missing_hash' THEN 1 ELSE 0 END), 0)::integer
  INTO v_verified, v_mismatches, v_missing
  FROM vote_integrity_log
  WHERE proposal_id = p_proposal_id;

  RETURN jsonb_build_object(
    'status', 'closed',
    'results_available', true,
    'total_votes', v_total_votes,
    'all_sealed', v_all_sealed,
    'verified_count', v_verified,
    'mismatch_count', v_mismatches,
    'missing_hash_count', v_missing,
    'integrity_ok', (v_mismatches = 0),
    'audit_complete', (v_verified + v_mismatches + v_missing >= v_total_votes)
  );
END;
$$;

-- Grants
GRANT EXECUTE ON FUNCTION public.upsert_proposal_vote TO authenticated;
GRANT EXECUTE ON FUNCTION public.reveal_proposal_votes TO authenticated;
GRANT EXECUTE ON FUNCTION public.reveal_all_pending TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_proposal_integrity TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_proposal_integrity TO anon;

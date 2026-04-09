-- =============================================
-- DIAMOND EDITION — STEP 3: Secure Ballot
-- DE-12: is_final column on votes (seal mechanism)
-- DE-13: Fluid voting (UPSERT while !is_final)
-- Applied: 2026-04-09
-- =============================================

-- DE-12: Add is_final to votes — when true, the vote is sealed and cannot be changed
ALTER TABLE public.votes
  ADD COLUMN IF NOT EXISTS is_final boolean NOT NULL DEFAULT false;

-- Index for fast lookups on sealed/unsealed votes
CREATE INDEX IF NOT EXISTS idx_votes_is_final ON public.votes(is_final) WHERE is_final = true;

-- Drop existing unique constraint if any (proposal_id, voter_id)
-- We need to allow UPSERT, so the unique constraint stays — we use ON CONFLICT
-- The existing unique constraint on (proposal_id, voter_id) is what enables UPSERT

-- DE-13: RPC for fluid voting — UPSERT vote (insert or update if not sealed)
-- This replaces direct INSERT to votes table for proposal voting
CREATE OR REPLACE FUNCTION public.upsert_proposal_vote(
  p_proposal_id uuid,
  p_voter_id uuid,
  p_vote_type text,
  p_voting_weight numeric DEFAULT 1
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
    -- Update existing vote
    UPDATE votes
    SET vote_type = p_vote_type,
        voting_weight = p_voting_weight,
        created_at = now()
    WHERE id = v_existing_vote.id
    RETURNING id INTO v_vote_id;

    -- Clear old allocations (will be re-inserted by the client)
    DELETE FROM vote_allocations WHERE vote_id = v_vote_id;

    v_result := jsonb_build_object(
      'success', true,
      'vote_id', v_vote_id,
      'action', 'updated',
      'is_final', false
    );
  ELSE
    -- Insert new vote
    INSERT INTO votes (proposal_id, voter_id, vote_type, voting_weight, is_final)
    VALUES (p_proposal_id, p_voter_id, p_vote_type, p_voting_weight, false)
    RETURNING id INTO v_vote_id;

    v_result := jsonb_build_object(
      'success', true,
      'vote_id', v_vote_id,
      'action', 'created',
      'is_final', false
    );
  END IF;

  RETURN v_result;
END;
$$;

-- DE-12: RPC to seal all votes for a proposal (called when proposal closes)
-- This is a CORE operation — once sealed, votes are immutable
CREATE OR REPLACE FUNCTION public.seal_proposal_votes(
  p_proposal_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sealed_count integer;
BEGIN
  -- Only seal if proposal is closed
  IF NOT EXISTS (
    SELECT 1 FROM proposals WHERE id = p_proposal_id AND status = 'closed'
  ) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'PROPOSAL_NOT_CLOSED',
      'message', 'Can only seal votes for closed proposals'
    );
  END IF;

  -- Seal all votes
  UPDATE votes
  SET is_final = true
  WHERE proposal_id = p_proposal_id AND is_final = false;

  GET DIAGNOSTICS v_sealed_count = ROW_COUNT;

  RETURN jsonb_build_object(
    'success', true,
    'sealed_count', v_sealed_count
  );
END;
$$;

-- DE-13: RPC to get user's current vote on a proposal (for fluid voting UI)
CREATE OR REPLACE FUNCTION public.get_my_proposal_vote(
  p_proposal_id uuid,
  p_voter_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_vote record;
  v_allocations jsonb;
BEGIN
  SELECT id, vote_type, voting_weight, is_final, created_at
  INTO v_vote
  FROM votes
  WHERE proposal_id = p_proposal_id AND voter_id = p_voter_id;

  IF v_vote IS NULL THEN
    RETURN jsonb_build_object('has_voted', false);
  END IF;

  -- Get allocations if any
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'option_id', va.option_id,
    'allocation_percentage', va.allocation_percentage
  )), '[]'::jsonb)
  INTO v_allocations
  FROM vote_allocations va
  WHERE va.vote_id = v_vote.id;

  RETURN jsonb_build_object(
    'has_voted', true,
    'vote_id', v_vote.id,
    'vote_type', v_vote.vote_type,
    'voting_weight', v_vote.voting_weight,
    'is_final', v_vote.is_final,
    'created_at', v_vote.created_at,
    'allocations', v_allocations
  );
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.upsert_proposal_vote TO authenticated;
GRANT EXECUTE ON FUNCTION public.seal_proposal_votes TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_proposal_vote TO authenticated;

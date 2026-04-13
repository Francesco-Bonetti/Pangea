-- ── T25: Unanimità sblocca tutto ──────────────────────────────────────────
-- LUX v2 Art. 7 exception: 100% YES (excl. guardian) overrides tier_ceiling
-- and locked_settings, but NEVER bypasses reinforced articles (Art. 3,5,6,11,12).

-- 1. Add unanimity columns to proposals
ALTER TABLE proposals
  ADD COLUMN IF NOT EXISTS unanimity_achieved   BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS unanimity_voter_count INTEGER;

-- 2. check_proposal_unanimity — called after each vote
CREATE OR REPLACE FUNCTION check_proposal_unanimity(p_proposal_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_yes_count      INTEGER := 0;
  v_total_count    INTEGER := 0;
  v_guardian_id    UUID;
  v_is_unanimous   BOOLEAN := false;
BEGIN
  -- Get guardian id (founder excluded from unanimity count per LUX Art. 7 T25)
  SELECT id INTO v_guardian_id
  FROM profiles
  WHERE is_guardian = true
  LIMIT 1;

  -- Count non-guardian voters
  SELECT
    COUNT(*) FILTER (WHERE vote_type = 'yes'),
    COUNT(*)
  INTO v_yes_count, v_total_count
  FROM votes
  WHERE proposal_id = p_proposal_id
    AND (v_guardian_id IS NULL OR voter_id != v_guardian_id);

  -- Unanimity: all votes are YES, at least 2 voters (prevents self-unanimity)
  v_is_unanimous := (v_total_count >= 2 AND v_yes_count = v_total_count);

  UPDATE proposals
  SET
    unanimity_achieved    = v_is_unanimous,
    unanimity_voter_count = v_total_count
  WHERE id = p_proposal_id;

  RETURN v_is_unanimous;
END;
$$;

-- 3. Update upsert_proposal_vote to trigger unanimity check after each vote
CREATE OR REPLACE FUNCTION public.upsert_proposal_vote(
  p_proposal_id   uuid,
  p_voter_id      uuid,
  p_vote_type     text,
  p_voting_weight numeric  DEFAULT 1,
  p_vote_hash     text     DEFAULT NULL,
  p_vote_salt     text     DEFAULT NULL,
  p_allocations   jsonb    DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_existing_vote RECORD;
  v_result        JSONB;
  v_vote_id       UUID;
  v_expected_hash TEXT;
  v_hash_input    TEXT;
  v_alloc_text    TEXT;
  v_is_group_vote BOOLEAN := false;
  v_unanimous     BOOLEAN := false;
BEGIN
  -- Proposal must be active
  IF NOT EXISTS (
    SELECT 1 FROM proposals WHERE id = p_proposal_id AND status = 'active'
  ) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'PROPOSAL_NOT_ACTIVE',
      'message', 'This proposal is not in active voting phase'
    );
  END IF;

  v_alloc_text := COALESCE(p_allocations::text, '[]');

  -- Hash verification (V3 blind voting)
  IF p_vote_hash IS NOT NULL AND p_vote_salt IS NOT NULL THEN
    v_hash_input    := p_vote_type || '|' || v_alloc_text || '|' || p_vote_salt;
    v_expected_hash := encode(digest(v_hash_input, 'sha256'), 'hex');
    IF v_expected_hash != p_vote_hash THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'HASH_MISMATCH',
        'message', 'Vote hash verification failed'
      );
    END IF;
  END IF;

  -- Auto-detect: voter is an authorized delegate of a group with active delegations
  SELECT EXISTS (
    SELECT 1
    FROM group_delegation_config gdc
    WHERE p_voter_id = ANY(gdc.authorized_member_ids)
      AND gdc.accept_delegations = true
      AND EXISTS (
        SELECT 1 FROM delegations d
        WHERE d.delegate_group_id = gdc.group_id
          AND d.status = 'accepted'
      )
  ) INTO v_is_group_vote;

  -- Fluid voting: check existing vote
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

  IF v_existing_vote IS NOT NULL THEN
    UPDATE votes
    SET vote_type               = p_vote_type,
        voting_weight           = p_voting_weight,
        vote_hash               = p_vote_hash,
        vote_salt               = p_vote_salt,
        vote_allocations_raw    = v_alloc_text,
        is_delegated_group_vote = v_is_group_vote,
        created_at              = now()
    WHERE id = v_existing_vote.id
    RETURNING id INTO v_vote_id;

    DELETE FROM vote_allocations WHERE vote_id = v_vote_id;

    v_result := jsonb_build_object(
      'success', true, 'vote_id', v_vote_id,
      'action', 'updated', 'is_final', false,
      'hash_verified', (p_vote_hash IS NOT NULL),
      'is_delegated_group_vote', v_is_group_vote
    );
  ELSE
    INSERT INTO votes (
      proposal_id, voter_id, vote_type, voting_weight,
      is_final, vote_hash, vote_salt, vote_allocations_raw,
      is_delegated_group_vote
    )
    VALUES (
      p_proposal_id, p_voter_id, p_vote_type, p_voting_weight,
      false, p_vote_hash, p_vote_salt, v_alloc_text,
      v_is_group_vote
    )
    RETURNING id INTO v_vote_id;

    v_result := jsonb_build_object(
      'success', true, 'vote_id', v_vote_id,
      'action', 'created', 'is_final', false,
      'hash_verified', (p_vote_hash IS NOT NULL),
      'is_delegated_group_vote', v_is_group_vote
    );
  END IF;

  -- T25: check unanimity after every vote
  v_unanimous := check_proposal_unanimity(p_proposal_id);

  RETURN v_result || jsonb_build_object('unanimity_achieved', v_unanimous);
END;
$$;

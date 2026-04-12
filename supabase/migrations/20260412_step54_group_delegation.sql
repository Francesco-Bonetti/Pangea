-- ══════════════════════════════════════════════════════════════
-- Step 5.4 — GROUP-DELEGATION (2026-04-12)
-- 1. Fix resolve_voting_weight: split group weight equally among authorized_members
-- 2. Update upsert_proposal_vote: auto-detect is_delegated_group_vote (Art. 4.5)
-- 3. New RPC: get_my_group_delegations (for "Delegated Groups" UI tab)
-- ══════════════════════════════════════════════════════════════

-- ─── 1. Fix resolve_voting_weight ───────────────────────────────────────────
-- Two-part calculation:
--   Part A: citizen-to-citizen chain (recursive, only d.delegate_id = p_voter_id)
--   Part B: for each group where voter is authorized, add floor(delegators / num_authorized)
-- This prevents each authorized member from claiming the full group weight.

CREATE OR REPLACE FUNCTION resolve_voting_weight(
  p_voter_id   UUID,
  p_proposal_id UUID DEFAULT NULL,
  p_category_id UUID DEFAULT NULL
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  v_citizen_weight INTEGER := 1;
  v_group_weight   INTEGER := 0;
  v_group_rec      RECORD;
  v_delegator_cnt  BIGINT;
  v_num_authorized INTEGER;
BEGIN
  -- ── Part A: citizen-to-citizen delegations ───────────────────────────────
  WITH RECURSIVE citizen_tree AS (
    -- Base: citizens who delegated directly to this voter
    SELECT d.delegator_id, d.is_transitive, 1 AS depth
    FROM delegations d
    WHERE d.delegate_id = p_voter_id
      AND d.delegate_group_id IS NULL
      AND d.status = 'accepted'
      AND (d.category_id IS NULL OR d.category_id = p_category_id)
      AND (p_proposal_id IS NULL OR d.delegator_id NOT IN (
            SELECT voter_id FROM votes WHERE proposal_id = p_proposal_id))

    UNION ALL

    -- Recursive: transitive delegators
    SELECT d.delegator_id, d.is_transitive, ct.depth + 1
    FROM delegations d
    JOIN citizen_tree ct ON d.delegate_id = ct.delegator_id
    WHERE d.status = 'accepted'
      AND ct.is_transitive = true
      AND d.delegate_group_id IS NULL
      AND (d.category_id IS NULL OR d.category_id = p_category_id)
      AND ct.depth < 100
      AND (p_proposal_id IS NULL OR d.delegator_id NOT IN (
            SELECT voter_id FROM votes WHERE proposal_id = p_proposal_id))
  )
  SELECT 1 + COUNT(DISTINCT delegator_id) INTO v_citizen_weight
  FROM citizen_tree;

  -- ── Part B: group delegations — split evenly among authorized members ────
  FOR v_group_rec IN
    SELECT gdc.group_id, array_length(gdc.authorized_member_ids, 1) AS num_authorized
    FROM group_delegation_config gdc
    WHERE p_voter_id = ANY(gdc.authorized_member_ids)
      AND gdc.accept_delegations = true
  LOOP
    v_num_authorized := GREATEST(v_group_rec.num_authorized, 1);

    -- Count delegators to this group (with override check)
    WITH RECURSIVE group_tree AS (
      SELECT d.delegator_id, d.is_transitive, 1 AS depth
      FROM delegations d
      WHERE d.delegate_group_id = v_group_rec.group_id
        AND d.status = 'accepted'
        AND (d.category_id IS NULL OR d.category_id = p_category_id)
        AND (p_proposal_id IS NULL OR d.delegator_id NOT IN (
              SELECT voter_id FROM votes WHERE proposal_id = p_proposal_id))

      UNION ALL

      SELECT d.delegator_id, d.is_transitive, gt.depth + 1
      FROM delegations d
      JOIN group_tree gt ON d.delegate_id = gt.delegator_id
      WHERE d.status = 'accepted'
        AND gt.is_transitive = true
        AND (d.category_id IS NULL OR d.category_id = p_category_id)
        AND gt.depth < 100
        AND (p_proposal_id IS NULL OR d.delegator_id NOT IN (
              SELECT voter_id FROM votes WHERE proposal_id = p_proposal_id))
    )
    SELECT COUNT(DISTINCT delegator_id) INTO v_delegator_cnt FROM group_tree;

    v_group_weight := v_group_weight + FLOOR(v_delegator_cnt::NUMERIC / v_num_authorized)::INTEGER;
  END LOOP;

  RETURN v_citizen_weight + v_group_weight;
END;
$$;


-- ─── 2. Update upsert_proposal_vote: auto-detect is_delegated_group_vote ────
-- The DB checks internally whether the voter is an authorized member in any
-- group that has active delegations → no client-side change needed.

CREATE OR REPLACE FUNCTION upsert_proposal_vote(
  p_proposal_id    UUID,
  p_voter_id       UUID,
  p_vote_type      TEXT,
  p_voting_weight  NUMERIC DEFAULT 1,
  p_vote_hash      TEXT DEFAULT NULL,
  p_vote_salt      TEXT DEFAULT NULL,
  p_allocations    JSONB DEFAULT NULL
)
RETURNS JSONB
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
      'success', true,
      'vote_id', v_vote_id,
      'action', 'updated',
      'is_final', false,
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
      'success', true,
      'vote_id', v_vote_id,
      'action', 'created',
      'is_final', false,
      'hash_verified', (p_vote_hash IS NOT NULL),
      'is_delegated_group_vote', v_is_group_vote
    );
  END IF;

  RETURN v_result;
END;
$$;


-- ─── 3. get_my_group_delegations — for "Delegated Groups" UI tab ─────────────
-- Returns groups where auth.uid() is an authorized delegate, with stats.

CREATE OR REPLACE FUNCTION get_my_group_delegations()
RETURNS TABLE(
  group_id         UUID,
  group_name       TEXT,
  group_emoji      TEXT,
  num_authorized   INTEGER,
  total_delegators BIGINT,
  my_split_weight  INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    g.id                                                         AS group_id,
    g.name                                                       AS group_name,
    g.logo_emoji                                                 AS group_emoji,
    GREATEST(array_length(gdc.authorized_member_ids, 1), 1)     AS num_authorized,
    COUNT(d.id)                                                  AS total_delegators,
    FLOOR(
      COUNT(d.id)::NUMERIC
      / GREATEST(array_length(gdc.authorized_member_ids, 1), 1)
    )::INTEGER                                                   AS my_split_weight
  FROM group_delegation_config gdc
  JOIN groups g ON g.id = gdc.group_id
  LEFT JOIN delegations d
    ON d.delegate_group_id = gdc.group_id
    AND d.status = 'accepted'
  WHERE auth.uid() = ANY(gdc.authorized_member_ids)
    AND gdc.accept_delegations = true
  GROUP BY g.id, g.name, g.logo_emoji, gdc.authorized_member_ids;
END;
$$;

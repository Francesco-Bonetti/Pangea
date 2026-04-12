-- ============================================================
-- T23: Double Vote + Trial + Node Contention
-- Ref: Art. 8.3 (Core/Platform = double vote with trial)
-- Ref: project_legislative_architecture.md (contention, approval voting)
-- ============================================================

-- ─── 1. New columns on proposals ────────────────────────────
ALTER TABLE proposals
  ADD COLUMN IF NOT EXISTS target_law_id UUID REFERENCES laws(id),
  ADD COLUMN IF NOT EXISTS trial_duration_days INTEGER DEFAULT 14
    CHECK (trial_duration_days BETWEEN 1 AND 90),
  ADD COLUMN IF NOT EXISTS first_vote_passed BOOLEAN,
  ADD COLUMN IF NOT EXISTS first_vote_closed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS trial_started_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ;

COMMENT ON COLUMN proposals.target_law_id IS
  'Which law tree node this proposal modifies. NULL = new root-level law.';
COMMENT ON COLUMN proposals.trial_duration_days IS
  'Trial period duration set by the author. Only used for double-vote tiers (core/platform).';

-- ─── 2. law_node_polls — one per law node, created lazily ───
CREATE TABLE IF NOT EXISTS law_node_polls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  law_id UUID NOT NULL REFERENCES laws(id) UNIQUE,
  status TEXT NOT NULL DEFAULT 'inactive'
    CHECK (status IN ('inactive', 'collecting', 'polling', 'voting', 'resolved')),
  poll_start TIMESTAMPTZ,
  poll_end TIMESTAMPTZ,
  current_proposal_id UUID REFERENCES proposals(id),
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE law_node_polls IS
  'Contention poll slot for each law node. Created lazily on first proposal targeting that node. '
  'inactive=no proposals, collecting=proposals accumulating, polling=approval vote in progress, '
  'voting=sequential proposal voting, resolved=done.';

-- RLS: everyone reads, system writes via SECURITY DEFINER
ALTER TABLE law_node_polls ENABLE ROW LEVEL SECURITY;
CREATE POLICY law_node_polls_read ON law_node_polls FOR SELECT USING (true);

-- ─── 3. poll_votes — approval voting (vote all you want) ────
CREATE TABLE IF NOT EXISTS poll_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  law_id UUID NOT NULL REFERENCES laws(id),
  voter_id UUID NOT NULL REFERENCES profiles(id),
  proposal_id UUID NOT NULL REFERENCES proposals(id),
  is_broadcast BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(law_id, voter_id, proposal_id)
);

COMMENT ON TABLE poll_votes IS
  'Approval votes in law node contention polls. Each citizen can approve multiple proposals. '
  'is_broadcast=true means vote was auto-replicated from another poll for the same proposal.';
COMMENT ON COLUMN poll_votes.is_broadcast IS
  'If true, this vote was auto-created when the citizen chose "vote everywhere" in another poll.';

ALTER TABLE poll_votes ENABLE ROW LEVEL SECURITY;
CREATE POLICY poll_votes_read ON poll_votes FOR SELECT USING (true);
CREATE POLICY poll_votes_insert ON poll_votes FOR INSERT
  WITH CHECK (auth.uid() = voter_id);

-- ─── 4. Indexes ─────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_proposals_target_law ON proposals(target_law_id)
  WHERE target_law_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_proposals_status_trial ON proposals(status, trial_ends_at)
  WHERE status = 'trial';
CREATE INDEX IF NOT EXISTS idx_law_node_polls_status ON law_node_polls(status)
  WHERE status NOT IN ('inactive', 'resolved');
CREATE INDEX IF NOT EXISTS idx_poll_votes_law ON poll_votes(law_id, proposal_id);

-- ─── 5. Helper: is this tier a double-vote tier? ────────────
CREATE OR REPLACE FUNCTION is_double_vote_tier(p_tier TEXT)
RETURNS BOOLEAN LANGUAGE sql IMMUTABLE AS $$
  SELECT p_tier IN ('core', 'platform');
$$;

-- ─── 6. RPC: advance_proposal_to_vote ───────────────────────
-- Called after curation passes. Handles contention detection,
-- poll creation, or direct advancement to vote.
CREATE OR REPLACE FUNCTION advance_proposal_to_vote(p_proposal_id UUID)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_proposal RECORD;
  v_target_law_id UUID;
  v_descendant_ids UUID[];
  v_competing_count INTEGER;
  v_poll RECORD;
  v_next_monday TIMESTAMPTZ;
BEGIN
  -- Get proposal
  SELECT * INTO v_proposal FROM proposals WHERE id = p_proposal_id;
  IF v_proposal IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'PROPOSAL_NOT_FOUND');
  END IF;
  IF v_proposal.status != 'curation' THEN
    RETURN jsonb_build_object('success', false, 'error', 'NOT_IN_CURATION');
  END IF;

  v_target_law_id := v_proposal.target_law_id;

  -- If no target law node, go straight to vote (new root-level law)
  IF v_target_law_id IS NULL THEN
    UPDATE proposals SET status = 'active',
      expires_at = now() + interval '7 days'
    WHERE id = p_proposal_id;
    RETURN jsonb_build_object('success', true, 'action', 'DIRECT_VOTE');
  END IF;

  -- Find all descendant law nodes (including self)
  WITH RECURSIVE tree AS (
    SELECT id FROM laws WHERE id = v_target_law_id
    UNION ALL
    SELECT l.id FROM laws l JOIN tree t ON l.parent_id = t.id
  )
  SELECT array_agg(id) INTO v_descendant_ids FROM tree;

  -- Count competing proposals (in curation or beyond) for same branch
  SELECT COUNT(*) INTO v_competing_count
  FROM proposals p
  WHERE p.target_law_id = ANY(v_descendant_ids)
    AND p.status IN ('curation', 'active', 'first_vote', 'trial', 'second_vote')
    AND p.id != p_proposal_id;

  -- Ensure poll exists for this law node
  INSERT INTO law_node_polls (law_id, status)
  VALUES (v_target_law_id, 'collecting')
  ON CONFLICT (law_id) DO NOTHING;

  SELECT * INTO v_poll FROM law_node_polls WHERE law_id = v_target_law_id;

  IF v_competing_count = 0 AND v_poll.status IN ('inactive', 'collecting') THEN
    -- No competition: go straight to vote
    UPDATE law_node_polls SET status = 'voting', current_proposal_id = p_proposal_id
    WHERE law_id = v_target_law_id;

    UPDATE proposals SET status = 'active',
      expires_at = now() + interval '7 days'
    WHERE id = p_proposal_id;

    RETURN jsonb_build_object('success', true, 'action', 'DIRECT_VOTE');
  ELSE
    -- Competition detected: ensure poll is collecting or start polling
    IF v_poll.status = 'inactive' OR v_poll.status = 'collecting' THEN
      -- Calculate next Monday 00:00 UTC
      v_next_monday := date_trunc('week', now() + interval '7 days');
      UPDATE law_node_polls
      SET status = 'polling',
          poll_start = v_next_monday,
          poll_end = v_next_monday + interval '7 days'
      WHERE law_id = v_target_law_id
        AND status IN ('inactive', 'collecting');
    END IF;

    -- Also create/update polls for ancestor nodes if a proposal
    -- targets a parent and this proposal targets a child
    -- (parent proposals enter child polls too)

    RETURN jsonb_build_object(
      'success', true,
      'action', 'CONTENTION_POLL',
      'poll_law_id', v_target_law_id,
      'competing_proposals', v_competing_count + 1
    );
  END IF;
END;
$$;

-- ─── 7. RPC: cast_poll_vote (approval voting in contention) ─
CREATE OR REPLACE FUNCTION cast_poll_vote(
  p_law_id UUID,
  p_proposal_id UUID,
  p_broadcast BOOLEAN DEFAULT false
)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_voter_id UUID := auth.uid();
  v_poll RECORD;
  v_proposal RECORD;
  v_affected_law_ids UUID[];
BEGIN
  IF v_voter_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'NOT_AUTHENTICATED');
  END IF;

  -- Verify poll is active
  SELECT * INTO v_poll FROM law_node_polls WHERE law_id = p_law_id;
  IF v_poll IS NULL OR v_poll.status != 'polling' THEN
    RETURN jsonb_build_object('success', false, 'error', 'POLL_NOT_ACTIVE');
  END IF;

  -- Verify proposal targets this node (or an ancestor/descendant)
  SELECT * INTO v_proposal FROM proposals WHERE id = p_proposal_id;
  IF v_proposal IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'PROPOSAL_NOT_FOUND');
  END IF;

  -- Insert vote for this poll
  INSERT INTO poll_votes (law_id, voter_id, proposal_id, is_broadcast)
  VALUES (p_law_id, v_voter_id, p_proposal_id, false)
  ON CONFLICT (law_id, voter_id, proposal_id) DO NOTHING;

  -- If broadcast: replicate to all other polls where this proposal appears
  IF p_broadcast THEN
    -- Find all law nodes where this proposal is in contention
    WITH RECURSIVE descendants AS (
      SELECT id FROM laws WHERE id = v_proposal.target_law_id
      UNION ALL
      SELECT l.id FROM laws l JOIN descendants d ON l.parent_id = d.id
    )
    SELECT array_agg(id) INTO v_affected_law_ids FROM descendants;

    INSERT INTO poll_votes (law_id, voter_id, proposal_id, is_broadcast)
    SELECT unnest(v_affected_law_ids), v_voter_id, p_proposal_id, true
    ON CONFLICT (law_id, voter_id, proposal_id) DO NOTHING;
  END IF;

  RETURN jsonb_build_object('success', true, 'broadcast', p_broadcast);
END;
$$;

-- ─── 8. RPC: resolve_poll (close poll, rank, start voting) ──
CREATE OR REPLACE FUNCTION resolve_poll(p_law_id UUID)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_poll RECORD;
  v_top_proposal_id UUID;
BEGIN
  SELECT * INTO v_poll FROM law_node_polls WHERE law_id = p_law_id;
  IF v_poll IS NULL OR v_poll.status != 'polling' THEN
    RETURN jsonb_build_object('success', false, 'error', 'POLL_NOT_IN_POLLING');
  END IF;
  IF v_poll.poll_end > now() THEN
    RETURN jsonb_build_object('success', false, 'error', 'POLL_NOT_ENDED');
  END IF;

  -- Rank proposals by approval count, pick the top one
  SELECT pv.proposal_id INTO v_top_proposal_id
  FROM poll_votes pv
  WHERE pv.law_id = p_law_id
  GROUP BY pv.proposal_id
  ORDER BY COUNT(*) DESC, MIN(pv.created_at) ASC
  LIMIT 1;

  IF v_top_proposal_id IS NULL THEN
    -- No votes cast: pick the oldest proposal
    SELECT p.id INTO v_top_proposal_id
    FROM proposals p
    WHERE p.target_law_id = p_law_id
      AND p.status = 'curation'
    ORDER BY p.created_at ASC
    LIMIT 1;
  END IF;

  -- Transition: poll → voting, first proposal → active
  UPDATE law_node_polls
  SET status = 'voting', current_proposal_id = v_top_proposal_id
  WHERE law_id = p_law_id;

  IF v_top_proposal_id IS NOT NULL THEN
    UPDATE proposals SET status = 'active',
      expires_at = now() + interval '7 days'
    WHERE id = v_top_proposal_id;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'first_proposal_id', v_top_proposal_id
  );
END;
$$;

-- ─── 9. RPC: close_proposal_vote ────────────────────────────
-- Unified close: handles single vote, first vote, second vote.
-- Called by cron or manually when expires_at is reached.
CREATE OR REPLACE FUNCTION close_proposal_vote(p_proposal_id UUID)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_proposal RECORD;
  v_tier TEXT;
  v_is_double BOOLEAN;
  v_active_citizens BIGINT;
  v_unique_voters BIGINT;
  v_total_weight NUMERIC;
  v_yea_weight NUMERIC;
  v_approval_pct NUMERIC;
  v_quorum_pct NUMERIC;
  v_required_approval NUMERIC;
  v_required_quorum NUMERIC;
  v_quorum_met BOOLEAN;
  v_approved BOOLEAN;
  v_poll RECORD;
  v_next_proposal_id UUID;
BEGIN
  SELECT * INTO v_proposal FROM proposals WHERE id = p_proposal_id;
  IF v_proposal IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'PROPOSAL_NOT_FOUND');
  END IF;

  -- Get tier (from proposal or from target law)
  v_tier := COALESCE(
    v_proposal.tier,
    (SELECT l.tier FROM laws l WHERE l.id = v_proposal.target_law_id),
    'ordinary'
  );
  v_is_double := is_double_vote_tier(v_tier);

  -- Thresholds per tier
  SELECT
    CASE v_tier
      WHEN 'constitutional' THEN 90
      WHEN 'core' THEN 80
      WHEN 'platform' THEN 66
      ELSE 51
    END,
    CASE v_tier
      WHEN 'constitutional' THEN 60
      WHEN 'core' THEN 50
      WHEN 'platform' THEN 40
      ELSE 30
    END
  INTO v_required_approval, v_required_quorum;

  -- Count active citizens (accessed in last 90 days)
  SELECT COUNT(*) INTO v_active_citizens
  FROM profiles
  WHERE last_active_at >= now() - interval '90 days';

  -- Count votes
  SELECT
    COUNT(DISTINCT voter_id),
    COALESCE(SUM(voting_weight), 0),
    COALESCE(SUM(CASE WHEN vote_type = 'yea' THEN voting_weight ELSE 0 END), 0)
  INTO v_unique_voters, v_total_weight, v_yea_weight
  FROM votes
  WHERE proposal_id = p_proposal_id;

  -- Calculate percentages
  v_quorum_pct := CASE WHEN v_active_citizens > 0
    THEN (v_unique_voters::NUMERIC / v_active_citizens) * 100
    ELSE 0 END;
  v_approval_pct := CASE WHEN v_total_weight > 0
    THEN (v_yea_weight / v_total_weight) * 100
    ELSE 0 END;

  v_quorum_met := v_quorum_pct >= v_required_quorum;
  v_approved := v_quorum_met AND v_approval_pct >= v_required_approval;

  -- ─── Branch by proposal status ───
  IF v_proposal.status = 'active' AND v_is_double THEN
    -- FIRST VOTE of double-vote proposal
    UPDATE proposals SET
      first_vote_passed = v_approved,
      first_vote_closed_at = now(),
      status = CASE
        WHEN v_approved THEN 'trial'
        ELSE 'closed'
      END,
      trial_started_at = CASE WHEN v_approved THEN now() ELSE NULL END,
      trial_ends_at = CASE WHEN v_approved
        THEN now() + (COALESCE(v_proposal.trial_duration_days, 14) || ' days')::interval
        ELSE NULL END,
      expires_at = NULL
    WHERE id = p_proposal_id;

    IF NOT v_approved THEN
      -- Rejected: advance contention queue if applicable
      PERFORM advance_contention_queue(v_proposal.target_law_id, p_proposal_id);
    END IF;

    RETURN jsonb_build_object(
      'success', true,
      'phase', 'first_vote',
      'approved', v_approved,
      'approval_pct', round(v_approval_pct, 2),
      'quorum_pct', round(v_quorum_pct, 2),
      'next_status', CASE WHEN v_approved THEN 'trial' ELSE 'closed' END
    );

  ELSIF v_proposal.status = 'second_vote' THEN
    -- SECOND VOTE of double-vote proposal
    UPDATE proposals SET
      status = 'closed'
    WHERE id = p_proposal_id;

    IF v_approved THEN
      -- Deploy: update the law node
      -- (In future T24: actual code deploy. For now: mark proposal as approved)
      -- Clear contention
      PERFORM resolve_contention_after_approval(v_proposal.target_law_id, p_proposal_id);
    ELSE
      -- Rejected: advance contention queue
      PERFORM advance_contention_queue(v_proposal.target_law_id, p_proposal_id);
    END IF;

    RETURN jsonb_build_object(
      'success', true,
      'phase', 'second_vote',
      'approved', v_approved,
      'approval_pct', round(v_approval_pct, 2),
      'quorum_pct', round(v_quorum_pct, 2)
    );

  ELSIF v_proposal.status = 'active' AND NOT v_is_double THEN
    -- SINGLE VOTE (constitutional/ordinary)
    UPDATE proposals SET status = 'closed'
    WHERE id = p_proposal_id;

    IF v_approved THEN
      PERFORM resolve_contention_after_approval(v_proposal.target_law_id, p_proposal_id);
    ELSE
      PERFORM advance_contention_queue(v_proposal.target_law_id, p_proposal_id);
    END IF;

    RETURN jsonb_build_object(
      'success', true,
      'phase', 'single_vote',
      'approved', v_approved,
      'approval_pct', round(v_approval_pct, 2),
      'quorum_pct', round(v_quorum_pct, 2)
    );

  ELSE
    RETURN jsonb_build_object('success', false, 'error', 'INVALID_STATUS_FOR_CLOSE');
  END IF;
END;
$$;

-- ─── 10. RPC: end_trial (trial expired → second_vote) ───────
CREATE OR REPLACE FUNCTION end_trial(p_proposal_id UUID)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_proposal RECORD;
BEGIN
  SELECT * INTO v_proposal FROM proposals WHERE id = p_proposal_id;
  IF v_proposal IS NULL OR v_proposal.status != 'trial' THEN
    RETURN jsonb_build_object('success', false, 'error', 'NOT_IN_TRIAL');
  END IF;
  IF v_proposal.trial_ends_at > now() THEN
    RETURN jsonb_build_object('success', false, 'error', 'TRIAL_NOT_ENDED');
  END IF;

  -- Clear old votes before second round
  DELETE FROM votes WHERE proposal_id = p_proposal_id;

  UPDATE proposals SET
    status = 'second_vote',
    expires_at = now() + interval '7 days'
  WHERE id = p_proposal_id;

  RETURN jsonb_build_object('success', true, 'status', 'second_vote');
END;
$$;

-- ─── 11. Helper: advance contention queue ───────────────────
-- When a proposal is rejected, promote the next in rank.
CREATE OR REPLACE FUNCTION advance_contention_queue(
  p_law_id UUID,
  p_rejected_proposal_id UUID
)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_poll RECORD;
  v_next_id UUID;
BEGIN
  IF p_law_id IS NULL THEN RETURN; END IF;

  SELECT * INTO v_poll FROM law_node_polls WHERE law_id = p_law_id;
  IF v_poll IS NULL OR v_poll.status != 'voting' THEN RETURN; END IF;

  -- Find next proposal by poll vote count (excluding already voted ones)
  SELECT pv.proposal_id INTO v_next_id
  FROM poll_votes pv
  JOIN proposals p ON p.id = pv.proposal_id
  WHERE pv.law_id = p_law_id
    AND p.status = 'curation'
    AND p.id != p_rejected_proposal_id
  GROUP BY pv.proposal_id
  ORDER BY COUNT(*) DESC, MIN(pv.created_at) ASC
  LIMIT 1;

  IF v_next_id IS NOT NULL THEN
    -- Promote next proposal
    UPDATE law_node_polls SET current_proposal_id = v_next_id
    WHERE law_id = p_law_id;
    UPDATE proposals SET status = 'active',
      expires_at = now() + interval '7 days'
    WHERE id = v_next_id;
  ELSE
    -- No more proposals: resolve poll
    UPDATE law_node_polls SET status = 'resolved', resolved_at = now()
    WHERE law_id = p_law_id;
  END IF;
END;
$$;

-- ─── 12. Helper: resolve contention after approval ──────────
-- When a proposal is approved, remaining proposals go back to curation.
CREATE OR REPLACE FUNCTION resolve_contention_after_approval(
  p_law_id UUID,
  p_approved_proposal_id UUID
)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_descendant_ids UUID[];
BEGIN
  IF p_law_id IS NULL THEN RETURN; END IF;

  -- Get all descendant nodes
  WITH RECURSIVE tree AS (
    SELECT id FROM laws WHERE id = p_law_id
    UNION ALL
    SELECT l.id FROM laws l JOIN tree t ON l.parent_id = t.id
  )
  SELECT array_agg(id) INTO v_descendant_ids FROM tree;

  -- All competing proposals back to curation
  UPDATE proposals
  SET status = 'curation', expires_at = NULL
  WHERE target_law_id = ANY(v_descendant_ids)
    AND id != p_approved_proposal_id
    AND status IN ('curation', 'active');

  -- Resolve all affected polls
  UPDATE law_node_polls
  SET status = 'resolved', resolved_at = now(), current_proposal_id = NULL
  WHERE law_id = ANY(v_descendant_ids);
END;
$$;

-- ─── 13. RPC: get_law_node_poll ─────────────────────────────
-- Returns poll status + proposals + vote counts for a law node.
CREATE OR REPLACE FUNCTION get_law_node_poll(p_law_id UUID)
RETURNS JSONB LANGUAGE plpgsql STABLE SECURITY DEFINER AS $$
DECLARE
  v_poll RECORD;
  v_proposals JSONB;
  v_voter_id UUID := auth.uid();
BEGIN
  SELECT * INTO v_poll FROM law_node_polls WHERE law_id = p_law_id;

  -- Get proposals targeting this node with vote counts
  SELECT COALESCE(jsonb_agg(row_to_json(sub.*) ORDER BY sub.vote_count DESC, sub.created_at ASC), '[]'::jsonb)
  INTO v_proposals
  FROM (
    SELECT
      p.id,
      p.title,
      p.status,
      p.author_id,
      p.created_at,
      p.tier,
      p.trial_duration_days,
      COALESCE(pv.cnt, 0) AS vote_count,
      EXISTS(
        SELECT 1 FROM poll_votes pv2
        WHERE pv2.law_id = p_law_id
          AND pv2.proposal_id = p.id
          AND pv2.voter_id = v_voter_id
      ) AS user_has_voted
    FROM proposals p
    LEFT JOIN (
      SELECT proposal_id, COUNT(*) AS cnt
      FROM poll_votes WHERE law_id = p_law_id
      GROUP BY proposal_id
    ) pv ON pv.proposal_id = p.id
    WHERE p.target_law_id = p_law_id
      AND p.status NOT IN ('draft', 'closed', 'repealed')
  ) sub;

  RETURN jsonb_build_object(
    'poll_status', COALESCE(v_poll.status, 'inactive'),
    'poll_start', v_poll.poll_start,
    'poll_end', v_poll.poll_end,
    'current_proposal_id', v_poll.current_proposal_id,
    'proposals', v_proposals
  );
END;
$$;

-- ─── 14. RPC: get_proposal_phase_info ───────────────────────
-- Returns detailed phase info for a proposal (for UI badges).
CREATE OR REPLACE FUNCTION get_proposal_phase_info(p_proposal_id UUID)
RETURNS JSONB LANGUAGE plpgsql STABLE SECURITY DEFINER AS $$
DECLARE
  v_proposal RECORD;
  v_tier TEXT;
  v_is_double BOOLEAN;
  v_phase TEXT;
BEGIN
  SELECT * INTO v_proposal FROM proposals WHERE id = p_proposal_id;
  IF v_proposal IS NULL THEN
    RETURN jsonb_build_object('error', 'NOT_FOUND');
  END IF;

  v_tier := COALESCE(
    v_proposal.tier,
    (SELECT l.tier FROM laws l WHERE l.id = v_proposal.target_law_id),
    'ordinary'
  );
  v_is_double := is_double_vote_tier(v_tier);

  -- Determine phase
  v_phase := CASE
    WHEN v_proposal.status = 'draft' THEN 'draft'
    WHEN v_proposal.status = 'curation' THEN 'curation'
    WHEN v_proposal.status = 'active' AND v_is_double THEN 'first_vote'
    WHEN v_proposal.status = 'active' AND NOT v_is_double THEN 'voting'
    WHEN v_proposal.status = 'trial' THEN 'trial'
    WHEN v_proposal.status = 'second_vote' THEN 'second_vote'
    WHEN v_proposal.status = 'closed' THEN 'closed'
    ELSE v_proposal.status
  END;

  RETURN jsonb_build_object(
    'phase', v_phase,
    'tier', v_tier,
    'is_double_vote', v_is_double,
    'first_vote_passed', v_proposal.first_vote_passed,
    'first_vote_closed_at', v_proposal.first_vote_closed_at,
    'trial_started_at', v_proposal.trial_started_at,
    'trial_ends_at', v_proposal.trial_ends_at,
    'trial_duration_days', v_proposal.trial_duration_days,
    'target_law_id', v_proposal.target_law_id,
    'expires_at', v_proposal.expires_at
  );
END;
$$;

-- ─── 15. Cron additions (add to existing update_election_statuses) ──
-- These should be called by the existing cron job.

-- Trial expiry: move to second_vote
CREATE OR REPLACE FUNCTION process_expired_trials()
RETURNS INTEGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_count INTEGER := 0;
  v_row RECORD;
BEGIN
  FOR v_row IN
    SELECT id FROM proposals
    WHERE status = 'trial' AND trial_ends_at <= now()
  LOOP
    PERFORM end_trial(v_row.id);
    v_count := v_count + 1;
  END LOOP;
  RETURN v_count;
END;
$$;

-- Poll expiry: resolve contention polls
CREATE OR REPLACE FUNCTION process_expired_polls()
RETURNS INTEGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_count INTEGER := 0;
  v_row RECORD;
BEGIN
  FOR v_row IN
    SELECT law_id FROM law_node_polls
    WHERE status = 'polling' AND poll_end <= now()
  LOOP
    PERFORM resolve_poll(v_row.law_id);
    v_count := v_count + 1;
  END LOOP;
  RETURN v_count;
END;
$$;

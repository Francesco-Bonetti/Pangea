-- ============================================
-- T13 — Group Positions & Position Elections
-- ============================================
-- Scope: moderator elections (threshold 10 members).
-- Legislator (50) and Judiciary (200) defined but NOT functional yet.
-- Flow: group reaches threshold → banner → admin creates position election →
--        election closes → finalize_position_election() assigns role to winner.
-- ============================================

-- ── 1. group_positions — defines available positions per group ──
CREATE TABLE IF NOT EXISTS group_positions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  position_key TEXT NOT NULL,          -- 'moderator', 'legislator', 'judge'
  display_name TEXT NOT NULL,          -- 'Moderator', 'Legislator', 'Judge'
  description TEXT,
  role_to_assign TEXT NOT NULL,        -- maps to group_members.role value
  required_members INTEGER NOT NULL DEFAULT 1,  -- no arbitrary threshold
  max_holders INTEGER NOT NULL DEFAULT 1,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(group_id, position_key)
);

-- ── 2. position_holders — who holds which position ──
CREATE TABLE IF NOT EXISTS position_holders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  position_id UUID NOT NULL REFERENCES group_positions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  election_id UUID REFERENCES elections(id) ON DELETE SET NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at TIMESTAMPTZ,  -- NULL = currently active
  UNIQUE(position_id, user_id, ended_at)  -- one active holder per position per user
);

-- ── 3. position_id on elections ──
ALTER TABLE elections ADD COLUMN IF NOT EXISTS position_id UUID REFERENCES group_positions(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_elections_position_id ON elections(position_id) WHERE position_id IS NOT NULL;

-- ── 4. RLS ──
ALTER TABLE group_positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE position_holders ENABLE ROW LEVEL SECURITY;

-- Public read
CREATE POLICY "group_positions_select" ON group_positions FOR SELECT USING (true);
CREATE POLICY "position_holders_select" ON position_holders FOR SELECT USING (true);

-- Only admins/founders can insert/update positions (enforced via RPCs)
CREATE POLICY "group_positions_insert" ON group_positions FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM group_members
      WHERE group_id = group_positions.group_id
        AND user_id = auth.uid()
        AND role IN ('founder', 'co_founder', 'president', 'admin')
    )
  );

CREATE POLICY "group_positions_update" ON group_positions FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM group_members
      WHERE group_id = group_positions.group_id
        AND user_id = auth.uid()
        AND role IN ('founder', 'co_founder', 'president', 'admin')
    )
  );

-- position_holders managed only via RPCs (SECURITY DEFINER)
CREATE POLICY "position_holders_insert" ON position_holders FOR INSERT
  WITH CHECK (false);  -- only via RPC

-- ── 5. get_group_positions — returns positions with holder info and threshold status ──
CREATE OR REPLACE FUNCTION get_group_positions(p_group_id UUID)
RETURNS TABLE (
  id UUID,
  position_key TEXT,
  display_name TEXT,
  description TEXT,
  role_to_assign TEXT,
  required_members INTEGER,
  max_holders INTEGER,
  is_active BOOLEAN,
  current_member_count BIGINT,
  threshold_met BOOLEAN,
  current_holders JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH member_count AS (
    SELECT COUNT(*) AS cnt
    FROM group_members
    WHERE group_id = p_group_id
  ),
  holders AS (
    SELECT
      ph.position_id,
      jsonb_agg(
        jsonb_build_object(
          'user_id', ph.user_id,
          'full_name', COALESCE(pr.full_name, 'Anonymous'),
          'avatar_url', pr.avatar_url,
          'started_at', ph.started_at,
          'election_id', ph.election_id
        )
      ) AS holder_list
    FROM position_holders ph
    JOIN profiles pr ON pr.id = ph.user_id
    WHERE ph.ended_at IS NULL
    GROUP BY ph.position_id
  )
  SELECT
    gp.id,
    gp.position_key,
    gp.display_name,
    gp.description,
    gp.role_to_assign,
    gp.required_members,
    gp.max_holders,
    gp.is_active,
    mc.cnt AS current_member_count,
    (mc.cnt >= gp.required_members) AS threshold_met,
    COALESCE(h.holder_list, '[]'::jsonb) AS current_holders
  FROM group_positions gp
  CROSS JOIN member_count mc
  LEFT JOIN holders h ON h.position_id = gp.id
  WHERE gp.group_id = p_group_id
    AND gp.is_active = true
  ORDER BY gp.required_members ASC;
END;
$$;

-- ── 6. finalize_position_election — assigns role to winner after election closes ──
CREATE OR REPLACE FUNCTION finalize_position_election(p_election_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_election RECORD;
  v_position RECORD;
  v_winner RECORD;
  v_result JSONB;
BEGIN
  -- Get election with position info
  SELECT e.*, gp.role_to_assign, gp.max_holders, gp.position_key
  INTO v_election
  FROM elections e
  JOIN group_positions gp ON gp.id = e.position_id
  WHERE e.id = p_election_id
    AND e.position_id IS NOT NULL;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Election not found or not a position election');
  END IF;

  IF v_election.status != 'closed' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Election is not closed yet');
  END IF;

  -- Get winner(s) by vote count
  FOR v_winner IN
    SELECT
      c.user_id,
      COALESCE(SUM(ev.voting_weight), 0) AS total_votes,
      ROW_NUMBER() OVER (ORDER BY COALESCE(SUM(ev.voting_weight), 0) DESC) AS rank
    FROM candidates c
    LEFT JOIN election_votes ev ON ev.candidate_id = c.id
    WHERE c.election_id = p_election_id
      AND c.status IN ('registered', 'approved')
    GROUP BY c.user_id
    ORDER BY total_votes DESC
    LIMIT v_election.max_holders
  LOOP
    -- Skip candidates with 0 votes
    IF v_winner.total_votes <= 0 THEN
      CONTINUE;
    END IF;

    -- End previous holder(s) for this position
    UPDATE position_holders
    SET ended_at = now()
    WHERE position_id = v_election.position_id
      AND ended_at IS NULL;

    -- Insert new holder
    INSERT INTO position_holders (position_id, user_id, election_id)
    VALUES (v_election.position_id, v_winner.user_id, p_election_id)
    ON CONFLICT DO NOTHING;

    -- Update group_members role
    UPDATE group_members
    SET role = v_election.role_to_assign
    WHERE group_id = v_election.group_id
      AND user_id = v_winner.user_id
      AND role NOT IN ('founder', 'co_founder');  -- never demote founders
  END LOOP;

  RETURN jsonb_build_object('success', true, 'election_id', p_election_id);
END;
$$;

-- ── 7. create_position_election — creates an election linked to a position ──
CREATE OR REPLACE FUNCTION create_position_election(
  p_group_id UUID,
  p_position_id UUID,
  p_candidature_days INTEGER DEFAULT 3,
  p_voting_days INTEGER DEFAULT 5
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_position RECORD;
  v_member_count BIGINT;
  v_caller_role TEXT;
  v_election_id UUID;
  v_cand_start TIMESTAMPTZ := now();
  v_cand_end TIMESTAMPTZ := now() + (p_candidature_days || ' days')::interval;
  v_vote_start TIMESTAMPTZ := now() + (p_candidature_days || ' days')::interval;
  v_vote_end TIMESTAMPTZ := now() + ((p_candidature_days + p_voting_days) || ' days')::interval;
BEGIN
  -- Verify caller has manage_elections permission
  SELECT role INTO v_caller_role
  FROM group_members
  WHERE group_id = p_group_id AND user_id = auth.uid();

  IF v_caller_role IS NULL OR v_caller_role NOT IN (
    'founder', 'co_founder', 'president', 'vice_president', 'admin'
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Permission denied');
  END IF;

  -- Get position
  SELECT * INTO v_position
  FROM group_positions
  WHERE id = p_position_id AND group_id = p_group_id AND is_active = true;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Position not found');
  END IF;

  -- Check threshold
  SELECT COUNT(*) INTO v_member_count
  FROM group_members WHERE group_id = p_group_id;

  IF v_member_count < v_position.required_members THEN
    RETURN jsonb_build_object('success', false, 'error',
      format('Need %s members (currently %s)', v_position.required_members, v_member_count));
  END IF;

  -- Check no active election for this position
  IF EXISTS (
    SELECT 1 FROM elections
    WHERE position_id = p_position_id
      AND status IN ('upcoming', 'candidature', 'voting')
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'An election for this position is already in progress');
  END IF;

  -- Create election
  INSERT INTO elections (
    title, description, election_type, group_id, position_id, position_name,
    max_winners, candidature_start, candidature_end, voting_start, voting_end,
    created_by, status
  )
  VALUES (
    v_position.display_name || ' Election',
    'Elect a ' || v_position.display_name || ' for this group. The winner will receive the ' || v_position.role_to_assign || ' role.',
    'position',
    p_group_id,
    p_position_id,
    v_position.display_name,
    v_position.max_holders,
    v_cand_start,
    v_cand_end,
    v_vote_start,
    v_vote_end,
    auth.uid(),
    'candidature'
  )
  RETURNING id INTO v_election_id;

  RETURN jsonb_build_object('success', true, 'election_id', v_election_id);
END;
$$;

-- ── 8. Seed moderator position for ALL existing groups ──
-- No arbitrary threshold — any group can elect a moderator.
-- Future positions (legislator, judge) will be added when T23 Code-as-Law
-- gives them real functions backed by mathematical formulas.
INSERT INTO group_positions (group_id, position_key, display_name, description, role_to_assign, required_members, max_holders)
SELECT
  g.id,
  'moderator',
  'Moderator',
  'Moderates content, manages discussions, and enforces community guidelines. Elected by group members.',
  'moderator',
  1,
  1
FROM groups g
WHERE g.is_active = true
ON CONFLICT (group_id, position_key) DO NOTHING;

-- ── 9. Auto-seed positions when new groups are created ──
CREATE OR REPLACE FUNCTION trg_seed_group_positions()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO group_positions (group_id, position_key, display_name, description, role_to_assign, required_members, max_holders)
  VALUES (
    NEW.id,
    'moderator',
    'Moderator',
    'Moderates content, manages discussions, and enforces community guidelines. Elected by group members.',
    'moderator',
    1,
    1
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_group_seed_positions ON groups;
CREATE TRIGGER trg_group_seed_positions
  AFTER INSERT ON groups
  FOR EACH ROW
  EXECUTE FUNCTION trg_seed_group_positions();

-- ── 10. Update cron to auto-finalize position elections on close ──
CREATE OR REPLACE FUNCTION update_election_statuses()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_closed_election RECORD;
BEGIN
  UPDATE elections SET status = 'candidature'
  WHERE status = 'upcoming' AND candidature_start <= now();

  UPDATE elections SET status = 'voting'
  WHERE status = 'candidature' AND voting_start <= now();

  FOR v_closed_election IN
    UPDATE elections SET status = 'closed'
    WHERE status = 'voting' AND voting_end <= now()
    RETURNING id, position_id
  LOOP
    PERFORM close_election_with_results(v_closed_election.id);
    IF v_closed_election.position_id IS NOT NULL THEN
      PERFORM finalize_position_election(v_closed_election.id);
    END IF;
  END LOOP;
END;
$$;

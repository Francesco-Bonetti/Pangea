-- ============================================
-- ELECTIONS & CANDIDATURES SYSTEM
-- Agora Pangea — Phase 4
-- ============================================

-- Election status enum
DO $$ BEGIN
  CREATE TYPE election_status AS ENUM ('upcoming', 'candidature', 'voting', 'closed', 'cancelled');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Candidate status enum
DO $$ BEGIN
  CREATE TYPE candidate_status AS ENUM ('registered', 'approved', 'withdrawn', 'disqualified');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Election type enum
DO $$ BEGIN
  CREATE TYPE election_type AS ENUM ('general', 'jurisdiction', 'party', 'position');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================
-- ELECTIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS elections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  election_type election_type NOT NULL DEFAULT 'general',

  -- Scope: which jurisdiction or party this election belongs to (NULL = global/Pangea-wide)
  jurisdiction_id UUID REFERENCES jurisdictions(id) ON DELETE SET NULL,
  party_id UUID REFERENCES parties(id) ON DELETE SET NULL,

  -- Position being elected (e.g., "Governor", "Council Member", "Party Leader")
  position_name TEXT NOT NULL,
  max_winners INTEGER NOT NULL DEFAULT 1,

  -- Lifecycle dates
  status election_status NOT NULL DEFAULT 'upcoming',
  candidature_start TIMESTAMPTZ NOT NULL,
  candidature_end TIMESTAMPTZ NOT NULL,
  voting_start TIMESTAMPTZ NOT NULL,
  voting_end TIMESTAMPTZ NOT NULL,

  -- Who created this election
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),

  -- Results (populated after close)
  results_summary JSONB,

  -- Constraints
  CONSTRAINT valid_dates CHECK (
    candidature_start < candidature_end
    AND candidature_end <= voting_start
    AND voting_start < voting_end
  ),
  CONSTRAINT valid_max_winners CHECK (max_winners >= 1)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_elections_status ON elections(status);
CREATE INDEX IF NOT EXISTS idx_elections_jurisdiction ON elections(jurisdiction_id);
CREATE INDEX IF NOT EXISTS idx_elections_party ON elections(party_id);
CREATE INDEX IF NOT EXISTS idx_elections_voting_end ON elections(voting_end);

-- ============================================
-- CANDIDATES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS candidates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  election_id UUID NOT NULL REFERENCES elections(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),

  -- Optional party affiliation for this candidacy
  party_id UUID REFERENCES parties(id) ON DELETE SET NULL,

  -- Candidate info
  platform TEXT, -- Campaign manifesto / platform statement
  status candidate_status NOT NULL DEFAULT 'registered',

  created_at TIMESTAMPTZ DEFAULT now(),
  withdrawn_at TIMESTAMPTZ,

  -- One candidacy per user per election
  CONSTRAINT unique_candidate_per_election UNIQUE (election_id, user_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_candidates_election ON candidates(election_id);
CREATE INDEX IF NOT EXISTS idx_candidates_user ON candidates(user_id);
CREATE INDEX IF NOT EXISTS idx_candidates_status ON candidates(status);

-- ============================================
-- ELECTION VOTES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS election_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  election_id UUID NOT NULL REFERENCES elections(id) ON DELETE CASCADE,
  voter_id UUID NOT NULL REFERENCES auth.users(id),
  candidate_id UUID NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,

  -- Voting weight (from delegations)
  voting_weight NUMERIC NOT NULL DEFAULT 1,

  created_at TIMESTAMPTZ DEFAULT now(),

  -- One vote per voter per election
  CONSTRAINT unique_vote_per_election UNIQUE (election_id, voter_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_election_votes_election ON election_votes(election_id);
CREATE INDEX IF NOT EXISTS idx_election_votes_candidate ON election_votes(candidate_id);
-- No index on voter_id to enhance privacy

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

-- ELECTIONS: Everyone can read, only admins/moderators can create
ALTER TABLE elections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view elections"
  ON elections FOR SELECT
  USING (true);

CREATE POLICY "Admins can create elections"
  ON elections FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'moderator')
    )
  );

CREATE POLICY "Admins can update elections"
  ON elections FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'moderator')
    )
  );

-- CANDIDATES: Public read, authenticated users can register themselves
ALTER TABLE candidates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view candidates"
  ON candidates FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can register as candidate"
  ON candidates FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Candidates can update own candidacy"
  ON candidates FOR UPDATE
  USING (auth.uid() = user_id);

-- ELECTION_VOTES: NO SELECT (privacy) — results via RPC only
ALTER TABLE election_votes ENABLE ROW LEVEL SECURITY;

-- No SELECT policy — votes are private, just like proposal votes
-- Results are accessed through SECURITY DEFINER RPC functions

CREATE POLICY "Authenticated users can cast vote"
  ON election_votes FOR INSERT
  WITH CHECK (auth.uid() = voter_id);

CREATE POLICY "Users can delete own vote"
  ON election_votes FOR DELETE
  USING (auth.uid() = voter_id);

-- ============================================
-- RPC FUNCTIONS (SECURITY DEFINER)
-- ============================================

-- 1. Get election results (aggregated, no individual votes exposed)
CREATE OR REPLACE FUNCTION get_election_results(p_election_id UUID)
RETURNS TABLE (
  candidate_id UUID,
  candidate_user_id UUID,
  candidate_name TEXT,
  candidate_party_id UUID,
  candidate_party_name TEXT,
  candidate_platform TEXT,
  total_weighted_votes NUMERIC,
  vote_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.id AS candidate_id,
    c.user_id AS candidate_user_id,
    COALESCE(p.full_name, 'Anonymous') AS candidate_name,
    c.party_id AS candidate_party_id,
    par.name AS candidate_party_name,
    c.platform AS candidate_platform,
    COALESCE(SUM(ev.voting_weight), 0) AS total_weighted_votes,
    COUNT(ev.id) AS vote_count
  FROM candidates c
  LEFT JOIN profiles p ON p.id = c.user_id
  LEFT JOIN parties par ON par.id = c.party_id
  LEFT JOIN election_votes ev ON ev.candidate_id = c.id
  WHERE c.election_id = p_election_id
    AND c.status IN ('registered', 'approved')
  GROUP BY c.id, c.user_id, p.full_name, c.party_id, par.name, c.platform
  ORDER BY total_weighted_votes DESC;
END;
$$;

-- 2. Check if current user has voted in an election
CREATE OR REPLACE FUNCTION has_voted_in_election(p_election_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM election_votes
    WHERE election_id = p_election_id
    AND voter_id = auth.uid()
  );
END;
$$;

-- 3. Get user's vote in an election (only their own — for UI display)
CREATE OR REPLACE FUNCTION get_my_election_vote(p_election_id UUID)
RETURNS UUID -- returns candidate_id
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_candidate_id UUID;
BEGIN
  SELECT candidate_id INTO v_candidate_id
  FROM election_votes
  WHERE election_id = p_election_id
  AND voter_id = auth.uid();

  RETURN v_candidate_id;
END;
$$;

-- 4. Get total voters count for an election
CREATE OR REPLACE FUNCTION get_election_voter_count(p_election_id UUID)
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count BIGINT;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM election_votes
  WHERE election_id = p_election_id;

  RETURN v_count;
END;
$$;

-- 5. Auto-transition election statuses (called by cron)
CREATE OR REPLACE FUNCTION update_election_statuses()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Upcoming → Candidature (when candidature_start is reached)
  UPDATE elections
  SET status = 'candidature'
  WHERE status = 'upcoming'
  AND candidature_start <= now();

  -- Candidature → Voting (when voting_start is reached)
  UPDATE elections
  SET status = 'voting'
  WHERE status = 'candidature'
  AND voting_start <= now();

  -- Voting → Closed (when voting_end is reached)
  UPDATE elections
  SET status = 'closed'
  WHERE status = 'voting'
  AND voting_end <= now();
END;
$$;

-- 6. Close election and compute results summary
CREATE OR REPLACE FUNCTION close_election_with_results(p_election_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_results JSONB;
  v_max_winners INTEGER;
BEGIN
  -- Get max_winners
  SELECT max_winners INTO v_max_winners
  FROM elections WHERE id = p_election_id;

  -- Build results JSON
  SELECT jsonb_agg(row_to_json(r))
  INTO v_results
  FROM (
    SELECT
      c.id AS candidate_id,
      c.user_id,
      COALESCE(p.full_name, 'Anonymous') AS name,
      COALESCE(SUM(ev.voting_weight), 0) AS weighted_votes,
      COUNT(ev.id) AS raw_votes,
      ROW_NUMBER() OVER (ORDER BY COALESCE(SUM(ev.voting_weight), 0) DESC) AS rank
    FROM candidates c
    LEFT JOIN profiles p ON p.id = c.user_id
    LEFT JOIN election_votes ev ON ev.candidate_id = c.id
    WHERE c.election_id = p_election_id
      AND c.status IN ('registered', 'approved')
    GROUP BY c.id, c.user_id, p.full_name
    ORDER BY weighted_votes DESC
  ) r;

  -- Update election with results
  UPDATE elections
  SET status = 'closed',
      results_summary = v_results
  WHERE id = p_election_id;
END;
$$;

-- ============================================
-- FEED EVENT TRIGGERS
-- ============================================

-- Trigger: new election created → feed event
CREATE OR REPLACE FUNCTION trg_election_feed_event()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO feed_events (actor_id, actor_jurisdiction_id, event_type, title, description, link, metadata)
  VALUES (
    NEW.created_by,
    NEW.jurisdiction_id,
    'election_created',
    'New Election: ' || NEW.title,
    'Position: ' || NEW.position_name || '. Candidature opens ' || to_char(NEW.candidature_start, 'Mon DD, YYYY'),
    '/elections/' || NEW.id,
    jsonb_build_object('election_id', NEW.id, 'election_type', NEW.election_type, 'position', NEW.position_name)
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_new_election_feed ON elections;
CREATE TRIGGER trg_new_election_feed
  AFTER INSERT ON elections
  FOR EACH ROW
  EXECUTE FUNCTION trg_election_feed_event();

-- Trigger: candidate registered → feed event
CREATE OR REPLACE FUNCTION trg_candidate_feed_event()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_election_title TEXT;
  v_position TEXT;
BEGIN
  SELECT title, position_name INTO v_election_title, v_position
  FROM elections WHERE id = NEW.election_id;

  INSERT INTO feed_events (actor_id, event_type, title, description, link, metadata)
  VALUES (
    NEW.user_id,
    'candidate_registered',
    'New Candidate for ' || v_position,
    'A new candidate has registered for: ' || v_election_title,
    '/elections/' || NEW.election_id,
    jsonb_build_object('election_id', NEW.election_id, 'candidate_id', NEW.id)
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_new_candidate_feed ON candidates;
CREATE TRIGGER trg_new_candidate_feed
  AFTER INSERT ON candidates
  FOR EACH ROW
  EXECUTE FUNCTION trg_candidate_feed_event();

-- ============================================
-- UPDATE CRON FUNCTION to include election status transitions
-- ============================================
-- The existing /api/cron/evaluate route will be updated to also call update_election_statuses()

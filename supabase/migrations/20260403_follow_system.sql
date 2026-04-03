-- ============================================
-- FOLLOW SYSTEM + FEED
-- Allows citizens to follow citizens, parties, and jurisdictions
-- ============================================

-- Follow target types
CREATE TYPE follow_target_type AS ENUM ('citizen', 'party', 'jurisdiction');

-- Main follows table
CREATE TABLE IF NOT EXISTS follows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  target_type follow_target_type NOT NULL,
  target_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(follower_id, target_type, target_id)
);

-- Feed events table — stores activity from followed entities
CREATE TABLE IF NOT EXISTS feed_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  actor_party_id UUID REFERENCES parties(id) ON DELETE SET NULL,
  actor_jurisdiction_id UUID REFERENCES jurisdictions(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL, -- 'proposal_created', 'vote_cast', 'law_approved', 'discussion_created', 'party_vote', 'member_joined'
  title TEXT NOT NULL,
  description TEXT,
  link TEXT, -- relative URL to the entity
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_follows_follower ON follows(follower_id);
CREATE INDEX idx_follows_target ON follows(target_type, target_id);
CREATE INDEX idx_feed_events_actor ON feed_events(actor_id);
CREATE INDEX idx_feed_events_party ON feed_events(actor_party_id);
CREATE INDEX idx_feed_events_jurisdiction ON feed_events(actor_jurisdiction_id);
CREATE INDEX idx_feed_events_created ON feed_events(created_at DESC);

-- RLS
ALTER TABLE follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE feed_events ENABLE ROW LEVEL SECURITY;

-- Follows: users can manage their own follows, everyone can read
CREATE POLICY "Users can read all follows"
  ON follows FOR SELECT
  USING (true);

CREATE POLICY "Users can insert own follows"
  ON follows FOR INSERT
  WITH CHECK (auth.uid() = follower_id);

CREATE POLICY "Users can delete own follows"
  ON follows FOR DELETE
  USING (auth.uid() = follower_id);

-- Feed events: readable by all authenticated users, writable via trigger/API
CREATE POLICY "Authenticated users can read feed events"
  ON feed_events FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert feed events"
  ON feed_events FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- Helper RPC: get follower/following counts for any entity
CREATE OR REPLACE FUNCTION get_follow_counts(p_target_type follow_target_type, p_target_id UUID)
RETURNS TABLE(follower_count BIGINT) AS $$
BEGIN
  RETURN QUERY
  SELECT COUNT(*)::BIGINT AS follower_count
  FROM follows
  WHERE target_type = p_target_type AND target_id = p_target_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper RPC: check if current user follows an entity
CREATE OR REPLACE FUNCTION is_following(p_target_type follow_target_type, p_target_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS(
    SELECT 1 FROM follows
    WHERE follower_id = auth.uid()
    AND target_type = p_target_type
    AND target_id = p_target_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper RPC: get personalized feed for current user
CREATE OR REPLACE FUNCTION get_personalized_feed(p_limit INT DEFAULT 50, p_offset INT DEFAULT 0)
RETURNS SETOF feed_events AS $$
BEGIN
  RETURN QUERY
  SELECT fe.*
  FROM feed_events fe
  WHERE
    -- Events from followed citizens
    (fe.actor_id IN (
      SELECT target_id FROM follows
      WHERE follower_id = auth.uid() AND target_type = 'citizen'
    ))
    OR
    -- Events from followed parties
    (fe.actor_party_id IN (
      SELECT target_id FROM follows
      WHERE follower_id = auth.uid() AND target_type = 'party'
    ))
    OR
    -- Events from followed jurisdictions
    (fe.actor_jurisdiction_id IN (
      SELECT target_id FROM follows
      WHERE follower_id = auth.uid() AND target_type = 'jurisdiction'
    ))
    OR
    -- Own events
    (fe.actor_id = auth.uid())
  ORDER BY fe.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger: auto-create feed event when a proposal is created
CREATE OR REPLACE FUNCTION create_proposal_feed_event()
RETURNS TRIGGER AS $$
DECLARE
  v_author_name TEXT;
BEGIN
  IF NEW.status IN ('curation', 'active') THEN
    SELECT COALESCE(full_name, 'A citizen') INTO v_author_name
    FROM profiles WHERE id = NEW.author_id;

    INSERT INTO feed_events (actor_id, event_type, title, description, link)
    VALUES (
      NEW.author_id,
      'proposal_created',
      v_author_name || ' submitted a new proposal',
      LEFT(NEW.title, 200),
      '/proposals/' || NEW.id
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_proposal_feed_event
  AFTER INSERT ON proposals
  FOR EACH ROW
  EXECUTE FUNCTION create_proposal_feed_event();

-- Trigger: auto-create feed event when a discussion is created
CREATE OR REPLACE FUNCTION create_discussion_feed_event()
RETURNS TRIGGER AS $$
DECLARE
  v_author_name TEXT;
BEGIN
  SELECT COALESCE(full_name, 'A citizen') INTO v_author_name
  FROM profiles WHERE id = NEW.author_id;

  INSERT INTO feed_events (actor_id, event_type, title, description, link)
  VALUES (
    NEW.author_id,
    'discussion_created',
    v_author_name || ' started a new discussion',
    LEFT(NEW.title, 200),
    '/social/' || NEW.id
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_discussion_feed_event
  AFTER INSERT ON discussions
  FOR EACH ROW
  EXECUTE FUNCTION create_discussion_feed_event();

-- Trigger: auto-create feed event when a party casts an official vote
CREATE OR REPLACE FUNCTION create_party_vote_feed_event()
RETURNS TRIGGER AS $$
DECLARE
  v_party_name TEXT;
  v_proposal_title TEXT;
BEGIN
  SELECT name INTO v_party_name FROM parties WHERE id = NEW.party_id;
  SELECT title INTO v_proposal_title FROM proposals WHERE id = NEW.proposal_id;

  INSERT INTO feed_events (actor_party_id, event_type, title, description, link)
  VALUES (
    NEW.party_id,
    'party_vote',
    v_party_name || ' cast an official vote',
    v_proposal_title,
    '/proposals/' || NEW.proposal_id
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_party_vote_feed_event
  AFTER INSERT ON party_votes
  FOR EACH ROW
  EXECUTE FUNCTION create_party_vote_feed_event();

-- Enable realtime for follows
ALTER PUBLICATION supabase_realtime ADD TABLE follows;

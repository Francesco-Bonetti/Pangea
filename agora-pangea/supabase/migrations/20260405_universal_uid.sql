-- ============================================================
-- UNIVERSAL ENTITY ID (UID) SYSTEM
-- Every entity gets a permanent, unique, human-readable code
-- Format: PREFIX-8alphanumeric (e.g. LAW-a4f8b2c1)
-- Pangea - Global Democratic Commonwealth
-- ============================================================

-- ── Helper function: generate random 8-char alphanumeric string ──
CREATE OR REPLACE FUNCTION generate_uid_code()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  chars TEXT := 'abcdefghijklmnopqrstuvwxyz0123456789';
  result TEXT := '';
  i INT;
BEGIN
  FOR i IN 1..8 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
  END LOOP;
  RETURN result;
END;
$$;

-- ── Main trigger function: auto-generate UID on INSERT ──
CREATE OR REPLACE FUNCTION set_entity_uid()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  prefix TEXT;
  new_uid TEXT;
  max_attempts INT := 10;
  attempt INT := 0;
BEGIN
  -- Only generate if uid is NULL (allow manual override)
  IF NEW.uid IS NOT NULL THEN
    RETURN NEW;
  END IF;

  -- Determine prefix from table name
  prefix := CASE TG_TABLE_NAME
    WHEN 'profiles'              THEN 'CIT'
    WHEN 'proposals'             THEN 'PRP'
    WHEN 'laws'                  THEN 'LAW'
    WHEN 'discussions'           THEN 'DSC'
    WHEN 'discussion_replies'    THEN 'RPL'
    WHEN 'discussion_channels'   THEN 'CHN'
    WHEN 'parties'               THEN 'PTY'
    WHEN 'jurisdictions'         THEN 'JUR'
    WHEN 'elections'             THEN 'ELC'
    WHEN 'candidates'            THEN 'CND'
    WHEN 'delegations'           THEN 'DLG'
    WHEN 'categories'            THEN 'CAT'
    WHEN 'tags'                  THEN 'TAG'
    WHEN 'comments'              THEN 'CMT'
    WHEN 'dm_conversations'      THEN 'DMC'
    WHEN 'dm_messages'           THEN 'MSG'
    WHEN 'bug_reports'           THEN 'BUG'
    WHEN 'party_forum_posts'     THEN 'PST'
    WHEN 'feed_events'           THEN 'FEV'
    WHEN 'votes'                 THEN 'VOT'
    WHEN 'election_votes'        THEN 'ELV'
    ELSE upper(left(TG_TABLE_NAME, 3))
  END;

  -- Generate unique UID with retry loop
  LOOP
    new_uid := prefix || '-' || generate_uid_code();
    attempt := attempt + 1;

    -- Check uniqueness within the same table
    BEGIN
      NEW.uid := new_uid;
      RETURN NEW;
    EXCEPTION WHEN unique_violation THEN
      IF attempt >= max_attempts THEN
        RAISE EXCEPTION 'Failed to generate unique UID after % attempts', max_attempts;
      END IF;
    END;
  END LOOP;
END;
$$;

-- ============================================================
-- ADD uid COLUMN TO ALL MAIN TABLES
-- ============================================================

-- ── profiles (citizens) ──
DO $$ BEGIN
  ALTER TABLE profiles ADD COLUMN IF NOT EXISTS uid TEXT;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE profiles ADD CONSTRAINT profiles_uid_unique UNIQUE (uid);
EXCEPTION WHEN duplicate_table THEN NULL;
         WHEN duplicate_object THEN NULL;
         WHEN undefined_table THEN NULL;
END $$;
DROP TRIGGER IF EXISTS trg_profiles_uid ON profiles;
CREATE TRIGGER trg_profiles_uid
  BEFORE INSERT ON profiles
  FOR EACH ROW EXECUTE FUNCTION set_entity_uid();

-- ── proposals ──
DO $$ BEGIN
  ALTER TABLE proposals ADD COLUMN IF NOT EXISTS uid TEXT;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE proposals ADD CONSTRAINT proposals_uid_unique UNIQUE (uid);
EXCEPTION WHEN duplicate_table THEN NULL;
         WHEN duplicate_object THEN NULL;
         WHEN undefined_table THEN NULL;
END $$;
DROP TRIGGER IF EXISTS trg_proposals_uid ON proposals;
CREATE TRIGGER trg_proposals_uid
  BEFORE INSERT ON proposals
  FOR EACH ROW EXECUTE FUNCTION set_entity_uid();

-- ── laws ──
DO $$ BEGIN
  ALTER TABLE laws ADD COLUMN IF NOT EXISTS uid TEXT;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE laws ADD CONSTRAINT laws_uid_unique UNIQUE (uid);
EXCEPTION WHEN duplicate_table THEN NULL;
         WHEN duplicate_object THEN NULL;
         WHEN undefined_table THEN NULL;
END $$;
DROP TRIGGER IF EXISTS trg_laws_uid ON laws;
CREATE TRIGGER trg_laws_uid
  BEFORE INSERT ON laws
  FOR EACH ROW EXECUTE FUNCTION set_entity_uid();

-- ── discussions ──
DO $$ BEGIN
  ALTER TABLE discussions ADD COLUMN IF NOT EXISTS uid TEXT;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE discussions ADD CONSTRAINT discussions_uid_unique UNIQUE (uid);
EXCEPTION WHEN duplicate_table THEN NULL;
         WHEN duplicate_object THEN NULL;
         WHEN undefined_table THEN NULL;
END $$;
DROP TRIGGER IF EXISTS trg_discussions_uid ON discussions;
CREATE TRIGGER trg_discussions_uid
  BEFORE INSERT ON discussions
  FOR EACH ROW EXECUTE FUNCTION set_entity_uid();

-- ── discussion_replies ──
DO $$ BEGIN
  ALTER TABLE discussion_replies ADD COLUMN IF NOT EXISTS uid TEXT;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE discussion_replies ADD CONSTRAINT discussion_replies_uid_unique UNIQUE (uid);
EXCEPTION WHEN duplicate_table THEN NULL;
         WHEN duplicate_object THEN NULL;
         WHEN undefined_table THEN NULL;
END $$;
DROP TRIGGER IF EXISTS trg_discussion_replies_uid ON discussion_replies;
CREATE TRIGGER trg_discussion_replies_uid
  BEFORE INSERT ON discussion_replies
  FOR EACH ROW EXECUTE FUNCTION set_entity_uid();

-- ── discussion_channels ──
DO $$ BEGIN
  ALTER TABLE discussion_channels ADD COLUMN IF NOT EXISTS uid TEXT;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE discussion_channels ADD CONSTRAINT discussion_channels_uid_unique UNIQUE (uid);
EXCEPTION WHEN duplicate_table THEN NULL;
         WHEN duplicate_object THEN NULL;
         WHEN undefined_table THEN NULL;
END $$;
DROP TRIGGER IF EXISTS trg_discussion_channels_uid ON discussion_channels;
CREATE TRIGGER trg_discussion_channels_uid
  BEFORE INSERT ON discussion_channels
  FOR EACH ROW EXECUTE FUNCTION set_entity_uid();

-- ── parties ──
DO $$ BEGIN
  ALTER TABLE parties ADD COLUMN IF NOT EXISTS uid TEXT;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE parties ADD CONSTRAINT parties_uid_unique UNIQUE (uid);
EXCEPTION WHEN duplicate_table THEN NULL;
         WHEN duplicate_object THEN NULL;
         WHEN undefined_table THEN NULL;
END $$;
DROP TRIGGER IF EXISTS trg_parties_uid ON parties;
CREATE TRIGGER trg_parties_uid
  BEFORE INSERT ON parties
  FOR EACH ROW EXECUTE FUNCTION set_entity_uid();

-- ── jurisdictions ──
DO $$ BEGIN
  ALTER TABLE jurisdictions ADD COLUMN IF NOT EXISTS uid TEXT;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE jurisdictions ADD CONSTRAINT jurisdictions_uid_unique UNIQUE (uid);
EXCEPTION WHEN duplicate_table THEN NULL;
         WHEN duplicate_object THEN NULL;
         WHEN undefined_table THEN NULL;
END $$;
DROP TRIGGER IF EXISTS trg_jurisdictions_uid ON jurisdictions;
CREATE TRIGGER trg_jurisdictions_uid
  BEFORE INSERT ON jurisdictions
  FOR EACH ROW EXECUTE FUNCTION set_entity_uid();

-- ── elections ──
DO $$ BEGIN
  ALTER TABLE elections ADD COLUMN IF NOT EXISTS uid TEXT;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE elections ADD CONSTRAINT elections_uid_unique UNIQUE (uid);
EXCEPTION WHEN duplicate_table THEN NULL;
         WHEN duplicate_object THEN NULL;
         WHEN undefined_table THEN NULL;
END $$;
DROP TRIGGER IF EXISTS trg_elections_uid ON elections;
CREATE TRIGGER trg_elections_uid
  BEFORE INSERT ON elections
  FOR EACH ROW EXECUTE FUNCTION set_entity_uid();

-- ── candidates ──
DO $$ BEGIN
  ALTER TABLE candidates ADD COLUMN IF NOT EXISTS uid TEXT;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE candidates ADD CONSTRAINT candidates_uid_unique UNIQUE (uid);
EXCEPTION WHEN duplicate_table THEN NULL;
         WHEN duplicate_object THEN NULL;
         WHEN undefined_table THEN NULL;
END $$;
DROP TRIGGER IF EXISTS trg_candidates_uid ON candidates;
CREATE TRIGGER trg_candidates_uid
  BEFORE INSERT ON candidates
  FOR EACH ROW EXECUTE FUNCTION set_entity_uid();

-- ── delegations ──
DO $$ BEGIN
  ALTER TABLE delegations ADD COLUMN IF NOT EXISTS uid TEXT;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE delegations ADD CONSTRAINT delegations_uid_unique UNIQUE (uid);
EXCEPTION WHEN duplicate_table THEN NULL;
         WHEN duplicate_object THEN NULL;
         WHEN undefined_table THEN NULL;
END $$;
DROP TRIGGER IF EXISTS trg_delegations_uid ON delegations;
CREATE TRIGGER trg_delegations_uid
  BEFORE INSERT ON delegations
  FOR EACH ROW EXECUTE FUNCTION set_entity_uid();

-- ── categories ──
DO $$ BEGIN
  ALTER TABLE categories ADD COLUMN IF NOT EXISTS uid TEXT;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE categories ADD CONSTRAINT categories_uid_unique UNIQUE (uid);
EXCEPTION WHEN duplicate_table THEN NULL;
         WHEN duplicate_object THEN NULL;
         WHEN undefined_table THEN NULL;
END $$;
DROP TRIGGER IF EXISTS trg_categories_uid ON categories;
CREATE TRIGGER trg_categories_uid
  BEFORE INSERT ON categories
  FOR EACH ROW EXECUTE FUNCTION set_entity_uid();

-- ── tags ──
DO $$ BEGIN
  ALTER TABLE tags ADD COLUMN IF NOT EXISTS uid TEXT;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE tags ADD CONSTRAINT tags_uid_unique UNIQUE (uid);
EXCEPTION WHEN duplicate_table THEN NULL;
         WHEN duplicate_object THEN NULL;
         WHEN undefined_table THEN NULL;
END $$;
DROP TRIGGER IF EXISTS trg_tags_uid ON tags;
CREATE TRIGGER trg_tags_uid
  BEFORE INSERT ON tags
  FOR EACH ROW EXECUTE FUNCTION set_entity_uid();

-- ── comments ──
DO $$ BEGIN
  ALTER TABLE comments ADD COLUMN IF NOT EXISTS uid TEXT;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE comments ADD CONSTRAINT comments_uid_unique UNIQUE (uid);
EXCEPTION WHEN duplicate_table THEN NULL;
         WHEN duplicate_object THEN NULL;
         WHEN undefined_table THEN NULL;
END $$;
DROP TRIGGER IF EXISTS trg_comments_uid ON comments;
CREATE TRIGGER trg_comments_uid
  BEFORE INSERT ON comments
  FOR EACH ROW EXECUTE FUNCTION set_entity_uid();

-- ── dm_conversations ──
DO $$ BEGIN
  ALTER TABLE dm_conversations ADD COLUMN IF NOT EXISTS uid TEXT;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE dm_conversations ADD CONSTRAINT dm_conversations_uid_unique UNIQUE (uid);
EXCEPTION WHEN duplicate_table THEN NULL;
         WHEN duplicate_object THEN NULL;
         WHEN undefined_table THEN NULL;
END $$;
DROP TRIGGER IF EXISTS trg_dm_conversations_uid ON dm_conversations;
CREATE TRIGGER trg_dm_conversations_uid
  BEFORE INSERT ON dm_conversations
  FOR EACH ROW EXECUTE FUNCTION set_entity_uid();

-- ── dm_messages ──
DO $$ BEGIN
  ALTER TABLE dm_messages ADD COLUMN IF NOT EXISTS uid TEXT;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE dm_messages ADD CONSTRAINT dm_messages_uid_unique UNIQUE (uid);
EXCEPTION WHEN duplicate_table THEN NULL;
         WHEN duplicate_object THEN NULL;
         WHEN undefined_table THEN NULL;
END $$;
DROP TRIGGER IF EXISTS trg_dm_messages_uid ON dm_messages;
CREATE TRIGGER trg_dm_messages_uid
  BEFORE INSERT ON dm_messages
  FOR EACH ROW EXECUTE FUNCTION set_entity_uid();

-- ── bug_reports ──
DO $$ BEGIN
  ALTER TABLE bug_reports ADD COLUMN IF NOT EXISTS uid TEXT;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE bug_reports ADD CONSTRAINT bug_reports_uid_unique UNIQUE (uid);
EXCEPTION WHEN duplicate_table THEN NULL;
         WHEN duplicate_object THEN NULL;
         WHEN undefined_table THEN NULL;
END $$;
DROP TRIGGER IF EXISTS trg_bug_reports_uid ON bug_reports;
CREATE TRIGGER trg_bug_reports_uid
  BEFORE INSERT ON bug_reports
  FOR EACH ROW EXECUTE FUNCTION set_entity_uid();

-- ── party_forum_posts ──
DO $$ BEGIN
  ALTER TABLE party_forum_posts ADD COLUMN IF NOT EXISTS uid TEXT;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE party_forum_posts ADD CONSTRAINT party_forum_posts_uid_unique UNIQUE (uid);
EXCEPTION WHEN duplicate_table THEN NULL;
         WHEN duplicate_object THEN NULL;
         WHEN undefined_table THEN NULL;
END $$;
DROP TRIGGER IF EXISTS trg_party_forum_posts_uid ON party_forum_posts;
CREATE TRIGGER trg_party_forum_posts_uid
  BEFORE INSERT ON party_forum_posts
  FOR EACH ROW EXECUTE FUNCTION set_entity_uid();

-- ── feed_events ──
DO $$ BEGIN
  ALTER TABLE feed_events ADD COLUMN IF NOT EXISTS uid TEXT;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE feed_events ADD CONSTRAINT feed_events_uid_unique UNIQUE (uid);
EXCEPTION WHEN duplicate_table THEN NULL;
         WHEN duplicate_object THEN NULL;
         WHEN undefined_table THEN NULL;
END $$;
DROP TRIGGER IF EXISTS trg_feed_events_uid ON feed_events;
CREATE TRIGGER trg_feed_events_uid
  BEFORE INSERT ON feed_events
  FOR EACH ROW EXECUTE FUNCTION set_entity_uid();

-- ── votes ──
DO $$ BEGIN
  ALTER TABLE votes ADD COLUMN IF NOT EXISTS uid TEXT;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE votes ADD CONSTRAINT votes_uid_unique UNIQUE (uid);
EXCEPTION WHEN duplicate_table THEN NULL;
         WHEN duplicate_object THEN NULL;
         WHEN undefined_table THEN NULL;
END $$;
DROP TRIGGER IF EXISTS trg_votes_uid ON votes;
CREATE TRIGGER trg_votes_uid
  BEFORE INSERT ON votes
  FOR EACH ROW EXECUTE FUNCTION set_entity_uid();

-- ── election_votes ──
DO $$ BEGIN
  ALTER TABLE election_votes ADD COLUMN IF NOT EXISTS uid TEXT;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE election_votes ADD CONSTRAINT election_votes_uid_unique UNIQUE (uid);
EXCEPTION WHEN duplicate_table THEN NULL;
         WHEN duplicate_object THEN NULL;
         WHEN undefined_table THEN NULL;
END $$;
DROP TRIGGER IF EXISTS trg_election_votes_uid ON election_votes;
CREATE TRIGGER trg_election_votes_uid
  BEFORE INSERT ON election_votes
  FOR EACH ROW EXECUTE FUNCTION set_entity_uid();

-- ============================================================
-- BACKFILL: Generate UIDs for all existing rows
-- ============================================================

-- Helper function for backfilling
CREATE OR REPLACE FUNCTION backfill_uids(tbl TEXT, prefix TEXT)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  row_id UUID;
  new_uid TEXT;
BEGIN
  FOR row_id IN EXECUTE format('SELECT id FROM %I WHERE uid IS NULL', tbl) LOOP
    new_uid := prefix || '-' || generate_uid_code();
    EXECUTE format('UPDATE %I SET uid = $1 WHERE id = $2', tbl) USING new_uid, row_id;
  END LOOP;
END;
$$;

-- Run backfill for all tables
SELECT backfill_uids('profiles', 'CIT');
SELECT backfill_uids('proposals', 'PRP');
SELECT backfill_uids('laws', 'LAW');
SELECT backfill_uids('discussions', 'DSC');
SELECT backfill_uids('discussion_replies', 'RPL');
SELECT backfill_uids('discussion_channels', 'CHN');
SELECT backfill_uids('parties', 'PTY');
SELECT backfill_uids('jurisdictions', 'JUR');
SELECT backfill_uids('elections', 'ELC');
SELECT backfill_uids('candidates', 'CND');
SELECT backfill_uids('delegations', 'DLG');
SELECT backfill_uids('categories', 'CAT');
SELECT backfill_uids('tags', 'TAG');
SELECT backfill_uids('comments', 'CMT');
SELECT backfill_uids('dm_conversations', 'DMC');
SELECT backfill_uids('dm_messages', 'MSG');
SELECT backfill_uids('bug_reports', 'BUG');
SELECT backfill_uids('party_forum_posts', 'PST');
SELECT backfill_uids('feed_events', 'FEV');
SELECT backfill_uids('votes', 'VOT');
SELECT backfill_uids('election_votes', 'ELV');

-- Clean up backfill function (one-time use)
DROP FUNCTION IF EXISTS backfill_uids(TEXT, TEXT);

-- ============================================================
-- INDEX: fast lookup by uid
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_profiles_uid ON profiles(uid);
CREATE INDEX IF NOT EXISTS idx_proposals_uid ON proposals(uid);
CREATE INDEX IF NOT EXISTS idx_laws_uid ON laws(uid);
CREATE INDEX IF NOT EXISTS idx_discussions_uid ON discussions(uid);
CREATE INDEX IF NOT EXISTS idx_discussion_replies_uid ON discussion_replies(uid);
CREATE INDEX IF NOT EXISTS idx_discussion_channels_uid ON discussion_channels(uid);
CREATE INDEX IF NOT EXISTS idx_parties_uid ON parties(uid);
CREATE INDEX IF NOT EXISTS idx_jurisdictions_uid ON jurisdictions(uid);
CREATE INDEX IF NOT EXISTS idx_elections_uid ON elections(uid);
CREATE INDEX IF NOT EXISTS idx_candidates_uid ON candidates(uid);
CREATE INDEX IF NOT EXISTS idx_delegations_uid ON delegations(uid);
CREATE INDEX IF NOT EXISTS idx_categories_uid ON categories(uid);
CREATE INDEX IF NOT EXISTS idx_tags_uid ON tags(uid);
CREATE INDEX IF NOT EXISTS idx_comments_uid ON comments(uid);
CREATE INDEX IF NOT EXISTS idx_dm_conversations_uid ON dm_conversations(uid);
CREATE INDEX IF NOT EXISTS idx_dm_messages_uid ON dm_messages(uid);
CREATE INDEX IF NOT EXISTS idx_bug_reports_uid ON bug_reports(uid);
CREATE INDEX IF NOT EXISTS idx_party_forum_posts_uid ON party_forum_posts(uid);
CREATE INDEX IF NOT EXISTS idx_feed_events_uid ON feed_events(uid);
CREATE INDEX IF NOT EXISTS idx_votes_uid ON votes(uid);
CREATE INDEX IF NOT EXISTS idx_election_votes_uid ON election_votes(uid);

-- ============================================================
-- RPC: Lookup any entity by UID
-- ============================================================
CREATE OR REPLACE FUNCTION lookup_by_uid(search_uid TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  prefix TEXT;
  entity_type TEXT;
  result JSONB;
BEGIN
  prefix := split_part(search_uid, '-', 1);

  entity_type := CASE prefix
    WHEN 'CIT' THEN 'profiles'
    WHEN 'PRP' THEN 'proposals'
    WHEN 'LAW' THEN 'laws'
    WHEN 'DSC' THEN 'discussions'
    WHEN 'RPL' THEN 'discussion_replies'
    WHEN 'CHN' THEN 'discussion_channels'
    WHEN 'PTY' THEN 'parties'
    WHEN 'JUR' THEN 'jurisdictions'
    WHEN 'ELC' THEN 'elections'
    WHEN 'CND' THEN 'candidates'
    WHEN 'DLG' THEN 'delegations'
    WHEN 'CAT' THEN 'categories'
    WHEN 'TAG' THEN 'tags'
    WHEN 'CMT' THEN 'comments'
    WHEN 'DMC' THEN 'dm_conversations'
    WHEN 'MSG' THEN 'dm_messages'
    WHEN 'BUG' THEN 'bug_reports'
    WHEN 'PST' THEN 'party_forum_posts'
    WHEN 'FEV' THEN 'feed_events'
    WHEN 'VOT' THEN 'votes'
    WHEN 'ELV' THEN 'election_votes'
    ELSE NULL
  END;

  IF entity_type IS NULL THEN
    RETURN jsonb_build_object('error', 'Unknown UID prefix: ' || prefix);
  END IF;

  EXECUTE format(
    'SELECT to_jsonb(t.*) FROM %I t WHERE t.uid = $1 LIMIT 1',
    entity_type
  ) INTO result USING search_uid;

  IF result IS NULL THEN
    RETURN jsonb_build_object('error', 'Entity not found', 'uid', search_uid);
  END IF;

  RETURN jsonb_build_object(
    'entity_type', entity_type,
    'uid', search_uid,
    'data', result
  );
END;
$$;

-- ============================================================
-- RPC: Search entities by UID prefix (autocomplete)
-- ============================================================
CREATE OR REPLACE FUNCTION search_by_uid(query TEXT, max_results INT DEFAULT 10)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  results JSONB := '[]'::JSONB;
  prefix TEXT;
  entity_type TEXT;
  tbl TEXT;
  row_data JSONB;
  tables TEXT[] := ARRAY[
    'profiles', 'proposals', 'laws', 'discussions', 'parties',
    'jurisdictions', 'elections', 'categories', 'tags', 'comments'
  ];
BEGIN
  prefix := split_part(query, '-', 1);

  -- If query has a prefix, search only that table
  IF position('-' in query) > 0 THEN
    entity_type := CASE prefix
      WHEN 'CIT' THEN 'profiles'
      WHEN 'PRP' THEN 'proposals'
      WHEN 'LAW' THEN 'laws'
      WHEN 'DSC' THEN 'discussions'
      WHEN 'RPL' THEN 'discussion_replies'
      WHEN 'CHN' THEN 'discussion_channels'
      WHEN 'PTY' THEN 'parties'
      WHEN 'JUR' THEN 'jurisdictions'
      WHEN 'ELC' THEN 'elections'
      WHEN 'CND' THEN 'candidates'
      WHEN 'DLG' THEN 'delegations'
      WHEN 'CAT' THEN 'categories'
      WHEN 'TAG' THEN 'tags'
      WHEN 'CMT' THEN 'comments'
      WHEN 'DMC' THEN 'dm_conversations'
      WHEN 'MSG' THEN 'dm_messages'
      WHEN 'BUG' THEN 'bug_reports'
      WHEN 'PST' THEN 'party_forum_posts'
      WHEN 'FEV' THEN 'feed_events'
      WHEN 'VOT' THEN 'votes'
      WHEN 'ELV' THEN 'election_votes'
      ELSE NULL
    END;

    IF entity_type IS NOT NULL THEN
      EXECUTE format(
        'SELECT jsonb_agg(jsonb_build_object(''uid'', uid, ''entity_type'', %L, ''id'', id)) FROM (SELECT uid, id FROM %I WHERE uid LIKE $1 ORDER BY uid LIMIT $2) sub',
        entity_type, entity_type
      ) INTO results USING query || '%', max_results;
    END IF;
  ELSE
    -- Search across main public tables
    FOREACH tbl IN ARRAY tables LOOP
      EXECUTE format(
        'SELECT jsonb_agg(jsonb_build_object(''uid'', uid, ''entity_type'', %L, ''id'', id)) FROM (SELECT uid, id FROM %I WHERE uid LIKE $1 ORDER BY uid LIMIT 3) sub',
        tbl, tbl
      ) INTO row_data USING '%' || query || '%';
      IF row_data IS NOT NULL THEN
        results := results || row_data;
      END IF;
    END LOOP;
  END IF;

  RETURN COALESCE(results, '[]'::JSONB);
END;
$$;

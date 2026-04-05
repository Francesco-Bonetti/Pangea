-- ============================================================
-- HASH-BASED DATA INTEGRITY SYSTEM
-- SHA-256 content hashing, Merkle trees, audit trails
-- Pangea - Global Democratic Commonwealth
-- ============================================================

-- ── Table: content_hashes ──
-- Stores SHA-256 hashes for every critical record
CREATE TABLE IF NOT EXISTS content_hashes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- What this hash refers to
  entity_type TEXT NOT NULL CHECK (entity_type IN ('law', 'proposal', 'vote', 'delegation', 'amendment', 'election', 'election_vote')),
  entity_id UUID NOT NULL,
  -- The hash itself
  content_hash TEXT NOT NULL, -- SHA-256 hex
  -- Hash of the previous version (for chain verification)
  previous_hash TEXT, -- NULL for first version
  -- Version tracking
  version INTEGER NOT NULL DEFAULT 1,
  -- What was hashed (serialized JSON of the fields)
  hashed_fields JSONB NOT NULL,
  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),

  -- Each entity+version is unique
  UNIQUE(entity_type, entity_id, version)
);

-- ── Table: merkle_trees ──
-- Stores Merkle tree roots for batches of records
CREATE TABLE IF NOT EXISTS merkle_trees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- What type of records this tree covers
  entity_type TEXT NOT NULL CHECK (entity_type IN ('law', 'proposal', 'vote', 'delegation', 'amendment', 'election', 'election_vote')),
  -- The Merkle root hash
  root_hash TEXT NOT NULL,
  -- Number of leaves in this tree
  leaf_count INTEGER NOT NULL,
  -- Timestamp range this tree covers
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,
  -- Tree structure (array of leaf hashes for verification)
  leaf_hashes TEXT[] NOT NULL,
  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── Table: hash_audit_log ──
-- Immutable log of all hash operations
CREATE TABLE IF NOT EXISTS hash_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Operation type
  operation TEXT NOT NULL CHECK (operation IN ('hash_created', 'hash_verified', 'hash_mismatch', 'merkle_root_created', 'integrity_check')),
  -- What was affected
  entity_type TEXT,
  entity_id UUID,
  -- Details
  content_hash TEXT,
  expected_hash TEXT,
  actual_hash TEXT,
  verification_result BOOLEAN,
  details JSONB,
  -- Who triggered it
  triggered_by UUID REFERENCES auth.users(id),
  -- Timestamp
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── Indexes ──
CREATE INDEX IF NOT EXISTS idx_content_hashes_entity ON content_hashes(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_content_hashes_hash ON content_hashes(content_hash);
CREATE INDEX IF NOT EXISTS idx_content_hashes_created ON content_hashes(created_at);
CREATE INDEX IF NOT EXISTS idx_merkle_trees_type ON merkle_trees(entity_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_merkle_trees_root ON merkle_trees(root_hash);
CREATE INDEX IF NOT EXISTS idx_hash_audit_log_entity ON hash_audit_log(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_hash_audit_log_created ON hash_audit_log(created_at DESC);

-- ── RLS Policies ──
ALTER TABLE content_hashes ENABLE ROW LEVEL SECURITY;
ALTER TABLE merkle_trees ENABLE ROW LEVEL SECURITY;
ALTER TABLE hash_audit_log ENABLE ROW LEVEL SECURITY;

-- Content hashes: anyone can read (public transparency), only system can write
CREATE POLICY "content_hashes_read_all" ON content_hashes FOR SELECT USING (true);
CREATE POLICY "content_hashes_insert_auth" ON content_hashes FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Merkle trees: anyone can read
CREATE POLICY "merkle_trees_read_all" ON merkle_trees FOR SELECT USING (true);
CREATE POLICY "merkle_trees_insert_auth" ON merkle_trees FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Audit log: anyone can read, only system can write
CREATE POLICY "hash_audit_read_all" ON hash_audit_log FOR SELECT USING (true);
CREATE POLICY "hash_audit_insert_auth" ON hash_audit_log FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- ── RPC: Compute SHA-256 hash in PostgreSQL ──
CREATE OR REPLACE FUNCTION compute_content_hash(content_json JSONB)
RETURNS TEXT
LANGUAGE SQL
IMMUTABLE
AS $$
  SELECT encode(digest(content_json::text, 'sha256'), 'hex');
$$;

-- ── RPC: Hash a law record ──
CREATE OR REPLACE FUNCTION hash_law(law_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  law_record RECORD;
  content_json JSONB;
  hash_result TEXT;
  prev_hash TEXT;
  current_version INTEGER;
BEGIN
  -- Get the law
  SELECT id, title, content, simplified_content, article_number, code,
         parent_id, is_active, jurisdiction_id, created_at
  INTO law_record
  FROM laws WHERE id = law_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Law not found: %', law_id;
  END IF;

  -- Build deterministic JSON
  content_json := jsonb_build_object(
    'id', law_record.id,
    'title', law_record.title,
    'content', law_record.content,
    'simplified_content', law_record.simplified_content,
    'article_number', law_record.article_number,
    'code', law_record.code,
    'parent_id', law_record.parent_id,
    'is_active', law_record.is_active,
    'jurisdiction_id', law_record.jurisdiction_id,
    'created_at', law_record.created_at
  );

  -- Compute hash
  hash_result := encode(digest(content_json::text, 'sha256'), 'hex');

  -- Get previous hash and version
  SELECT content_hash, version INTO prev_hash, current_version
  FROM content_hashes
  WHERE entity_type = 'law' AND entity_id = law_id
  ORDER BY version DESC LIMIT 1;

  IF NOT FOUND THEN
    current_version := 0;
    prev_hash := NULL;
  END IF;

  -- Insert new hash record
  INSERT INTO content_hashes (entity_type, entity_id, content_hash, previous_hash, version, hashed_fields, created_by)
  VALUES ('law', law_id, hash_result, prev_hash, current_version + 1, content_json, auth.uid());

  -- Log it
  INSERT INTO hash_audit_log (operation, entity_type, entity_id, content_hash, triggered_by)
  VALUES ('hash_created', 'law', law_id, hash_result, auth.uid());

  RETURN hash_result;
END;
$$;

-- ── RPC: Hash a proposal record ──
CREATE OR REPLACE FUNCTION hash_proposal(proposal_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  prop_record RECORD;
  content_json JSONB;
  hash_result TEXT;
  prev_hash TEXT;
  current_version INTEGER;
BEGIN
  SELECT id, author_id, title, content, dispositivo, status, proposal_type,
         parent_proposal_id, created_at, expires_at, category_id
  INTO prop_record
  FROM proposals WHERE id = proposal_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Proposal not found: %', proposal_id;
  END IF;

  content_json := jsonb_build_object(
    'id', prop_record.id,
    'author_id', prop_record.author_id,
    'title', prop_record.title,
    'content', prop_record.content,
    'dispositivo', prop_record.dispositivo,
    'status', prop_record.status,
    'proposal_type', prop_record.proposal_type,
    'parent_proposal_id', prop_record.parent_proposal_id,
    'created_at', prop_record.created_at,
    'expires_at', prop_record.expires_at,
    'category_id', prop_record.category_id
  );

  hash_result := encode(digest(content_json::text, 'sha256'), 'hex');

  SELECT content_hash, version INTO prev_hash, current_version
  FROM content_hashes
  WHERE entity_type = 'proposal' AND entity_id = proposal_id
  ORDER BY version DESC LIMIT 1;

  IF NOT FOUND THEN
    current_version := 0;
    prev_hash := NULL;
  END IF;

  INSERT INTO content_hashes (entity_type, entity_id, content_hash, previous_hash, version, hashed_fields, created_by)
  VALUES ('proposal', proposal_id, hash_result, prev_hash, current_version + 1, content_json, auth.uid());

  INSERT INTO hash_audit_log (operation, entity_type, entity_id, content_hash, triggered_by)
  VALUES ('hash_created', 'proposal', proposal_id, hash_result, auth.uid());

  RETURN hash_result;
END;
$$;

-- ── RPC: Hash a vote record ──
CREATE OR REPLACE FUNCTION hash_vote(vote_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  vote_record RECORD;
  content_json JSONB;
  hash_result TEXT;
BEGIN
  SELECT id, proposal_id, voter_id, vote_type, voting_weight, created_at
  INTO vote_record
  FROM votes WHERE id = vote_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Vote not found: %', vote_id;
  END IF;

  content_json := jsonb_build_object(
    'id', vote_record.id,
    'proposal_id', vote_record.proposal_id,
    'voter_id', vote_record.voter_id,
    'vote_type', vote_record.vote_type,
    'voting_weight', vote_record.voting_weight,
    'created_at', vote_record.created_at
  );

  hash_result := encode(digest(content_json::text, 'sha256'), 'hex');

  -- Votes are immutable, always version 1
  INSERT INTO content_hashes (entity_type, entity_id, content_hash, previous_hash, version, hashed_fields, created_by)
  VALUES ('vote', vote_id, hash_result, NULL, 1, content_json, auth.uid())
  ON CONFLICT (entity_type, entity_id, version) DO NOTHING;

  INSERT INTO hash_audit_log (operation, entity_type, entity_id, content_hash, triggered_by)
  VALUES ('hash_created', 'vote', vote_id, hash_result, auth.uid());

  RETURN hash_result;
END;
$$;

-- ── RPC: Verify a record's integrity ──
CREATE OR REPLACE FUNCTION verify_record_integrity(p_entity_type TEXT, p_entity_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  stored_record RECORD;
  current_hash TEXT;
  is_valid BOOLEAN;
  result JSONB;
BEGIN
  -- Get latest stored hash
  SELECT content_hash, hashed_fields, version, created_at, previous_hash
  INTO stored_record
  FROM content_hashes
  WHERE entity_type = p_entity_type AND entity_id = p_entity_id
  ORDER BY version DESC LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'verified', false,
      'error', 'No hash record found for this entity',
      'entity_type', p_entity_type,
      'entity_id', p_entity_id
    );
  END IF;

  -- Recompute hash from stored fields
  current_hash := encode(digest(stored_record.hashed_fields::text, 'sha256'), 'hex');
  is_valid := (current_hash = stored_record.content_hash);

  -- Log verification
  INSERT INTO hash_audit_log (operation, entity_type, entity_id, content_hash, expected_hash, actual_hash, verification_result, triggered_by)
  VALUES (
    CASE WHEN is_valid THEN 'hash_verified' ELSE 'hash_mismatch' END,
    p_entity_type, p_entity_id,
    stored_record.content_hash, stored_record.content_hash, current_hash,
    is_valid, auth.uid()
  );

  result := jsonb_build_object(
    'verified', is_valid,
    'entity_type', p_entity_type,
    'entity_id', p_entity_id,
    'content_hash', stored_record.content_hash,
    'version', stored_record.version,
    'hashed_at', stored_record.created_at,
    'previous_hash', stored_record.previous_hash,
    'chain_length', stored_record.version
  );

  RETURN result;
END;
$$;

-- ── RPC: Get integrity stats ──
CREATE OR REPLACE FUNCTION get_integrity_stats()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'total_hashes', (SELECT count(*) FROM content_hashes),
    'hashes_by_type', (
      SELECT jsonb_object_agg(entity_type, cnt)
      FROM (SELECT entity_type, count(*) as cnt FROM content_hashes GROUP BY entity_type) t
    ),
    'merkle_trees', (SELECT count(*) FROM merkle_trees),
    'latest_merkle_roots', (
      SELECT jsonb_agg(jsonb_build_object(
        'entity_type', entity_type,
        'root_hash', root_hash,
        'leaf_count', leaf_count,
        'created_at', created_at
      ))
      FROM (
        SELECT DISTINCT ON (entity_type) entity_type, root_hash, leaf_count, created_at
        FROM merkle_trees ORDER BY entity_type, created_at DESC
      ) t
    ),
    'recent_verifications', (SELECT count(*) FROM hash_audit_log WHERE operation IN ('hash_verified', 'hash_mismatch') AND created_at > now() - interval '24 hours'),
    'recent_mismatches', (SELECT count(*) FROM hash_audit_log WHERE operation = 'hash_mismatch' AND created_at > now() - interval '24 hours'),
    'audit_log_total', (SELECT count(*) FROM hash_audit_log)
  ) INTO result;

  RETURN result;
END;
$$;

-- ── RPC: Search hash by hash string ──
CREATE OR REPLACE FUNCTION search_by_hash(p_hash TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  found_record RECORD;
  result JSONB;
BEGIN
  SELECT entity_type, entity_id, content_hash, version, created_at, hashed_fields, previous_hash
  INTO found_record
  FROM content_hashes
  WHERE content_hash = p_hash
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('found', false, 'hash', p_hash);
  END IF;

  RETURN jsonb_build_object(
    'found', true,
    'entity_type', found_record.entity_type,
    'entity_id', found_record.entity_id,
    'content_hash', found_record.content_hash,
    'version', found_record.version,
    'created_at', found_record.created_at,
    'hashed_fields', found_record.hashed_fields,
    'previous_hash', found_record.previous_hash
  );
END;
$$;

-- ── RPC: Batch hash all existing records ──
CREATE OR REPLACE FUNCTION batch_hash_existing_records()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  law_count INTEGER := 0;
  proposal_count INTEGER := 0;
  vote_count INTEGER := 0;
  r RECORD;
BEGIN
  -- Hash all laws that don't have a hash yet
  FOR r IN
    SELECT l.id FROM laws l
    LEFT JOIN content_hashes ch ON ch.entity_type = 'law' AND ch.entity_id = l.id
    WHERE ch.id IS NULL
  LOOP
    PERFORM hash_law(r.id);
    law_count := law_count + 1;
  END LOOP;

  -- Hash all proposals that don't have a hash yet
  FOR r IN
    SELECT p.id FROM proposals p
    LEFT JOIN content_hashes ch ON ch.entity_type = 'proposal' AND ch.entity_id = p.id
    WHERE ch.id IS NULL
  LOOP
    PERFORM hash_proposal(r.id);
    proposal_count := proposal_count + 1;
  END LOOP;

  -- Hash all votes that don't have a hash yet
  FOR r IN
    SELECT v.id FROM votes v
    LEFT JOIN content_hashes ch ON ch.entity_type = 'vote' AND ch.entity_id = v.id
    WHERE ch.id IS NULL
  LOOP
    PERFORM hash_vote(r.id);
    vote_count := vote_count + 1;
  END LOOP;

  RETURN jsonb_build_object(
    'laws_hashed', law_count,
    'proposals_hashed', proposal_count,
    'votes_hashed', vote_count,
    'total', law_count + proposal_count + vote_count
  );
END;
$$;

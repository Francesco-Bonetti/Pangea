-- ============================================================
-- T09: Groups as Mini-Pangea
-- Migration: Add group_id to proposals, normalize laws
-- Date: 2026-04-11
-- ============================================================

-- 1. Add group_id to proposals (nullable, FK to groups)
ALTER TABLE proposals
  ADD COLUMN IF NOT EXISTS group_id uuid REFERENCES groups(id) ON DELETE SET NULL;

-- Index for fast group-scoped queries
CREATE INDEX IF NOT EXISTS idx_proposals_group_id ON proposals(group_id) WHERE group_id IS NOT NULL;

-- 2. Add group_id to laws as alias for jurisdiction_id
-- laws already has jurisdiction_id → groups, but we add group_id for consistency
-- Then backfill from jurisdiction_id
ALTER TABLE laws
  ADD COLUMN IF NOT EXISTS group_id uuid REFERENCES groups(id) ON DELETE SET NULL;

-- Backfill: copy jurisdiction_id values to group_id
UPDATE laws SET group_id = jurisdiction_id WHERE jurisdiction_id IS NOT NULL AND group_id IS NULL;

-- Index
CREATE INDEX IF NOT EXISTS idx_laws_group_id ON laws(group_id) WHERE group_id IS NOT NULL;

-- 3. Add group_id to discussion_channels (scope channels to groups)
ALTER TABLE discussion_channels
  ADD COLUMN IF NOT EXISTS group_id uuid REFERENCES groups(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_discussion_channels_group_id ON discussion_channels(group_id) WHERE group_id IS NOT NULL;

-- 4. RPC: Get group stats (laws, proposals, elections counts)
CREATE OR REPLACE FUNCTION get_group_content_stats(p_group_id uuid)
RETURNS json
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_laws_count int;
  v_proposals_count int;
  v_active_proposals int;
  v_elections_count int;
  v_active_elections int;
BEGIN
  SELECT count(*) INTO v_laws_count
  FROM laws WHERE (group_id = p_group_id OR jurisdiction_id = p_group_id) AND status = 'active';

  SELECT count(*) INTO v_proposals_count
  FROM proposals WHERE group_id = p_group_id;

  SELECT count(*) INTO v_active_proposals
  FROM proposals WHERE group_id = p_group_id AND status IN ('active', 'curation');

  SELECT count(*) INTO v_elections_count
  FROM elections WHERE group_id = p_group_id;

  SELECT count(*) INTO v_active_elections
  FROM elections WHERE group_id = p_group_id AND status IN ('upcoming', 'candidature', 'voting');

  RETURN json_build_object(
    'laws_count', v_laws_count,
    'proposals_count', v_proposals_count,
    'active_proposals', v_active_proposals,
    'elections_count', v_elections_count,
    'active_elections', v_active_elections
  );
END;
$$;

-- 5. RLS: proposals group_id (authenticated can read, tier-gated for write — already handled)
-- No new RLS needed: existing policies on proposals already work.
-- The group_id column is just a filter, not a permission boundary.

-- 6. RLS: laws group_id (same as above)
-- Existing RLS on laws is sufficient.

-- ============================================================
-- DONE. Run this on Supabase SQL Editor.
-- ============================================================

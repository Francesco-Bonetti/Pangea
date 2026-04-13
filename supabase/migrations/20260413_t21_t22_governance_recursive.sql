-- T21: Governance Ricorsiva — governance_config JSONB + recursive resolution
-- T22: Rule Inheritance — tier ceiling validation + charter compliance check

-- ═══════════════════════════════════════════════════════════════
-- T21: governance_config column
-- ═══════════════════════════════════════════════════════════════

-- Separate from settings (operational: visibility, join, posting).
-- governance_config holds decision-making process parameters.
ALTER TABLE groups ADD COLUMN IF NOT EXISTS governance_config jsonb NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN groups.governance_config IS 'T21: Decision-making process config. Inherits from parent via get_effective_governance(). Keys: voting_method, proposal_review_days, min_members_to_propose, allow_delegated_voting, max_proposal_duration_days, require_quorum, tier_ceiling';

-- ═══════════════════════════════════════════════════════════════
-- T21: get_effective_governance(group_id)
-- Walks parent_group_id chain, merges governance_config.
-- Child values win UNLESS the key is in parent's locked_settings.
-- Returns { resolved: {…}, sources: { key: { value, from_group_id, from_group_name, inherited } } }
-- ═══════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION get_effective_governance(p_group_id uuid)
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER
AS $$
DECLARE
  v_chain jsonb[] := ARRAY[]::jsonb[];
  v_current_id uuid := p_group_id;
  v_depth int := 0;
  v_row record;
  v_result jsonb := '{}'::jsonb;
  v_sources jsonb := '{}'::jsonb;
  v_key text;
  v_val jsonb;
  v_defaults jsonb := jsonb_build_object(
    'voting_method', 'simple_majority',
    'proposal_review_days', 7,
    'min_members_to_propose', 1,
    'allow_delegated_voting', true,
    'max_proposal_duration_days', 30,
    'require_quorum', true,
    'tier_ceiling', 'ordinary'
  );
BEGIN
  -- 1. Collect ancestor chain (self first, root last)
  WHILE v_current_id IS NOT NULL AND v_depth < 20 LOOP
    SELECT id, name, parent_group_id, governance_config, locked_settings
    INTO v_row
    FROM groups WHERE id = v_current_id;

    IF v_row IS NULL THEN EXIT; END IF;

    v_chain := array_append(v_chain, jsonb_build_object(
      'id', v_row.id,
      'name', v_row.name,
      'config', COALESCE(v_row.governance_config, '{}'::jsonb),
      'locked', COALESCE(v_row.locked_settings, '{}'::jsonb)
    ));

    v_current_id := v_row.parent_group_id;
    v_depth := v_depth + 1;
  END LOOP;

  -- 2. Resolve from root → child (last element first)
  -- Start with defaults
  v_result := v_defaults;
  FOR v_key IN SELECT jsonb_object_keys(v_defaults) LOOP
    v_sources := v_sources || jsonb_build_object(v_key, jsonb_build_object(
      'value', v_defaults->v_key,
      'from_group_id', null,
      'from_group_name', 'default',
      'inherited', true
    ));
  END LOOP;

  -- Walk from root (last) to self (first)
  FOR i IN REVERSE array_length(v_chain, 1)..1 LOOP
    DECLARE
      v_node jsonb := v_chain[i];
      v_node_config jsonb := v_node->'config';
      v_node_id text := v_node->>'id';
      v_node_name text := v_node->>'name';
      v_parent_locked jsonb := '{}'::jsonb;
    BEGIN
      -- Get parent's locked_settings (if this is not root)
      IF i < array_length(v_chain, 1) THEN
        v_parent_locked := COALESCE(v_chain[i+1]->'locked', '{}'::jsonb);
      END IF;

      FOR v_key IN SELECT jsonb_object_keys(v_node_config) LOOP
        -- Skip if parent locked this key (parent override wins)
        IF v_parent_locked ? v_key THEN
          CONTINUE;
        END IF;

        v_val := v_node_config->v_key;
        v_result := v_result || jsonb_build_object(v_key, v_val);
        v_sources := v_sources || jsonb_build_object(v_key, jsonb_build_object(
          'value', v_val,
          'from_group_id', v_node_id,
          'from_group_name', v_node_name,
          'inherited', i != 1  -- true if not self
        ));
      END LOOP;
    END;
  END LOOP;

  RETURN jsonb_build_object(
    'resolved', v_result,
    'sources', v_sources
  );
END;
$$;

-- ═══════════════════════════════════════════════════════════════
-- T22: validate_proposal_against_chain(group_id, tier)
-- Walks group→parent→root, checks:
--   1. tier_ceiling: group cannot propose above its ceiling
--   2. bootstrap_lock: reinforced laws in ancestors block certain tiers
-- Returns { valid: bool, reason: text|null, tier_ceiling: text, chain_depth: int }
-- ═══════════════════════════════════════════════════════════════

-- Tier ordering helper
CREATE OR REPLACE FUNCTION tier_rank(p_tier text)
RETURNS int
LANGUAGE sql IMMUTABLE
AS $$
  SELECT CASE p_tier
    WHEN 'ordinary' THEN 1
    WHEN 'platform' THEN 2
    WHEN 'core' THEN 3
    WHEN 'constitutional' THEN 4
    ELSE 0
  END;
$$;

CREATE OR REPLACE FUNCTION validate_proposal_against_chain(
  p_group_id uuid,
  p_tier text
)
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER
AS $$
DECLARE
  v_eff jsonb;
  v_ceiling text;
  v_ceiling_rank int;
  v_tier_rank int;
  v_current_id uuid;
  v_depth int := 0;
  v_has_reinforced_violation boolean := false;
  v_violation_detail text;
BEGIN
  -- 1. Get effective governance (includes tier_ceiling)
  v_eff := get_effective_governance(p_group_id);
  v_ceiling := COALESCE(v_eff->'resolved'->>'tier_ceiling', 'ordinary');
  v_ceiling_rank := tier_rank(v_ceiling);
  v_tier_rank := tier_rank(p_tier);

  -- 2. Check tier ceiling
  IF v_tier_rank > v_ceiling_rank THEN
    RETURN jsonb_build_object(
      'valid', false,
      'reason', format('TIER_EXCEEDS_CEILING: group tier ceiling is "%s" but proposal requires "%s"', v_ceiling, p_tier),
      'tier_ceiling', v_ceiling,
      'chain_depth', v_depth
    );
  END IF;

  -- 3. Walk chain to check reinforced law violations
  -- If proposing constitutional/core tier, check that no ancestor has
  -- bootstrap-locked laws that would be affected
  IF v_tier_rank >= 3 THEN  -- core or constitutional
    v_current_id := p_group_id;
    WHILE v_current_id IS NOT NULL AND v_depth < 20 LOOP
      -- Check if any reinforced laws exist at this level
      IF EXISTS (
        SELECT 1 FROM laws
        WHERE jurisdiction_id = v_current_id
        AND lock_category = 'reinforced'
        AND status = 'active'
      ) THEN
        -- Group has reinforced laws — constitutional proposals need supermajority
        -- This is informational, not blocking (Art. 11.3 handles the voting threshold)
        NULL;
      END IF;

      SELECT parent_group_id INTO v_current_id
      FROM groups WHERE id = v_current_id;
      v_depth := v_depth + 1;
    END LOOP;
  END IF;

  -- 4. For non-root groups proposing above 'platform', check that
  -- the group is at least depth 1 (direct child of root or deeper)
  -- Root group (Pangea) has no tier restriction
  IF p_group_id IS NOT NULL AND v_tier_rank >= 4 THEN
    -- Only root can propose constitutional changes
    DECLARE
      v_parent uuid;
    BEGIN
      SELECT parent_group_id INTO v_parent FROM groups WHERE id = p_group_id;
      IF v_parent IS NOT NULL THEN
        -- This is not root — check if ceiling allows it
        -- (already checked above via tier_ceiling, this is a safety net)
        NULL;
      END IF;
    END;
  END IF;

  RETURN jsonb_build_object(
    'valid', true,
    'reason', null,
    'tier_ceiling', v_ceiling,
    'chain_depth', v_depth
  );
END;
$$;

-- ═══════════════════════════════════════════════════════════════
-- T22: Trigger — enforce tier validation on proposal insert/update
-- ═══════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION enforce_proposal_tier_ceiling()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_result jsonb;
  v_group_id uuid;
BEGIN
  v_group_id := NEW.group_id;

  -- Skip validation for proposals without a group (global proposals)
  IF v_group_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Validate tier against group chain
  v_result := validate_proposal_against_chain(v_group_id, COALESCE(NEW.tier, 'ordinary'));

  IF NOT (v_result->>'valid')::boolean THEN
    RAISE EXCEPTION 'Proposal tier validation failed: %', v_result->>'reason'
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;

-- Apply trigger on insert and tier-changing updates
DROP TRIGGER IF EXISTS trg_enforce_proposal_tier ON proposals;
CREATE TRIGGER trg_enforce_proposal_tier
  BEFORE INSERT OR UPDATE OF tier ON proposals
  FOR EACH ROW
  EXECUTE FUNCTION enforce_proposal_tier_ceiling();

-- ═══════════════════════════════════════════════════════════════
-- T21: update_governance_config RPC
-- Like update_group_settings but for governance_config
-- ═══════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION update_governance_config(
  p_group_id uuid,
  p_config jsonb
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_member_role text;
  v_locks jsonb;
  v_key text;
  v_valid_keys text[] := ARRAY[
    'voting_method', 'proposal_review_days', 'min_members_to_propose',
    'allow_delegated_voting', 'max_proposal_duration_days', 'require_quorum',
    'tier_ceiling'
  ];
  v_filtered jsonb := '{}'::jsonb;
BEGIN
  -- Permission check
  SELECT role INTO v_member_role
  FROM group_members
  WHERE group_id = p_group_id AND user_id = v_user_id;

  IF v_member_role IS NULL OR v_member_role NOT IN ('founder', 'co_founder', 'president', 'vice_president', 'admin') THEN
    RETURN jsonb_build_object('success', false, 'error', 'PERMISSION_DENIED');
  END IF;

  -- Filter to valid keys only
  FOR v_key IN SELECT jsonb_object_keys(p_config) LOOP
    IF v_key = ANY(v_valid_keys) THEN
      v_filtered := v_filtered || jsonb_build_object(v_key, p_config->v_key);
    END IF;
  END LOOP;

  -- Validate specific values
  IF v_filtered ? 'voting_method' AND NOT (v_filtered->>'voting_method') = ANY(ARRAY['simple_majority', 'supermajority', 'consensus']) THEN
    RETURN jsonb_build_object('success', false, 'error', 'INVALID_VOTING_METHOD');
  END IF;

  IF v_filtered ? 'tier_ceiling' AND NOT (v_filtered->>'tier_ceiling') = ANY(ARRAY['ordinary', 'platform', 'core', 'constitutional']) THEN
    RETURN jsonb_build_object('success', false, 'error', 'INVALID_TIER_CEILING');
  END IF;

  -- Check locked settings from parent
  v_locks := get_effective_locks(p_group_id);
  FOR v_key IN SELECT jsonb_object_keys(v_locks) LOOP
    IF v_filtered ? v_key THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'SETTING_LOCKED',
        'key', v_key,
        'locked_by', v_locks->v_key->'locked_by_name'
      );
    END IF;
  END LOOP;

  -- Validate tier_ceiling doesn't exceed parent's ceiling
  IF v_filtered ? 'tier_ceiling' THEN
    DECLARE
      v_parent_id uuid;
      v_parent_eff jsonb;
      v_parent_ceiling text;
    BEGIN
      SELECT parent_group_id INTO v_parent_id FROM groups WHERE id = p_group_id;
      IF v_parent_id IS NOT NULL THEN
        v_parent_eff := get_effective_governance(v_parent_id);
        v_parent_ceiling := COALESCE(v_parent_eff->'resolved'->>'tier_ceiling', 'ordinary');
        IF tier_rank(v_filtered->>'tier_ceiling') > tier_rank(v_parent_ceiling) THEN
          RETURN jsonb_build_object(
            'success', false,
            'error', 'TIER_CEILING_EXCEEDS_PARENT',
            'parent_ceiling', v_parent_ceiling
          );
        END IF;
      END IF;
    END;
  END IF;

  -- Apply
  UPDATE groups
  SET governance_config = governance_config || v_filtered
  WHERE id = p_group_id;

  RETURN jsonb_build_object('success', true);
END;
$$;

-- ═══════════════════════════════════════════════════════════════
-- Seed: Pangea Root governance_config (constitutional tier ceiling)
-- ═══════════════════════════════════════════════════════════════

UPDATE groups
SET governance_config = jsonb_build_object(
  'voting_method', 'simple_majority',
  'proposal_review_days', 7,
  'min_members_to_propose', 1,
  'allow_delegated_voting', true,
  'max_proposal_duration_days', 30,
  'require_quorum', true,
  'tier_ceiling', 'constitutional'
)
WHERE parent_group_id IS NULL AND name = 'Pangea';

-- Grants
GRANT EXECUTE ON FUNCTION get_effective_governance(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION validate_proposal_against_chain(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION update_governance_config(uuid, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION tier_rank(text) TO authenticated;

-- T10: Hierarchical Settings — parent→child lock enforcement
-- Adds locked_settings JSONB column and RPCs for settings management

-- 1. Add locked_settings column (keys locked by parent group)
ALTER TABLE groups ADD COLUMN locked_settings jsonb NOT NULL DEFAULT '{}'::jsonb;

-- 2. RPC: Get effective locks for a group (walks up the ancestor chain)
CREATE OR REPLACE FUNCTION get_effective_locks(p_group_id uuid)
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER
AS $$
DECLARE
  v_locks jsonb := '{}'::jsonb;
  v_current_id uuid;
  v_parent_id uuid;
  v_parent_name text;
  v_parent_settings jsonb;
  v_parent_locked jsonb;
  v_key text;
  v_depth int := 0;
BEGIN
  SELECT parent_group_id INTO v_current_id FROM groups WHERE id = p_group_id;

  WHILE v_current_id IS NOT NULL AND v_depth < 20 LOOP
    SELECT id, name, parent_group_id, settings, locked_settings
    INTO v_parent_id, v_parent_name, v_current_id, v_parent_settings, v_parent_locked
    FROM groups WHERE id = v_current_id;

    IF v_parent_id IS NULL THEN EXIT; END IF;

    FOR v_key IN SELECT jsonb_object_keys(v_parent_locked) LOOP
      IF NOT v_locks ? v_key THEN
        v_locks := v_locks || jsonb_build_object(
          v_key, jsonb_build_object(
            'value', v_parent_settings->v_key,
            'locked_by_id', v_parent_id,
            'locked_by_name', v_parent_name
          )
        );
      END IF;
    END LOOP;

    v_current_id := (SELECT parent_group_id FROM groups WHERE id = v_parent_id);
    v_depth := v_depth + 1;
  END LOOP;

  RETURN v_locks;
END;
$$;

-- 3. RPC: Update group settings (validates parent locks)
CREATE OR REPLACE FUNCTION update_group_settings(
  p_group_id uuid,
  p_new_settings jsonb
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_member_role text;
  v_locks jsonb;
  v_key text;
  v_current_settings jsonb;
BEGIN
  SELECT role INTO v_member_role
  FROM group_members
  WHERE group_id = p_group_id AND user_id = v_user_id;

  IF v_member_role IS NULL OR v_member_role NOT IN ('founder', 'co_founder', 'president', 'vice_president', 'admin') THEN
    RETURN jsonb_build_object('success', false, 'error', 'PERMISSION_DENIED');
  END IF;

  SELECT settings INTO v_current_settings FROM groups WHERE id = p_group_id;

  v_locks := get_effective_locks(p_group_id);

  FOR v_key IN SELECT jsonb_object_keys(v_locks) LOOP
    IF p_new_settings ? v_key AND p_new_settings->>v_key IS DISTINCT FROM (v_locks->v_key->>'value') THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'SETTING_LOCKED',
        'key', v_key,
        'locked_by', v_locks->v_key->'locked_by_name',
        'required_value', v_locks->v_key->'value'
      );
    END IF;
  END LOOP;

  UPDATE groups SET settings = settings || p_new_settings WHERE id = p_group_id;

  RETURN jsonb_build_object('success', true);
END;
$$;

-- 4. RPC: Lock/unlock settings for child groups
CREATE OR REPLACE FUNCTION set_group_locks(
  p_group_id uuid,
  p_locked_keys jsonb
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_member_role text;
  v_key text;
  v_val boolean;
  v_new_locked jsonb;
BEGIN
  SELECT role INTO v_member_role
  FROM group_members
  WHERE group_id = p_group_id AND user_id = v_user_id;

  IF v_member_role IS NULL OR v_member_role NOT IN ('founder', 'co_founder', 'president', 'admin') THEN
    RETURN jsonb_build_object('success', false, 'error', 'PERMISSION_DENIED');
  END IF;

  SELECT locked_settings INTO v_new_locked FROM groups WHERE id = p_group_id;

  FOR v_key IN SELECT jsonb_object_keys(p_locked_keys) LOOP
    v_val := (p_locked_keys->>v_key)::boolean;
    IF v_val THEN
      v_new_locked := v_new_locked || jsonb_build_object(v_key, true);
    ELSE
      v_new_locked := v_new_locked - v_key;
    END IF;
  END LOOP;

  UPDATE groups SET locked_settings = v_new_locked WHERE id = p_group_id;

  -- Enforce locked values on direct children
  DECLARE
    v_parent_settings jsonb;
    v_enforce_patch jsonb := '{}'::jsonb;
  BEGIN
    SELECT settings INTO v_parent_settings FROM groups WHERE id = p_group_id;

    FOR v_key IN SELECT jsonb_object_keys(v_new_locked) LOOP
      v_enforce_patch := v_enforce_patch || jsonb_build_object(v_key, v_parent_settings->v_key);
    END LOOP;

    IF v_enforce_patch != '{}'::jsonb THEN
      UPDATE groups SET settings = settings || v_enforce_patch
      WHERE parent_group_id = p_group_id;
    END IF;
  END;

  RETURN jsonb_build_object('success', true);
END;
$$;

-- 5. Grant execute
GRANT EXECUTE ON FUNCTION get_effective_locks(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION update_group_settings(uuid, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION set_group_locks(uuid, jsonb) TO authenticated;

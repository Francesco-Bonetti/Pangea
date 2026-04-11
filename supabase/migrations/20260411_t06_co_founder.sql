-- ============================================
-- T06 — Co-founding groups
-- Migration: 2026-04-11
-- ============================================
-- Adds an RPC for founders to invite any registered user as co-founder.
-- The user is added to the group directly with role 'co_founder'.
-- If they're already a member, their role is upgraded to 'co_founder'.
-- Only the group founder can call this.

CREATE OR REPLACE FUNCTION invite_co_founder(
  p_group_id UUID,
  p_target_user_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor_id UUID;
  v_actor_role TEXT;
  v_existing_member_id UUID;
  v_existing_role TEXT;
  v_new_member_id UUID;
  v_target_exists BOOLEAN;
BEGIN
  -- 1. Authenticate
  v_actor_id := auth.uid();
  IF v_actor_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'NOT_AUTHENTICATED');
  END IF;

  -- 2. Actor must be the founder of this group
  SELECT role INTO v_actor_role
  FROM group_members
  WHERE group_id = p_group_id AND user_id = v_actor_id;

  IF v_actor_role IS NULL OR v_actor_role != 'founder' THEN
    RETURN jsonb_build_object('success', false, 'error', 'ONLY_FOUNDER');
  END IF;

  -- 3. Target user must exist in profiles
  SELECT EXISTS(SELECT 1 FROM profiles WHERE id = p_target_user_id) INTO v_target_exists;
  IF NOT v_target_exists THEN
    RETURN jsonb_build_object('success', false, 'error', 'USER_NOT_FOUND');
  END IF;

  -- 4. Cannot invite yourself
  IF p_target_user_id = v_actor_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'CANNOT_INVITE_SELF');
  END IF;

  -- 5. Check if already a member
  SELECT id, role INTO v_existing_member_id, v_existing_role
  FROM group_members
  WHERE group_id = p_group_id AND user_id = p_target_user_id;

  IF v_existing_member_id IS NOT NULL THEN
    -- Already a co_founder or founder? No-op
    IF v_existing_role IN ('founder', 'co_founder') THEN
      RETURN jsonb_build_object('success', false, 'error', 'ALREADY_CO_FOUNDER');
    END IF;

    -- Upgrade existing member to co_founder
    UPDATE group_members
    SET role = 'co_founder'
    WHERE id = v_existing_member_id;

    RETURN jsonb_build_object(
      'success', true,
      'action', 'promoted',
      'member_id', v_existing_member_id,
      'old_role', v_existing_role
    );
  END IF;

  -- 6. Insert as new co_founder member
  INSERT INTO group_members (group_id, user_id, role)
  VALUES (p_group_id, p_target_user_id, 'co_founder')
  RETURNING id INTO v_new_member_id;

  -- Also auto-follow the group
  INSERT INTO follows (follower_id, target_type, target_id)
  VALUES (p_target_user_id, 'group', p_group_id)
  ON CONFLICT (follower_id, target_type, target_id) DO NOTHING;

  RETURN jsonb_build_object(
    'success', true,
    'action', 'invited',
    'member_id', v_new_member_id
  );
END;
$$;

GRANT EXECUTE ON FUNCTION invite_co_founder(UUID, UUID) TO authenticated;

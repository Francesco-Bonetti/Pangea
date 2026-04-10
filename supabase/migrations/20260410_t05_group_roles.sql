-- ============================================
-- T05 — Group Roles: 10 roles + permission enforcement
-- Migration: 2026-04-10
-- ============================================
-- The group_members.role column is already TEXT with default 'member'.
-- This migration adds a CHECK constraint for the 10 valid roles
-- and creates an RPC for server-side role assignment with hierarchy checks.

-- ── 1. Add CHECK constraint on role column ──
-- Drop existing constraint if any (idempotent)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.constraint_column_usage
    WHERE table_name = 'group_members' AND constraint_name = 'group_members_role_check'
  ) THEN
    ALTER TABLE group_members DROP CONSTRAINT group_members_role_check;
  END IF;
END $$;

ALTER TABLE group_members
  ADD CONSTRAINT group_members_role_check
  CHECK (role IN (
    'founder', 'co_founder', 'president', 'vice_president',
    'admin', 'moderator', 'secretary', 'treasurer',
    'member', 'observer'
  ));

-- ── 2. RPC: change_group_member_role ──
-- Server-side enforcement of role hierarchy.
-- Rules:
--   1. Actor must be a member of the group
--   2. Actor must have assign_roles capability (founder, co_founder, president, admin)
--   3. Actor cannot change a member at or above their own level
--   4. Actor cannot assign a role at or above their own level
--   5. 'founder' role cannot be assigned via this RPC
--   6. 'co_founder' can only be assigned by founder

CREATE OR REPLACE FUNCTION change_group_member_role(
  p_group_id UUID,
  p_target_member_id UUID,
  p_new_role TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor_id UUID;
  v_actor_role TEXT;
  v_target_role TEXT;
  v_actor_weight INT;
  v_target_weight INT;
  v_new_weight INT;
  v_role_weights JSONB := '{
    "founder": 0, "co_founder": 1, "president": 2, "vice_president": 3,
    "admin": 4, "moderator": 5, "secretary": 6, "treasurer": 7,
    "member": 8, "observer": 9
  }'::JSONB;
  v_can_assign TEXT[] := ARRAY['founder', 'co_founder', 'president', 'admin'];
BEGIN
  -- Get actor
  v_actor_id := auth.uid();
  IF v_actor_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'NOT_AUTHENTICATED');
  END IF;

  -- Validate new role
  IF NOT (v_role_weights ? p_new_role) THEN
    RETURN jsonb_build_object('success', false, 'error', 'INVALID_ROLE');
  END IF;

  -- Get actor's role in this group
  SELECT role INTO v_actor_role
  FROM group_members
  WHERE group_id = p_group_id AND user_id = v_actor_id;

  IF v_actor_role IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'NOT_A_MEMBER');
  END IF;

  -- Check actor has assign_roles capability
  IF NOT (v_actor_role = ANY(v_can_assign)) THEN
    RETURN jsonb_build_object('success', false, 'error', 'NO_PERMISSION');
  END IF;

  -- Get target's current role
  SELECT role INTO v_target_role
  FROM group_members
  WHERE id = p_target_member_id AND group_id = p_group_id;

  IF v_target_role IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'TARGET_NOT_FOUND');
  END IF;

  -- Get weights
  v_actor_weight := (v_role_weights ->> v_actor_role)::INT;
  v_target_weight := (v_role_weights ->> v_target_role)::INT;
  v_new_weight := (v_role_weights ->> p_new_role)::INT;

  -- Cannot touch someone at or above your level
  IF v_target_weight <= v_actor_weight THEN
    RETURN jsonb_build_object('success', false, 'error', 'TARGET_OUTRANKS_YOU');
  END IF;

  -- Cannot assign founder
  IF p_new_role = 'founder' THEN
    RETURN jsonb_build_object('success', false, 'error', 'CANNOT_ASSIGN_FOUNDER');
  END IF;

  -- Co-founder only assignable by founder
  IF p_new_role = 'co_founder' AND v_actor_role != 'founder' THEN
    RETURN jsonb_build_object('success', false, 'error', 'ONLY_FOUNDER_CAN_ASSIGN_COFOUNDER');
  END IF;

  -- Cannot assign role at or above your own level
  IF v_new_weight <= v_actor_weight THEN
    RETURN jsonb_build_object('success', false, 'error', 'CANNOT_ASSIGN_HIGHER_ROLE');
  END IF;

  -- All checks passed — update
  UPDATE group_members
  SET role = p_new_role
  WHERE id = p_target_member_id AND group_id = p_group_id;

  RETURN jsonb_build_object(
    'success', true,
    'member_id', p_target_member_id,
    'old_role', v_target_role,
    'new_role', p_new_role
  );
END;
$$;

-- ── 3. RPC: remove_group_member ──
-- Server-side enforcement: cannot remove someone at or above your level.
CREATE OR REPLACE FUNCTION remove_group_member(
  p_group_id UUID,
  p_target_member_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor_id UUID;
  v_actor_role TEXT;
  v_target_role TEXT;
  v_actor_weight INT;
  v_target_weight INT;
  v_role_weights JSONB := '{
    "founder": 0, "co_founder": 1, "president": 2, "vice_president": 3,
    "admin": 4, "moderator": 5, "secretary": 6, "treasurer": 7,
    "member": 8, "observer": 9
  }'::JSONB;
  v_can_kick TEXT[] := ARRAY['founder', 'co_founder', 'president', 'vice_president', 'admin', 'moderator'];
BEGIN
  v_actor_id := auth.uid();
  IF v_actor_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'NOT_AUTHENTICATED');
  END IF;

  SELECT role INTO v_actor_role
  FROM group_members
  WHERE group_id = p_group_id AND user_id = v_actor_id;

  IF v_actor_role IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'NOT_A_MEMBER');
  END IF;

  IF NOT (v_actor_role = ANY(v_can_kick)) THEN
    RETURN jsonb_build_object('success', false, 'error', 'NO_PERMISSION');
  END IF;

  SELECT role INTO v_target_role
  FROM group_members
  WHERE id = p_target_member_id AND group_id = p_group_id;

  IF v_target_role IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'TARGET_NOT_FOUND');
  END IF;

  v_actor_weight := (v_role_weights ->> v_actor_role)::INT;
  v_target_weight := (v_role_weights ->> v_target_role)::INT;

  -- Cannot remove someone at or above your level
  IF v_target_weight <= v_actor_weight THEN
    RETURN jsonb_build_object('success', false, 'error', 'TARGET_OUTRANKS_YOU');
  END IF;

  -- Cannot remove founder or co-founder
  IF v_target_role IN ('founder', 'co_founder') THEN
    RETURN jsonb_build_object('success', false, 'error', 'CANNOT_REMOVE_FOUNDER');
  END IF;

  DELETE FROM group_members
  WHERE id = p_target_member_id AND group_id = p_group_id;

  -- Also remove follow
  DELETE FROM follows
  WHERE follower_id = (
    SELECT user_id FROM group_members WHERE id = p_target_member_id
  ) AND target_type = 'group' AND target_id = p_group_id;

  RETURN jsonb_build_object(
    'success', true,
    'removed_member_id', p_target_member_id,
    'removed_role', v_target_role
  );
END;
$$;

-- ── 4. Grant execute to authenticated users ──
GRANT EXECUTE ON FUNCTION change_group_member_role(UUID, UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION remove_group_member(UUID, UUID) TO authenticated;

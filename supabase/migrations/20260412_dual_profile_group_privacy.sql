-- ============================================
-- DUAL-PROFILE (Art. 2.4) + GROUP-PRIVACY (Art. 4.4)
-- ============================================

-- ── DUAL PROFILE ──────────────────────────────

-- Add public_profile_active to profiles (default false = private by default)
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS public_profile_active BOOLEAN NOT NULL DEFAULT false;

-- Add public profile settings to privacy_settings
-- These are the settings that apply ONLY to the public profile
ALTER TABLE privacy_settings
  ADD COLUMN IF NOT EXISTS public_display_name TEXT,
  ADD COLUMN IF NOT EXISTS public_show_bio BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS public_show_email BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS public_show_activity BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS public_show_delegations BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS public_show_group_membership BOOLEAN NOT NULL DEFAULT true;

-- RPC: activate_public_profile
-- Called when a citizen accepts a delegation or becomes a group leader
CREATE OR REPLACE FUNCTION activate_public_profile(p_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE profiles
  SET public_profile_active = true
  WHERE id = p_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Profile not found';
  END IF;
END;
$$;

-- RPC: deactivate_public_profile
-- Citizen can deactivate, but only if they have no active delegations received
CREATE OR REPLACE FUNCTION deactivate_public_profile(p_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_active_delegations INT;
BEGIN
  -- Check if user has active delegations as delegate
  SELECT COUNT(*) INTO v_active_delegations
  FROM delegations
  WHERE delegate_id = p_user_id
    AND status = 'active';

  IF v_active_delegations > 0 THEN
    RAISE EXCEPTION 'CANNOT_DEACTIVATE_WITH_DELEGATIONS';
  END IF;

  -- Check if user is a leader (founder/co_founder/president) of any group
  -- that currently holds delegations
  -- For now, just check if they hold any leadership role
  -- The full check will be in DELEGATION-CORE

  UPDATE profiles
  SET public_profile_active = false
  WHERE id = p_user_id;
END;
$$;

-- RPC: get_display_profile (updated to be dual-profile aware)
CREATE OR REPLACE FUNCTION get_display_profile(
  p_target_user_id UUID,
  p_viewer_user_id UUID DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile RECORD;
  v_privacy RECORD;
  v_is_self BOOLEAN;
  v_result JSON;
BEGIN
  v_is_self := (p_viewer_user_id IS NOT NULL AND p_viewer_user_id = p_target_user_id);

  SELECT * INTO v_profile FROM profiles WHERE id = p_target_user_id;
  SELECT * INTO v_privacy FROM privacy_settings WHERE user_id = p_target_user_id;

  IF v_profile IS NULL THEN
    RETURN json_build_object('id', p_target_user_id, 'is_private', true);
  END IF;

  -- Self always sees everything
  IF v_is_self THEN
    RETURN json_build_object(
      'id', v_profile.id,
      'full_name', v_profile.full_name,
      'display_name', COALESCE(v_privacy.display_name, NULL),
      'bio', v_profile.bio,
      'role', v_profile.role,
      'user_code', v_profile.user_code,
      'created_at', v_profile.created_at,
      'public_profile_active', v_profile.public_profile_active,
      'show_activity', true,
      'show_delegations', true,
      'show_group_membership', true,
      'dm_policy', COALESCE(v_privacy.dm_policy, 'everyone'),
      'allow_mentions', COALESCE(v_privacy.allow_mentions, true),
      'is_private', false,
      'is_restricted', false
    );
  END IF;

  -- Private profile (visibility = private)
  IF v_privacy.profile_visibility = 'private' THEN
    RETURN json_build_object(
      'id', v_profile.id,
      'display_name', COALESCE(v_privacy.display_name, NULL),
      'role', v_profile.role,
      'is_private', true,
      'is_restricted', false,
      'public_profile_active', v_profile.public_profile_active,
      'dm_policy', COALESCE(v_privacy.dm_policy, 'nobody')
    );
  END IF;

  -- Registered only
  IF v_privacy.profile_visibility = 'registered_only' AND p_viewer_user_id IS NULL THEN
    RETURN json_build_object(
      'id', v_profile.id,
      'role', v_profile.role,
      'is_private', false,
      'is_restricted', true,
      'public_profile_active', v_profile.public_profile_active
    );
  END IF;

  -- Public or registered viewer: decide which profile to show
  -- If public_profile_active, show public profile fields
  -- Otherwise, use standard privacy settings
  RETURN json_build_object(
    'id', v_profile.id,
    'full_name', CASE WHEN COALESCE(v_privacy.show_full_name, true) THEN v_profile.full_name ELSE NULL END,
    'display_name', CASE
      WHEN v_profile.public_profile_active AND v_privacy.public_display_name IS NOT NULL
      THEN v_privacy.public_display_name
      ELSE v_privacy.display_name
    END,
    'bio', CASE WHEN COALESCE(v_privacy.show_bio, true) THEN v_profile.bio ELSE NULL END,
    'role', v_profile.role,
    'user_code', CASE WHEN COALESCE(v_privacy.show_user_code, true) THEN v_profile.user_code ELSE NULL END,
    'created_at', CASE WHEN COALESCE(v_privacy.show_join_date, true) THEN v_profile.created_at ELSE NULL END,
    'public_profile_active', v_profile.public_profile_active,
    'show_activity', COALESCE(
      CASE WHEN v_profile.public_profile_active THEN v_privacy.public_show_activity ELSE v_privacy.show_activity END,
      true
    ),
    'show_delegations', COALESCE(
      CASE WHEN v_profile.public_profile_active THEN v_privacy.public_show_delegations ELSE v_privacy.show_delegations END,
      true
    ),
    'show_group_membership', COALESCE(
      CASE WHEN v_profile.public_profile_active THEN v_privacy.public_show_group_membership ELSE v_privacy.show_group_membership END,
      true
    ),
    'dm_policy', COALESCE(v_privacy.dm_policy, 'everyone'),
    'allow_mentions', COALESCE(v_privacy.allow_mentions, true),
    'is_private', false,
    'is_restricted', false
  );
END;
$$;

-- ── GROUP PRIVACY (Art. 4.4) ──────────────────

-- Join requests table for private groups
CREATE TABLE IF NOT EXISTS group_join_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  message TEXT, -- optional message from the requester
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by UUID REFERENCES profiles(id),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(group_id, user_id) -- one request per user per group
);

-- RLS for group_join_requests
ALTER TABLE group_join_requests ENABLE ROW LEVEL SECURITY;

-- Users can see their own requests
CREATE POLICY "Users see own requests"
  ON group_join_requests FOR SELECT
  USING (user_id = auth.uid());

-- Group admins/founders can see requests for their groups
CREATE POLICY "Group admins see requests"
  ON group_join_requests FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM group_members gm
      WHERE gm.group_id = group_join_requests.group_id
        AND gm.user_id = auth.uid()
        AND gm.role IN ('founder', 'co_founder', 'president', 'admin', 'moderator')
    )
  );

-- Users can insert their own requests
CREATE POLICY "Users can request to join"
  ON group_join_requests FOR INSERT
  WITH CHECK (user_id = auth.uid() AND status = 'pending');

-- Admins can update requests (approve/reject)
CREATE POLICY "Admins can review requests"
  ON group_join_requests FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM group_members gm
      WHERE gm.group_id = group_join_requests.group_id
        AND gm.user_id = auth.uid()
        AND gm.role IN ('founder', 'co_founder', 'president', 'admin', 'moderator')
    )
  );

-- RPC: request_group_join
CREATE OR REPLACE FUNCTION request_group_join(
  p_group_id UUID,
  p_message TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_group RECORD;
  v_existing RECORD;
  v_request_id UUID;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'NOT_AUTHENTICATED';
  END IF;

  -- Get group and check it exists
  SELECT * INTO v_group FROM groups WHERE id = p_group_id;
  IF v_group IS NULL THEN
    RAISE EXCEPTION 'GROUP_NOT_FOUND';
  END IF;

  -- Check group requires approval
  IF (v_group.settings->>'join_policy') NOT IN ('approval', 'invite_only') THEN
    RAISE EXCEPTION 'GROUP_IS_OPEN';
  END IF;

  -- Check not already a member
  IF EXISTS (
    SELECT 1 FROM group_members
    WHERE group_id = p_group_id AND user_id = v_user_id
  ) THEN
    RAISE EXCEPTION 'ALREADY_MEMBER';
  END IF;

  -- Check no pending request exists
  SELECT * INTO v_existing FROM group_join_requests
  WHERE group_id = p_group_id AND user_id = v_user_id AND status = 'pending';

  IF v_existing IS NOT NULL THEN
    RAISE EXCEPTION 'REQUEST_ALREADY_PENDING';
  END IF;

  -- Delete any previous rejected request (allow re-request)
  DELETE FROM group_join_requests
  WHERE group_id = p_group_id AND user_id = v_user_id AND status = 'rejected';

  -- Create request
  INSERT INTO group_join_requests (group_id, user_id, message)
  VALUES (p_group_id, v_user_id, p_message)
  RETURNING id INTO v_request_id;

  RETURN v_request_id;
END;
$$;

-- RPC: review_group_join_request
CREATE OR REPLACE FUNCTION review_group_join_request(
  p_request_id UUID,
  p_decision TEXT -- 'approved' or 'rejected'
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_request RECORD;
  v_has_permission BOOLEAN;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'NOT_AUTHENTICATED';
  END IF;

  IF p_decision NOT IN ('approved', 'rejected') THEN
    RAISE EXCEPTION 'INVALID_DECISION';
  END IF;

  -- Get request
  SELECT * INTO v_request FROM group_join_requests
  WHERE id = p_request_id AND status = 'pending';

  IF v_request IS NULL THEN
    RAISE EXCEPTION 'REQUEST_NOT_FOUND';
  END IF;

  -- Check reviewer has permission (member with approve_members permission)
  SELECT EXISTS (
    SELECT 1 FROM group_members gm
    WHERE gm.group_id = v_request.group_id
      AND gm.user_id = v_user_id
      AND gm.role IN ('founder', 'co_founder', 'president', 'admin', 'moderator')
  ) INTO v_has_permission;

  IF NOT v_has_permission THEN
    RAISE EXCEPTION 'NO_PERMISSION';
  END IF;

  -- Update request
  UPDATE group_join_requests
  SET status = p_decision,
      reviewed_by = v_user_id,
      reviewed_at = now()
  WHERE id = p_request_id;

  -- If approved, add as member
  IF p_decision = 'approved' THEN
    INSERT INTO group_members (group_id, user_id, role)
    VALUES (v_request.group_id, v_request.user_id, 'member')
    ON CONFLICT (group_id, user_id) DO NOTHING;
  END IF;
END;
$$;

-- RPC: get_group_join_requests (for admins)
CREATE OR REPLACE FUNCTION get_group_join_requests(p_group_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_has_permission BOOLEAN;
BEGIN
  -- Check permission
  SELECT EXISTS (
    SELECT 1 FROM group_members gm
    WHERE gm.group_id = p_group_id
      AND gm.user_id = v_user_id
      AND gm.role IN ('founder', 'co_founder', 'president', 'admin', 'moderator')
  ) INTO v_has_permission;

  IF NOT v_has_permission THEN
    RAISE EXCEPTION 'NO_PERMISSION';
  END IF;

  RETURN (
    SELECT COALESCE(json_agg(row_to_json(r)), '[]'::json)
    FROM (
      SELECT
        gjr.id,
        gjr.user_id,
        gjr.message,
        gjr.status,
        gjr.created_at,
        p.full_name,
        p.user_code,
        ps.display_name
      FROM group_join_requests gjr
      JOIN profiles p ON p.id = gjr.user_id
      LEFT JOIN privacy_settings ps ON ps.user_id = gjr.user_id
      WHERE gjr.group_id = p_group_id
        AND gjr.status = 'pending'
      ORDER BY gjr.created_at ASC
    ) r
  );
END;
$$;

-- RLS for groups: enforce private group visibility
-- Private groups should not show their details to non-members
-- Note: existing RLS should already handle some of this.
-- We add a specific policy for private group content hiding.

-- RLS on group_members: hide members of private groups from non-members
-- (only if group visibility is 'private')
DO $$
BEGIN
  -- Drop existing select policy if it exists, then recreate
  DROP POLICY IF EXISTS "Members of private groups hidden" ON group_members;
END;
$$;

-- Note: We handle private group visibility in the application layer
-- (GroupCard, group detail page) rather than pure RLS, because
-- the group list needs to show that a private group EXISTS (name + description)
-- but hide its members and activity. Pure RLS would hide the group entirely.

-- Ensure Pangea root cannot be made private (enforced via locked_settings in T10)
-- This is already handled: Pangea root has visibility locked to 'public'

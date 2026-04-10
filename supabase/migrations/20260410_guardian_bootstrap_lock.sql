-- ============================================
-- GUARDIAN ACCOUNT + BOOTSTRAP LOCK (T03)
-- Date: 2026-04-10
-- Applied via Supabase MCP
-- ============================================
-- Guardian: transitory super-admin, protects constitution.
-- Bootstrap Lock: laws immutable until N verified T2 citizens.
-- Guardian sunset: loses unilateral powers at 1000 T2 citizens.

-- 1. profiles: is_guardian + guardian_key_hash
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_guardian boolean NOT NULL DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS guardian_key_hash text;
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_single_guardian ON profiles (is_guardian) WHERE is_guardian = true;
UPDATE profiles SET is_guardian = true WHERE id = 'c612b821-1345-4f7b-9ac0-85dc3a9b0e52';

-- 2. guardian_actions audit trail
CREATE TABLE IF NOT EXISTS guardian_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  guardian_id uuid NOT NULL REFERENCES profiles(id),
  action_type text NOT NULL,
  target_entity_type text,
  target_entity_id uuid,
  reason text NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_guardian_actions_created ON guardian_actions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_guardian_actions_type ON guardian_actions(action_type);
ALTER TABLE guardian_actions ENABLE ROW LEVEL SECURITY;

-- 3. laws: bootstrap_lock columns
ALTER TABLE laws ADD COLUMN IF NOT EXISTS bootstrap_lock_threshold integer;
ALTER TABLE laws ADD COLUMN IF NOT EXISTS lock_category text;
ALTER TABLE laws ADD CONSTRAINT laws_lock_category_check
  CHECK (lock_category IS NULL OR lock_category IN ('reinforced', 'structural', 'ordinary'));

-- 4. system_config entries
INSERT INTO system_config (key, value, description) VALUES
  ('guardian_sunset_threshold', '1000', 'T2 citizens needed for guardian sunset'),
  ('guardian_active', 'true', 'Whether guardian role is active')
ON CONFLICT (key) DO NOTHING;

-- 5. Helper functions
CREATE OR REPLACE FUNCTION public.is_guardian(p_user_id uuid) RETURNS boolean
LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM profiles WHERE id = p_user_id AND is_guardian = true);
$$;

CREATE OR REPLACE FUNCTION public.is_guardian_active() RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public AS $$
DECLARE v_threshold integer; v_t2_count integer; v_active boolean;
BEGIN
  SELECT (value = 'true') INTO v_active FROM system_config WHERE key = 'guardian_active';
  IF NOT COALESCE(v_active, true) THEN RETURN false; END IF;
  SELECT value::integer INTO v_threshold FROM system_config WHERE key = 'guardian_sunset_threshold';
  SELECT COUNT(*) INTO v_t2_count FROM profiles WHERE identity_tier >= 2;
  RETURN v_t2_count < COALESCE(v_threshold, 1000);
END; $$;

CREATE OR REPLACE FUNCTION public.count_verified_citizens() RETURNS integer
LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public AS $$
  SELECT COUNT(*)::integer FROM profiles WHERE identity_tier >= 2;
$$;

CREATE OR REPLACE FUNCTION public.is_law_bootstrap_locked(p_law_id uuid) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public AS $$
DECLARE v_threshold integer; v_t2_count integer;
BEGIN
  SELECT bootstrap_lock_threshold INTO v_threshold FROM laws WHERE id = p_law_id;
  IF v_threshold IS NULL THEN RETURN false; END IF;
  SELECT COUNT(*)::integer INTO v_t2_count FROM profiles WHERE identity_tier >= 2;
  RETURN v_t2_count < v_threshold;
END; $$;

-- 6. RLS policies
CREATE POLICY "Guardian actions readable by T2+" ON guardian_actions FOR SELECT TO authenticated
  USING (has_min_tier(2::smallint));
CREATE POLICY "Only guardian can insert actions" ON guardian_actions FOR INSERT TO authenticated
  WITH CHECK (guardian_id = auth.uid() AND is_guardian(auth.uid()));
CREATE POLICY "Bootstrap locked laws cannot be modified" ON laws FOR UPDATE TO authenticated
  USING (NOT is_law_bootstrap_locked(id) OR is_guardian(auth.uid()));

-- 7. Guardian RPCs
CREATE OR REPLACE FUNCTION public.guardian_set_bootstrap_lock(p_law_id uuid, p_threshold integer, p_lock_category text, p_reason text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_gid uuid := auth.uid();
BEGIN
  IF NOT is_guardian(v_gid) THEN RETURN '{"success":false,"error":"NOT_GUARDIAN"}'::jsonb; END IF;
  IF NOT is_guardian_active() THEN RETURN '{"success":false,"error":"GUARDIAN_SUNSET"}'::jsonb; END IF;
  UPDATE laws SET bootstrap_lock_threshold = p_threshold, lock_category = p_lock_category WHERE id = p_law_id;
  INSERT INTO guardian_actions (guardian_id, action_type, target_entity_type, target_entity_id, reason, metadata)
  VALUES (v_gid, 'set_bootstrap_lock', 'law', p_law_id, p_reason, jsonb_build_object('threshold', p_threshold, 'lock_category', p_lock_category));
  RETURN '{"success":true}'::jsonb;
END; $$;

CREATE OR REPLACE FUNCTION public.guardian_remove_bootstrap_lock(p_law_id uuid, p_reason text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_gid uuid := auth.uid(); v_old_t integer; v_old_c text;
BEGIN
  IF NOT is_guardian(v_gid) THEN RETURN '{"success":false,"error":"NOT_GUARDIAN"}'::jsonb; END IF;
  IF NOT is_guardian_active() THEN RETURN '{"success":false,"error":"GUARDIAN_SUNSET"}'::jsonb; END IF;
  SELECT bootstrap_lock_threshold, lock_category INTO v_old_t, v_old_c FROM laws WHERE id = p_law_id;
  UPDATE laws SET bootstrap_lock_threshold = NULL, lock_category = NULL WHERE id = p_law_id;
  INSERT INTO guardian_actions (guardian_id, action_type, target_entity_type, target_entity_id, reason, metadata)
  VALUES (v_gid, 'remove_bootstrap_lock', 'law', p_law_id, p_reason, jsonb_build_object('old_threshold', v_old_t, 'old_category', v_old_c));
  RETURN '{"success":true}'::jsonb;
END; $$;

CREATE OR REPLACE FUNCTION public.guardian_degrade_admin(p_target_user_id uuid, p_reason text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_gid uuid := auth.uid(); v_old_role text;
BEGIN
  IF NOT is_guardian(v_gid) THEN RETURN '{"success":false,"error":"NOT_GUARDIAN"}'::jsonb; END IF;
  IF NOT is_guardian_active() THEN RETURN '{"success":false,"error":"GUARDIAN_SUNSET"}'::jsonb; END IF;
  IF p_target_user_id = v_gid THEN RETURN '{"success":false,"error":"CANNOT_DEGRADE_SELF"}'::jsonb; END IF;
  SELECT role INTO v_old_role FROM profiles WHERE id = p_target_user_id;
  UPDATE profiles SET role = 'citizen' WHERE id = p_target_user_id AND is_guardian = false;
  INSERT INTO guardian_actions (guardian_id, action_type, target_entity_type, target_entity_id, reason, metadata)
  VALUES (v_gid, 'degrade_admin', 'profile', p_target_user_id, p_reason, jsonb_build_object('old_role', v_old_role, 'new_role', 'citizen'));
  RETURN jsonb_build_object('success', true, 'old_role', v_old_role);
END; $$;

CREATE OR REPLACE FUNCTION public.guardian_emergency_freeze(p_freeze boolean, p_reason text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_gid uuid := auth.uid();
BEGIN
  IF NOT is_guardian(v_gid) THEN RETURN '{"success":false,"error":"NOT_GUARDIAN"}'::jsonb; END IF;
  IF NOT is_guardian_active() THEN RETURN '{"success":false,"error":"GUARDIAN_SUNSET"}'::jsonb; END IF;
  INSERT INTO system_config (key, value, description) VALUES ('emergency_freeze', p_freeze::text, 'Emergency freeze')
  ON CONFLICT (key) DO UPDATE SET value = p_freeze::text;
  INSERT INTO guardian_actions (guardian_id, action_type, target_entity_type, target_entity_id, reason, metadata)
  VALUES (v_gid, 'emergency_freeze', 'system', NULL, p_reason, jsonb_build_object('freeze', p_freeze));
  RETURN jsonb_build_object('success', true, 'freeze_active', p_freeze);
END; $$;

CREATE OR REPLACE FUNCTION public.get_guardian_status()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public AS $$
DECLARE v_t2 integer; v_thr integer; v_active boolean; v_name text; v_freeze boolean;
BEGIN
  SELECT COUNT(*)::integer INTO v_t2 FROM profiles WHERE identity_tier >= 2;
  SELECT value::integer INTO v_thr FROM system_config WHERE key = 'guardian_sunset_threshold';
  v_active := is_guardian_active();
  SELECT full_name INTO v_name FROM profiles WHERE is_guardian = true LIMIT 1;
  SELECT (value = 'true') INTO v_freeze FROM system_config WHERE key = 'emergency_freeze';
  RETURN jsonb_build_object(
    'is_active', v_active, 'guardian_name', v_name, 'verified_citizens', v_t2,
    'sunset_threshold', COALESCE(v_thr, 1000), 'progress_pct', ROUND((v_t2::numeric / COALESCE(v_thr, 1000)) * 100, 1),
    'emergency_freeze', COALESCE(v_freeze, false));
END; $$;

-- 8. Protection triggers
CREATE OR REPLACE FUNCTION public.protect_guardian_profile() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.is_guardian = true THEN RAISE EXCEPTION 'Cannot delete guardian account'; END IF;
  RETURN OLD;
END; $$;
DROP TRIGGER IF EXISTS trg_protect_guardian_delete ON profiles;
CREATE TRIGGER trg_protect_guardian_delete BEFORE DELETE ON profiles FOR EACH ROW EXECUTE FUNCTION protect_guardian_profile();

CREATE OR REPLACE FUNCTION public.protect_guardian_role() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.is_guardian = true THEN
    IF NEW.is_guardian = false THEN RAISE EXCEPTION 'Cannot remove guardian status'; END IF;
    IF NEW.role <> OLD.role AND NEW.role <> 'admin' THEN RAISE EXCEPTION 'Cannot degrade guardian role'; END IF;
  END IF;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_protect_guardian_role ON profiles;
CREATE TRIGGER trg_protect_guardian_role BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION protect_guardian_role();

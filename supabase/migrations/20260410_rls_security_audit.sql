-- ============================================
-- RLS SECURITY AUDIT FIXES (H-05)
-- Date: 2026-04-10
-- Applied via Supabase MCP, saved here for reference
-- ============================================

-- 1. CRITICAL: Remove broken "Laws are editable by admin" ALL policy
--    BUG: checked user exists in profiles, NOT admin role
DROP POLICY IF EXISTS "Laws are editable by admin" ON laws;
DROP POLICY IF EXISTS "laws_select_public" ON laws;

-- 2. election_votes: Add missing SELECT policy
CREATE POLICY "Voters can read own election votes"
  ON election_votes FOR SELECT TO authenticated
  USING (voter_id = auth.uid());

-- 3. SECURITY DEFINER helper to avoid self-referencing RLS
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean LANGUAGE sql SECURITY DEFINER STABLE
SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin');
$$;

-- 4. profiles: Fix self-referencing UPDATE policy for admin
DROP POLICY IF EXISTS "Admin può aggiornare ruoli utente" ON profiles;
CREATE POLICY "Admin can update any profile"
  ON profiles FOR UPDATE TO authenticated
  USING (id = auth.uid() OR is_admin())
  WITH CHECK (id = auth.uid() OR is_admin());

-- 5. Tighten INSERT/UPDATE/DELETE roles from {public} to {authenticated}
DROP POLICY IF EXISTS "Voto strettamente personale" ON votes;
CREATE POLICY "Voto strettamente personale"
  ON votes FOR INSERT TO authenticated
  WITH CHECK (voter_id = auth.uid() AND has_min_tier(2::smallint));

DROP POLICY IF EXISTS "Citizens can read their own votes" ON votes;
CREATE POLICY "Citizens can read their own votes"
  ON votes FOR SELECT TO authenticated
  USING (voter_id = auth.uid());

DROP POLICY IF EXISTS "Authenticated users can cast vote" ON election_votes;
CREATE POLICY "Authenticated users can cast election vote"
  ON election_votes FOR INSERT TO authenticated
  WITH CHECK (voter_id = auth.uid() AND has_min_tier(2::smallint));

DROP POLICY IF EXISTS "Users can delete own vote" ON election_votes;
CREATE POLICY "Users can delete own election vote"
  ON election_votes FOR DELETE TO authenticated
  USING (voter_id = auth.uid());

DROP POLICY IF EXISTS "Solo il delegante può creare deleghe" ON delegations;
CREATE POLICY "Only delegator can create delegations"
  ON delegations FOR INSERT TO authenticated
  WITH CHECK (delegator_id = auth.uid() AND has_min_tier(1::smallint));

DROP POLICY IF EXISTS "Delegate can update received delegations" ON delegations;
DROP POLICY IF EXISTS "Delegator can update own delegations" ON delegations;
CREATE POLICY "Delegate can update received delegations"
  ON delegations FOR UPDATE TO authenticated
  USING (delegate_id = auth.uid()) WITH CHECK (delegate_id = auth.uid());
CREATE POLICY "Delegator can update own delegations"
  ON delegations FOR UPDATE TO authenticated
  USING (delegator_id = auth.uid()) WITH CHECK (delegator_id = auth.uid());

-- 6. system_config: Restrict to authenticated + use is_admin()
DROP POLICY IF EXISTS "Anyone can read system config" ON system_config;
CREATE POLICY "Authenticated can read system config"
  ON system_config FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Admins can insert system config" ON system_config;
CREATE POLICY "Admins can insert system config"
  ON system_config FOR INSERT TO authenticated WITH CHECK (is_admin());

DROP POLICY IF EXISTS "Admins can update system config" ON system_config;
CREATE POLICY "Admins can update system config"
  ON system_config FOR UPDATE TO authenticated USING (is_admin());

-- 7. laws: Tighten admin policies + use is_admin()
DROP POLICY IF EXISTS "laws_delete_admin" ON laws;
CREATE POLICY "laws_delete_admin" ON laws FOR DELETE TO authenticated USING (is_admin());

DROP POLICY IF EXISTS "laws_insert_admin" ON laws;
CREATE POLICY "laws_insert_admin" ON laws FOR INSERT TO authenticated WITH CHECK (is_admin());

DROP POLICY IF EXISTS "laws_update_admin" ON laws;
CREATE POLICY "laws_update_admin" ON laws FOR UPDATE TO authenticated USING (is_admin());

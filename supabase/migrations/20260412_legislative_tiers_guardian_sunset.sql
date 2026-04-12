-- ============================================================
-- Phase 5.6: LEGISLATIVE-TIERS (Art. 8.3)
-- Phase 5.7: GUARDIAN-SUNSET 4-phase (Art. 10)
-- Applied: 2026-04-12 via Supabase MCP
-- ============================================================

-- 1) Add tier column to laws (with default)
ALTER TABLE laws ADD COLUMN IF NOT EXISTS tier text NOT NULL DEFAULT 'ordinary'
  CHECK (tier IN ('constitutional', 'core', 'platform', 'ordinary'));

-- 2) Add tier column to proposals (with default)
ALTER TABLE proposals ADD COLUMN IF NOT EXISTS tier text NOT NULL DEFAULT 'ordinary'
  CHECK (tier IN ('constitutional', 'core', 'platform', 'ordinary'));

-- 3) Set tiers on existing LUX constitutional articles
UPDATE laws SET tier = 'constitutional' WHERE id IN (
  'c0000000-0000-0000-0000-000000000001',
  'c1000000-0000-0000-0000-000000000001',
  'c1000000-0000-0000-0000-000000000002',
  'c1000000-0000-0000-0000-000000000003',
  'c2000000-0000-0000-0000-000000000001',
  'c2000000-0000-0000-0000-000000000002',
  'c2000000-0000-0000-0000-000000000003',
  'c2000000-0000-0000-0000-000000000004',
  'c2000000-0000-0000-0000-000000000005',
  'c3000000-0000-0000-0000-000000000001',
  'c3000000-0000-0000-0000-000000000002',
  'c3000000-0000-0000-0000-000000000003',
  'c4000000-0000-0000-0000-000000000001',
  'c4000000-0000-0000-0000-000000000002',
  'c4000000-0000-0000-0000-000000000003',
  'c4000000-0000-0000-0000-000000000004'
);

-- Art. 5 (identity) = core protocol
UPDATE laws SET tier = 'core' WHERE id = 'c2000000-0000-0000-0000-000000000002';
-- Art. 9 (groups) = platform protocol
UPDATE laws SET tier = 'platform' WHERE id = 'c3000000-0000-0000-0000-000000000002';

-- 4) RPC: get_tier_thresholds(tier)
CREATE OR REPLACE FUNCTION get_tier_thresholds(p_tier text)
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER AS $$
BEGIN
  RETURN CASE p_tier
    WHEN 'constitutional' THEN '{"approval_pct":90,"quorum_pct":60,"double_vote":false}'::jsonb
    WHEN 'core'           THEN '{"approval_pct":80,"quorum_pct":50,"double_vote":true}'::jsonb
    WHEN 'platform'       THEN '{"approval_pct":66,"quorum_pct":40,"double_vote":true}'::jsonb
    ELSE                       '{"approval_pct":51,"quorum_pct":30,"double_vote":false}'::jsonb
  END;
END;
$$;

-- 5) Guardian sunset thresholds in system_config
INSERT INTO system_config (key, value) VALUES
  ('guardian_phase1_threshold', '10'),
  ('guardian_phase2_threshold', '100'),
  ('guardian_phase3_threshold', '1000')
ON CONFLICT (key) DO NOTHING;

-- 6) RPC: get_guardian_phase()
CREATE OR REPLACE FUNCTION get_guardian_phase()
RETURNS integer
LANGUAGE plpgsql STABLE SECURITY DEFINER AS $$
DECLARE
  v_t2 integer;
  v_p1 integer;
  v_p2 integer;
  v_p3 integer;
BEGIN
  SELECT count(*)::int INTO v_t2 FROM profiles WHERE identity_tier >= 2;
  SELECT coalesce((SELECT value::int FROM system_config WHERE key = 'guardian_phase1_threshold'), 10) INTO v_p1;
  SELECT coalesce((SELECT value::int FROM system_config WHERE key = 'guardian_phase2_threshold'), 100) INTO v_p2;
  SELECT coalesce((SELECT value::int FROM system_config WHERE key = 'guardian_phase3_threshold'), 1000) INTO v_p3;

  IF v_t2 >= v_p3 THEN RETURN 3;
  ELSIF v_t2 >= v_p2 THEN RETURN 2;
  ELSIF v_t2 >= v_p1 THEN RETURN 1;
  ELSE RETURN 0;
  END IF;
END;
$$;

-- 7) Update get_guardian_status() to include phase info
CREATE OR REPLACE FUNCTION get_guardian_status()
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER AS $$
DECLARE
  v_guardian record;
  v_citizens integer;
  v_threshold integer;
  v_phase integer;
  v_p1 integer;
  v_p2 integer;
  v_freeze boolean;
BEGIN
  SELECT id, full_name, is_guardian INTO v_guardian
    FROM profiles WHERE is_guardian = true LIMIT 1;

  SELECT count(*)::int INTO v_citizens FROM profiles WHERE identity_tier >= 2;

  SELECT coalesce((SELECT value::int FROM system_config WHERE key = 'guardian_phase3_threshold'), 1000) INTO v_threshold;
  SELECT coalesce((SELECT value::int FROM system_config WHERE key = 'guardian_phase1_threshold'), 10) INTO v_p1;
  SELECT coalesce((SELECT value::int FROM system_config WHERE key = 'guardian_phase2_threshold'), 100) INTO v_p2;

  SELECT get_guardian_phase() INTO v_phase;

  SELECT coalesce((SELECT (value::boolean) FROM system_config WHERE key = 'emergency_freeze'), false) INTO v_freeze;

  RETURN jsonb_build_object(
    'is_active', v_phase < 3,
    'guardian_name', coalesce(v_guardian.full_name, 'Guardian'),
    'verified_citizens', v_citizens,
    'sunset_threshold', v_threshold,
    'progress_pct', CASE WHEN v_threshold > 0 THEN least((v_citizens * 100.0 / v_threshold)::int, 100) ELSE 0 END,
    'emergency_freeze', v_freeze,
    'phase', v_phase,
    'phase1_threshold', v_p1,
    'phase2_threshold', v_p2
  );
END;
$$;

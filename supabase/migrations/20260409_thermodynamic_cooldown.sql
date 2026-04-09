-- =============================================
-- DIAMOND EDITION — STEP 2: Thermodynamic Cooldown
-- DE-06: Create user_activity_stats table
-- DE-07: Create system_config table
-- DE-08: RPC get_pangea_cooldown (formula TA)
-- DE-09: RPC check_pangea_access (pre-action gate)
-- DE-10: Quorum Protection (D²=0 if T2+ votes < Qmin)
-- Applied: 2026-04-09
-- =============================================

-- =============================================
-- DE-06: user_activity_stats — Edge table
-- Tracks per-user action counters, timestamps, and strikes
-- =============================================

CREATE TABLE IF NOT EXISTS public.user_activity_stats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action_type text NOT NULL CHECK (action_type IN (
    'proposal_create', 'proposal_vote', 'law_create',
    'discussion_create', 'comment_create', 'election_vote',
    'delegation_create', 'group_create'
  )),
  action_count integer NOT NULL DEFAULT 0,
  last_action_at timestamptz,
  period_start timestamptz NOT NULL DEFAULT date_trunc('day', now()),
  period_action_count integer NOT NULL DEFAULT 0,
  strike_count integer NOT NULL DEFAULT 0,
  last_strike_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT unique_user_action UNIQUE (user_id, action_type),
  CONSTRAINT action_count_positive CHECK (action_count >= 0),
  CONSTRAINT strike_count_positive CHECK (strike_count >= 0)
);

CREATE INDEX IF NOT EXISTS idx_activity_stats_user ON public.user_activity_stats(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_stats_action ON public.user_activity_stats(action_type);
CREATE INDEX IF NOT EXISTS idx_activity_stats_last_action ON public.user_activity_stats(last_action_at);

ALTER TABLE public.user_activity_stats ENABLE ROW LEVEL SECURITY;

-- Users can read their own stats
CREATE POLICY "Users can view own activity stats"
  ON public.user_activity_stats FOR SELECT
  USING (auth.uid() = user_id);

-- Only SECURITY DEFINER functions modify stats (no direct INSERT/UPDATE)

COMMENT ON TABLE public.user_activity_stats IS 'Diamond Edition DE-06: Per-user action counters, timestamps, and strike tracking for Thermodynamic Cooldown.';

-- =============================================
-- DE-07: system_config — Core config table
-- Tunable parameters without deploy
-- =============================================

CREATE TABLE IF NOT EXISTS public.system_config (
  key text PRIMARY KEY,
  value jsonb NOT NULL,
  description text,
  category text NOT NULL DEFAULT 'general' CHECK (category IN (
    'cooldown', 'identity', 'voting', 'staking', 'general'
  )),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id)
);

ALTER TABLE public.system_config ENABLE ROW LEVEL SECURITY;

-- Everyone can read config (public parameters)
CREATE POLICY "Anyone can read system config"
  ON public.system_config FOR SELECT
  USING (true);

-- Only admins can modify (via SECURITY DEFINER or direct admin role check)
CREATE POLICY "Admins can update system config"
  ON public.system_config FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can insert system config"
  ON public.system_config FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );

COMMENT ON TABLE public.system_config IS 'Diamond Edition DE-07: Tunable system parameters for cooldown formula, voting, identity thresholds.';

-- Seed default cooldown parameters
INSERT INTO public.system_config (key, value, description, category) VALUES
  ('cooldown_C',        '5'::jsonb,     'Base constant (seconds)', 'cooldown'),
  ('cooldown_gamma',    '1.5'::jsonb,   'Entropy exponent (γ)', 'cooldown'),
  ('cooldown_beta',     '2.0'::jsonb,   'Dissent weight (β)', 'cooldown'),
  ('cooldown_S_T0',     '10'::jsonb,    'Tier multiplier for T0 (ghost)', 'cooldown'),
  ('cooldown_S_T1',     '3'::jsonb,     'Tier multiplier for T1 (resident)', 'cooldown'),
  ('cooldown_S_T2',     '1'::jsonb,     'Tier multiplier for T2 (citizen)', 'cooldown'),
  ('cooldown_S_T3',     '0.5'::jsonb,   'Tier multiplier for T3 (guarantor)', 'cooldown'),
  ('cooldown_Qmin',     '20'::jsonb,    'Anti-Oligarchy Quorum: min T2+ votes before D² applies', 'cooldown'),
  ('cooldown_period_hours', '24'::jsonb, 'Rolling window for action average (hours)', 'cooldown'),
  ('staking_Cbase_days','7'::jsonb,     'Base cooldown for law creation (days)', 'staking'),
  ('staking_forgiveness_days', '30'::jsonb, 'Days to decay 1 strike', 'staking')
ON CONFLICT (key) DO NOTHING;

-- =============================================
-- DE-08: get_pangea_cooldown RPC
-- Formula: TA = C · e^(1 + (τ/A)^γ) · (1 + β · D²) · S
-- Returns cooldown in seconds
-- =============================================

CREATE OR REPLACE FUNCTION public.get_pangea_cooldown(
  p_user_id uuid,
  p_action_type text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  -- Config params
  v_C        numeric;
  v_gamma    numeric;
  v_beta     numeric;
  v_S        numeric;
  v_Qmin     integer;
  v_period_h integer;
  -- User data
  v_tier     smallint;
  v_stats    record;
  -- Computed
  v_tau      numeric;  -- seconds since last action
  v_A        numeric;  -- average actions per period
  v_D        numeric;  -- dissent ratio (only from T2+)
  v_D2       numeric;  -- D squared (with quorum protection)
  v_t2_votes integer;  -- total T2+ votes on user's content
  v_t2_down  integer;  -- T2+ downvotes on user's content
  v_cooldown numeric;  -- final cooldown seconds
BEGIN
  -- Load config values
  SELECT (value)::numeric INTO v_C FROM system_config WHERE key = 'cooldown_C';
  SELECT (value)::numeric INTO v_gamma FROM system_config WHERE key = 'cooldown_gamma';
  SELECT (value)::numeric INTO v_beta FROM system_config WHERE key = 'cooldown_beta';
  SELECT (value)::numeric INTO v_Qmin FROM system_config WHERE key = 'cooldown_Qmin';
  SELECT (value)::numeric INTO v_period_h FROM system_config WHERE key = 'cooldown_period_hours';

  -- Get user tier
  SELECT identity_tier INTO v_tier FROM profiles WHERE id = p_user_id;
  IF v_tier IS NULL THEN
    RETURN jsonb_build_object('error', 'USER_NOT_FOUND', 'cooldown_seconds', 9999);
  END IF;

  -- Load tier-specific multiplier
  CASE v_tier
    WHEN 0 THEN SELECT (value)::numeric INTO v_S FROM system_config WHERE key = 'cooldown_S_T0';
    WHEN 1 THEN SELECT (value)::numeric INTO v_S FROM system_config WHERE key = 'cooldown_S_T1';
    WHEN 2 THEN SELECT (value)::numeric INTO v_S FROM system_config WHERE key = 'cooldown_S_T2';
    WHEN 3 THEN SELECT (value)::numeric INTO v_S FROM system_config WHERE key = 'cooldown_S_T3';
    ELSE v_S := 10;
  END CASE;

  -- Get or create activity stats
  SELECT * INTO v_stats
  FROM user_activity_stats
  WHERE user_id = p_user_id AND action_type = p_action_type;

  IF v_stats IS NULL THEN
    -- First action of this type: no cooldown
    RETURN jsonb_build_object(
      'cooldown_seconds', 0,
      'tier', v_tier,
      'multiplier', v_S,
      'is_first_action', true
    );
  END IF;

  -- τ = seconds since last action (capped at period to avoid overflow)
  v_tau := EXTRACT(EPOCH FROM (now() - COALESCE(v_stats.last_action_at, now() - interval '1 day')));
  v_tau := GREATEST(v_tau, 1); -- avoid division by zero

  -- A = average actions per period (avoid zero)
  v_A := GREATEST(v_stats.period_action_count, 1);

  -- D = dissent ratio from T2+ votes on user's recent content
  -- For discussions: use discussion_votes from T2+ users
  -- For proposals: use votes from T2+ users
  -- Simplified: count discussion_votes where voter is T2+
  SELECT
    COUNT(*) FILTER (WHERE p.identity_tier >= 2),
    COUNT(*) FILTER (WHERE p.identity_tier >= 2 AND dv.vote_type = 'downvote')
  INTO v_t2_votes, v_t2_down
  FROM discussion_votes dv
  JOIN profiles p ON p.id = dv.user_id
  JOIN discussions d ON d.id = dv.discussion_id
  WHERE d.author_id = p_user_id
    AND d.created_at > now() - (v_period_h || ' hours')::interval;

  -- DE-10: Quorum Protection — D²=0 if T2+ votes < Qmin
  IF v_t2_votes < v_Qmin THEN
    v_D2 := 0;
  ELSE
    v_D := CASE WHEN v_t2_votes > 0
                THEN v_t2_down::numeric / v_t2_votes::numeric
                ELSE 0 END;
    v_D2 := v_D * v_D;
  END IF;

  -- TA = C · e^(1 + (τ/A)^γ) · (1 + β · D²) · S
  -- Note: when τ is large (user waited long), the exponent grows and cooldown grows,
  -- but we INVERT: high frequency → high cooldown. So τ here is the INVERSE:
  -- τ_inv = period_seconds / τ (how "fast" the user is acting)
  DECLARE
    v_tau_inv numeric;
    v_period_seconds numeric;
    v_exponent numeric;
  BEGIN
    v_period_seconds := v_period_h * 3600;
    -- Inversion: if user acts very frequently, tau_inv is high → more cooldown
    v_tau_inv := v_period_seconds / v_tau;

    -- Clamp exponent to avoid numeric overflow
    v_exponent := LEAST(1.0 + power(v_tau_inv / v_A, v_gamma), 20);

    v_cooldown := v_C * exp(v_exponent) * (1 + v_beta * v_D2) * v_S;

    -- Clamp to reasonable range: 0 to 24 hours max
    v_cooldown := GREATEST(0, LEAST(v_cooldown, 86400));

    RETURN jsonb_build_object(
      'cooldown_seconds', round(v_cooldown),
      'tier', v_tier,
      'multiplier', v_S,
      'dissent_d2', round(v_D2::numeric, 4),
      'quorum_met', v_t2_votes >= v_Qmin,
      't2_votes', v_t2_votes,
      'action_count', v_stats.action_count,
      'period_actions', v_stats.period_action_count,
      'is_first_action', false
    );
  END;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_pangea_cooldown TO authenticated;

COMMENT ON FUNCTION public.get_pangea_cooldown IS 'Diamond Edition DE-08: Thermodynamic cooldown formula TA = C·e^(1+(τ/A)^γ)·(1+β·D²)·S';

-- =============================================
-- DE-09: check_pangea_access RPC
-- Pre-action gate: can the user proceed right now?
-- =============================================

CREATE OR REPLACE FUNCTION public.check_pangea_access(
  p_user_id uuid,
  p_action_type text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cooldown jsonb;
  v_wait     numeric;
  v_stats    record;
  v_elapsed  numeric;
  v_tier     smallint;
BEGIN
  -- Get user tier first (for tier-gated actions)
  SELECT identity_tier INTO v_tier FROM profiles WHERE id = p_user_id;
  IF v_tier IS NULL THEN
    RETURN jsonb_build_object(
      'can_proceed', false,
      'reason', 'USER_NOT_FOUND',
      'wait_seconds', 0
    );
  END IF;

  -- Calculate cooldown
  v_cooldown := get_pangea_cooldown(p_user_id, p_action_type);

  -- Check for error
  IF v_cooldown ? 'error' THEN
    RETURN jsonb_build_object(
      'can_proceed', false,
      'reason', v_cooldown->>'error',
      'wait_seconds', 0
    );
  END IF;

  v_wait := (v_cooldown->>'cooldown_seconds')::numeric;

  -- If first action, always allow
  IF (v_cooldown->>'is_first_action')::boolean THEN
    RETURN jsonb_build_object(
      'can_proceed', true,
      'wait_seconds', 0,
      'cooldown', v_cooldown
    );
  END IF;

  -- Check elapsed time since last action
  SELECT last_action_at INTO v_stats
  FROM user_activity_stats
  WHERE user_id = p_user_id AND action_type = p_action_type;

  v_elapsed := EXTRACT(EPOCH FROM (now() - v_stats.last_action_at));

  IF v_elapsed >= v_wait THEN
    RETURN jsonb_build_object(
      'can_proceed', true,
      'wait_seconds', 0,
      'cooldown', v_cooldown
    );
  ELSE
    RETURN jsonb_build_object(
      'can_proceed', false,
      'reason', 'COOLDOWN_ACTIVE',
      'wait_seconds', round(v_wait - v_elapsed),
      'cooldown', v_cooldown
    );
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.check_pangea_access TO authenticated;

COMMENT ON FUNCTION public.check_pangea_access IS 'Diamond Edition DE-09: Pre-action gate, returns can_proceed + wait_seconds.';

-- =============================================
-- Helper: record_user_action
-- Called after a successful action to update stats
-- =============================================

CREATE OR REPLACE FUNCTION public.record_user_action(
  p_user_id uuid,
  p_action_type text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_period_h integer;
BEGIN
  SELECT (value)::integer INTO v_period_h FROM system_config WHERE key = 'cooldown_period_hours';
  v_period_h := COALESCE(v_period_h, 24);

  INSERT INTO user_activity_stats (user_id, action_type, action_count, last_action_at, period_start, period_action_count)
  VALUES (p_user_id, p_action_type, 1, now(), date_trunc('hour', now()), 1)
  ON CONFLICT (user_id, action_type)
  DO UPDATE SET
    action_count = user_activity_stats.action_count + 1,
    last_action_at = now(),
    -- Reset period counter if period has elapsed, otherwise increment
    period_action_count = CASE
      WHEN user_activity_stats.period_start < now() - (v_period_h || ' hours')::interval
      THEN 1
      ELSE user_activity_stats.period_action_count + 1
    END,
    period_start = CASE
      WHEN user_activity_stats.period_start < now() - (v_period_h || ' hours')::interval
      THEN date_trunc('hour', now())
      ELSE user_activity_stats.period_start
    END,
    updated_at = now();
END;
$$;

GRANT EXECUTE ON FUNCTION public.record_user_action TO authenticated;

COMMENT ON FUNCTION public.record_user_action IS 'Diamond Edition: Records a user action and updates activity stats for cooldown calculation.';

-- =============================================
-- Helper: record_user_strike
-- Called when a law is rejected to increment strike
-- =============================================

CREATE OR REPLACE FUNCTION public.record_user_strike(
  p_user_id uuid,
  p_action_type text DEFAULT 'law_create'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_new_strike integer;
BEGIN
  INSERT INTO user_activity_stats (user_id, action_type, strike_count, last_strike_at)
  VALUES (p_user_id, p_action_type, 1, now())
  ON CONFLICT (user_id, action_type)
  DO UPDATE SET
    strike_count = user_activity_stats.strike_count + 1,
    last_strike_at = now(),
    updated_at = now()
  RETURNING strike_count INTO v_new_strike;

  RETURN jsonb_build_object(
    'success', true,
    'strike_count', v_new_strike
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.record_user_strike TO authenticated;

-- =============================================
-- Helper: reset_user_strikes
-- Called when a law is approved → F=0 (full reset)
-- =============================================

CREATE OR REPLACE FUNCTION public.reset_user_strikes(
  p_user_id uuid,
  p_action_type text DEFAULT 'law_create'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE user_activity_stats
  SET strike_count = 0, last_strike_at = NULL, updated_at = now()
  WHERE user_id = p_user_id AND action_type = p_action_type;
END;
$$;

GRANT EXECUTE ON FUNCTION public.reset_user_strikes TO authenticated;

COMMENT ON FUNCTION public.record_user_strike IS 'Diamond Edition: Increment strike count when a law is rejected.';
COMMENT ON FUNCTION public.reset_user_strikes IS 'Diamond Edition: Reset strikes to 0 when a law is approved.';

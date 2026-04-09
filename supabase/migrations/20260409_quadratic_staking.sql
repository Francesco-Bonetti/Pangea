-- =============================================
-- DIAMOND EDITION — STEP 4: Quadratic Staking
-- Proof of Competence — "Staking di Tempo"
--
-- DE-18: First law free for every T2+ user
-- DE-19: Strike system — rejected law → F+1, approved → F=0
-- DE-20: Exponential cooldown Cbase·2^max(0,F-Δt/τ) as time cost
-- DE-21: Off-chain Incubator — draft→100 T2+ upvotes→Free Pass
--
-- Also creates the 3 missing cron RPCs:
--   close_expired_proposals
--   evaluate_curation_markets
--   convert_closed_proposals_to_laws
--
-- Applied: 2026-04-09
-- =============================================

-- ─────────────────────────────────────────────
-- DE-21: Add incubator columns to proposals
-- ─────────────────────────────────────────────

-- incubator_passed: true when draft got 100+ T2+ upvotes → Free Pass
-- incubator_t2_upvotes: cached count of T2+ upvotes (for performance)
ALTER TABLE public.proposals
  ADD COLUMN IF NOT EXISTS incubator_passed boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS incubator_t2_upvotes integer NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.proposals.incubator_passed IS 'DE-21: True if proposal passed off-chain incubator (100+ T2+ upvotes). Grants strike immunity.';
COMMENT ON COLUMN public.proposals.incubator_t2_upvotes IS 'DE-21: Cached count of T2+ citizen upvotes on this proposal during draft/curation phase.';

-- Add staking config for incubator threshold
INSERT INTO public.system_config (key, value, description, category) VALUES
  ('incubator_t2_upvote_threshold', '100'::jsonb, 'T2+ upvotes needed for Free Pass (no strike if rejected)', 'staking'),
  ('staking_first_law_free', 'true'::jsonb, 'DE-18: First law/proposal creation is free (no cooldown) for T2+ users', 'staking')
ON CONFLICT (key) DO NOTHING;

-- ─────────────────────────────────────────────
-- DE-18 + DE-20: Upgrade get_pangea_cooldown v3
-- Adds: first-law-free logic + explicit staking cooldown for law_create
-- ─────────────────────────────────────────────

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
  v_C             numeric;
  v_gamma         numeric;
  v_gamma_action  numeric;
  v_beta          numeric;
  v_S             numeric;
  v_Qmin          integer;
  v_period_h      integer;
  -- Strike decay params
  v_forgive_days  integer;
  v_max_strike_exp integer;
  -- Burst params
  v_burst_window  integer;
  v_burst_thresh  integer;
  v_burst_mult    numeric;
  -- Dynamic Qmin params
  v_qmin_dynamic  boolean;
  v_qmin_ratio    numeric;
  v_qmin_min      integer;
  -- Staking params
  v_Cbase_days    integer;
  v_first_free    boolean;
  -- User data
  v_tier          smallint;
  v_stats         record;
  -- Computed
  v_tau           numeric;  -- seconds since last action
  v_A             numeric;  -- average actions per period
  v_D             numeric;  -- dissent ratio (only from T2+)
  v_D2            numeric;  -- D squared (with quorum protection)
  v_t2_votes      integer;  -- total T2+ votes on user's content
  v_t2_down       integer;  -- T2+ downvotes on user's content
  v_cooldown      numeric;  -- final cooldown seconds
  -- Strike decay computed
  v_effective_strikes integer;
  v_days_since_strike numeric;
  -- Burst computed
  v_burst_count   integer;
  v_burst_active  boolean;
  -- DE-18: first law free
  v_is_first_law  boolean := false;
BEGIN
  -- ===== Load config values =====
  SELECT (value)::numeric INTO v_C FROM system_config WHERE key = 'cooldown_C';
  SELECT (value)::numeric INTO v_gamma FROM system_config WHERE key = 'cooldown_gamma';
  SELECT (value)::numeric INTO v_beta FROM system_config WHERE key = 'cooldown_beta';
  SELECT (value)::numeric INTO v_Qmin FROM system_config WHERE key = 'cooldown_Qmin';
  SELECT (value)::numeric INTO v_period_h FROM system_config WHERE key = 'cooldown_period_hours';
  SELECT (value)::integer INTO v_forgive_days FROM system_config WHERE key = 'staking_forgiveness_days';
  SELECT (value)::integer INTO v_max_strike_exp FROM system_config WHERE key = 'staking_max_strike_exponent';
  SELECT (value)::integer INTO v_burst_window FROM system_config WHERE key = 'cooldown_burst_window_seconds';
  SELECT (value)::integer INTO v_burst_thresh FROM system_config WHERE key = 'cooldown_burst_threshold';
  SELECT (value)::numeric INTO v_burst_mult FROM system_config WHERE key = 'cooldown_burst_multiplier';
  SELECT (value)::boolean INTO v_qmin_dynamic FROM system_config WHERE key = 'cooldown_Qmin_dynamic';
  SELECT (value)::numeric INTO v_qmin_ratio FROM system_config WHERE key = 'cooldown_Qmin_ratio';
  SELECT (value)::integer INTO v_qmin_min FROM system_config WHERE key = 'cooldown_Qmin_min';
  SELECT (value)::integer INTO v_Cbase_days FROM system_config WHERE key = 'staking_Cbase_days';
  SELECT (value)::boolean INTO v_first_free FROM system_config WHERE key = 'staking_first_law_free';

  -- Defaults
  v_forgive_days   := COALESCE(v_forgive_days, 30);
  v_max_strike_exp := COALESCE(v_max_strike_exp, 8);
  v_burst_window   := COALESCE(v_burst_window, 300);
  v_burst_thresh   := COALESCE(v_burst_thresh, 3);
  v_burst_mult     := COALESCE(v_burst_mult, 3.0);
  v_qmin_dynamic   := COALESCE(v_qmin_dynamic, false);
  v_qmin_ratio     := COALESCE(v_qmin_ratio, 0.1);
  v_qmin_min       := COALESCE(v_qmin_min, 5);
  v_Cbase_days     := COALESCE(v_Cbase_days, 7);
  v_first_free     := COALESCE(v_first_free, true);

  -- ===== Adaptive gamma per action_type =====
  SELECT (value)::numeric INTO v_gamma_action
  FROM system_config
  WHERE key = 'cooldown_gamma_' || p_action_type;

  v_gamma := COALESCE(v_gamma_action, v_gamma);

  -- ===== Get user tier =====
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

  -- ===== Get or create activity stats =====
  SELECT * INTO v_stats
  FROM user_activity_stats
  WHERE user_id = p_user_id AND action_type = p_action_type;

  -- ===== DE-18: First law/proposal free for T2+ =====
  IF p_action_type IN ('law_create', 'proposal_create') AND v_tier >= 2 AND v_first_free THEN
    IF v_stats IS NULL OR v_stats.action_count = 0 THEN
      v_is_first_law := true;
      RETURN jsonb_build_object(
        'cooldown_seconds', 0,
        'tier', v_tier,
        'multiplier', v_S,
        'gamma', v_gamma,
        'is_first_action', true,
        'is_first_law_free', true,
        'burst_active', false,
        'effective_strikes', 0,
        'strike_decay_applied', 0,
        'staking_info', jsonb_build_object(
          'type', 'first_free',
          'message', 'Your first law proposal is free — no waiting time!'
        )
      );
    END IF;
  END IF;

  IF v_stats IS NULL THEN
    -- First action of this type (non-law or non-T2): no cooldown
    RETURN jsonb_build_object(
      'cooldown_seconds', 0,
      'tier', v_tier,
      'multiplier', v_S,
      'gamma', v_gamma,
      'is_first_action', true,
      'is_first_law_free', false,
      'burst_active', false,
      'effective_strikes', 0
    );
  END IF;

  -- ===== Strike Decay =====
  IF v_stats.strike_count > 0 AND v_stats.last_strike_at IS NOT NULL THEN
    v_days_since_strike := EXTRACT(EPOCH FROM (now() - v_stats.last_strike_at)) / 86400.0;
    v_effective_strikes := GREATEST(0,
      v_stats.strike_count - floor(v_days_since_strike / v_forgive_days)::integer
    );
    v_effective_strikes := LEAST(v_effective_strikes, v_max_strike_exp);
  ELSE
    v_effective_strikes := 0;
  END IF;

  -- ===== τ = seconds since last action =====
  v_tau := EXTRACT(EPOCH FROM (now() - COALESCE(v_stats.last_action_at, now() - interval '1 day')));
  v_tau := GREATEST(v_tau, 1);

  -- ===== A = average actions per period =====
  v_A := GREATEST(v_stats.period_action_count, 1);

  -- ===== Burst Detection =====
  IF v_stats.burst_action_timestamps IS NOT NULL THEN
    SELECT COUNT(*) INTO v_burst_count
    FROM unnest(v_stats.burst_action_timestamps) AS ts
    WHERE ts > now() - (v_burst_window || ' seconds')::interval;
  ELSE
    v_burst_count := 0;
  END IF;
  v_burst_active := (v_burst_count >= v_burst_thresh);

  -- ===== D = dissent ratio from T2+ votes =====
  SELECT
    COUNT(*) FILTER (WHERE p.identity_tier >= 2),
    COUNT(*) FILTER (WHERE p.identity_tier >= 2 AND dv.vote_type = 'downvote')
  INTO v_t2_votes, v_t2_down
  FROM discussion_votes dv
  JOIN profiles p ON p.id = dv.user_id
  JOIN discussions d ON d.id = dv.discussion_id
  WHERE d.author_id = p_user_id
    AND d.created_at > now() - (v_period_h || ' hours')::interval;

  -- ===== Dynamic Qmin =====
  IF v_qmin_dynamic THEN
    DECLARE
      v_active_t2 integer;
    BEGIN
      v_active_t2 := get_active_t2_count();
      v_Qmin := GREATEST(v_qmin_min, floor(v_active_t2 * v_qmin_ratio)::integer);
    END;
  END IF;

  -- Quorum Protection
  IF v_t2_votes < v_Qmin THEN
    v_D2 := 0;
  ELSE
    v_D := CASE WHEN v_t2_votes > 0
                THEN v_t2_down::numeric / v_t2_votes::numeric
                ELSE 0 END;
    v_D2 := v_D * v_D;
  END IF;

  -- ===== FORMULA =====
  DECLARE
    v_tau_inv numeric;
    v_period_seconds numeric;
    v_exponent numeric;
    v_strike_mult numeric;
    v_burst_factor numeric;
    v_staking_cooldown_days numeric;
    v_staking_info jsonb := '{}'::jsonb;
  BEGIN
    v_period_seconds := v_period_h * 3600;
    v_tau_inv := v_period_seconds / v_tau;

    -- Clamp exponent
    v_exponent := LEAST(1.0 + power(v_tau_inv / v_A, v_gamma), 20);

    -- ===== DE-20: Quadratic Staking as Time =====
    -- For law_create and proposal_create: apply Cbase · 2^effective_strikes as DAYS
    -- This replaces the generic strike_mult with a more explicit staking model
    IF p_action_type IN ('law_create', 'proposal_create') AND v_effective_strikes > 0 THEN
      v_strike_mult := power(2, v_effective_strikes);
      v_staking_cooldown_days := v_Cbase_days * v_strike_mult;
      v_staking_info := jsonb_build_object(
        'type', 'quadratic_staking',
        'base_days', v_Cbase_days,
        'effective_strikes', v_effective_strikes,
        'raw_strikes', v_stats.strike_count,
        'strike_multiplier', v_strike_mult,
        'total_cooldown_days', v_staking_cooldown_days,
        'message', format(
          'Strike penalty: %s days cooldown (%s base × 2^%s strikes). Strikes decay: 1 every %s days.',
          v_staking_cooldown_days, v_Cbase_days, v_effective_strikes, v_forgive_days
        )
      );
      -- Override: for law_create, the cooldown is staking-based (in seconds)
      -- This is the primary cooldown — the thermodynamic formula still adds friction
      v_cooldown := (v_staking_cooldown_days * 86400)
                    + v_C * exp(v_exponent) * (1 + v_beta * v_D2) * v_S
                      * (CASE WHEN v_burst_active THEN v_burst_mult ELSE 1.0 END);
    ELSE
      v_strike_mult := 1;
      v_burst_factor := CASE WHEN v_burst_active THEN v_burst_mult ELSE 1.0 END;
      v_cooldown := v_C * exp(v_exponent) * (1 + v_beta * v_D2) * v_S * v_burst_factor;
      v_staking_info := jsonb_build_object('type', 'none', 'effective_strikes', 0);
    END IF;

    -- Clamp: 0 to 365 days max (law staking can be long)
    v_cooldown := GREATEST(0, LEAST(v_cooldown, 31536000));

    RETURN jsonb_build_object(
      'cooldown_seconds', round(v_cooldown),
      'tier', v_tier,
      'multiplier', v_S,
      'gamma', v_gamma,
      'dissent_d2', round(v_D2::numeric, 4),
      'quorum_met', v_t2_votes >= v_Qmin,
      'quorum_threshold', v_Qmin,
      't2_votes', v_t2_votes,
      'action_count', v_stats.action_count,
      'period_actions', v_stats.period_action_count,
      'is_first_action', false,
      'is_first_law_free', false,
      'effective_strikes', v_effective_strikes,
      'strike_decay_applied', v_stats.strike_count - v_effective_strikes,
      'burst_active', v_burst_active,
      'burst_count', v_burst_count,
      'staking_info', v_staking_info
    );
  END;
END;
$$;

COMMENT ON FUNCTION public.get_pangea_cooldown IS 'Diamond Edition v3: Thermodynamic cooldown + Quadratic Staking (DE-18 first free, DE-20 exponential time staking).';

-- ─────────────────────────────────────────────
-- DE-19: Process proposal outcome (strike/reset)
-- Called when a proposal is closed.
-- Approved → reset strikes. Rejected → +1 strike (unless incubator_passed).
-- ─────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.process_proposal_outcome(
  p_proposal_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_proposal record;
  v_total_weight numeric;
  v_approve_weight numeric;
  v_is_approved boolean;
  v_result jsonb;
BEGIN
  -- Get proposal
  SELECT id, author_id, status, incubator_passed, proposal_type
  INTO v_proposal
  FROM proposals
  WHERE id = p_proposal_id;

  IF v_proposal IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'PROPOSAL_NOT_FOUND');
  END IF;

  IF v_proposal.status != 'closed' THEN
    RETURN jsonb_build_object('success', false, 'error', 'NOT_CLOSED');
  END IF;

  -- Calculate approval: simple majority of weighted votes
  -- "yea" votes vs total weight
  SELECT
    COALESCE(SUM(v.voting_weight), 0),
    COALESCE(SUM(CASE WHEN v.vote_type = 'yea' THEN v.voting_weight ELSE 0 END), 0)
  INTO v_total_weight, v_approve_weight
  FROM votes v
  WHERE v.proposal_id = p_proposal_id AND v.is_final = true;

  -- Approved if yea > 50% of total weight
  v_is_approved := (v_total_weight > 0 AND v_approve_weight::numeric / v_total_weight::numeric > 0.5);

  IF v_is_approved THEN
    -- DE-19: Approved → reset all strikes for law_create
    PERFORM reset_user_strikes(v_proposal.author_id, 'law_create');
    PERFORM reset_user_strikes(v_proposal.author_id, 'proposal_create');

    v_result := jsonb_build_object(
      'success', true,
      'proposal_id', p_proposal_id,
      'outcome', 'approved',
      'action', 'strikes_reset',
      'total_weight', v_total_weight,
      'approve_weight', v_approve_weight
    );
  ELSE
    -- DE-19: Rejected → add strike (unless incubator passed)
    IF v_proposal.incubator_passed THEN
      -- DE-21: Free Pass — no strike penalty
      v_result := jsonb_build_object(
        'success', true,
        'proposal_id', p_proposal_id,
        'outcome', 'rejected',
        'action', 'free_pass_no_strike',
        'incubator_passed', true,
        'total_weight', v_total_weight,
        'approve_weight', v_approve_weight
      );
    ELSE
      -- Normal rejection: add strike
      PERFORM record_user_strike(v_proposal.author_id, 'law_create');
      PERFORM record_user_strike(v_proposal.author_id, 'proposal_create');

      v_result := jsonb_build_object(
        'success', true,
        'proposal_id', p_proposal_id,
        'outcome', 'rejected',
        'action', 'strike_added',
        'incubator_passed', false,
        'total_weight', v_total_weight,
        'approve_weight', v_approve_weight
      );
    END IF;
  END IF;

  RETURN v_result;
END;
$$;

COMMENT ON FUNCTION public.process_proposal_outcome IS 'DE-19: Process closed proposal — approved resets strikes, rejected adds strike (unless incubator Free Pass).';

-- ─────────────────────────────────────────────
-- DE-21: Update incubator T2+ upvote count
-- Called when a T2+ user upvotes a proposal in draft/curation.
-- When threshold is reached, sets incubator_passed = true.
-- ─────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.update_incubator_count(
  p_proposal_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer;
  v_threshold integer;
  v_already_passed boolean;
  v_status text;
BEGIN
  -- Get current state
  SELECT status, incubator_passed INTO v_status, v_already_passed
  FROM proposals WHERE id = p_proposal_id;

  IF v_status IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'PROPOSAL_NOT_FOUND');
  END IF;

  -- Only count during draft or curation phase
  IF v_status NOT IN ('draft', 'curation') THEN
    RETURN jsonb_build_object('success', false, 'error', 'WRONG_STATUS', 'status', v_status);
  END IF;

  -- Already passed? Skip
  IF v_already_passed THEN
    RETURN jsonb_build_object('success', true, 'already_passed', true);
  END IF;

  -- Count T2+ upvotes on this proposal (from discussion_votes on proposal discussions)
  SELECT COUNT(DISTINCT dv.user_id) INTO v_count
  FROM discussion_votes dv
  JOIN profiles p ON p.id = dv.user_id
  JOIN discussions d ON d.id = dv.discussion_id
  WHERE d.proposal_id = p_proposal_id
    AND dv.vote_type = 'up'
    AND p.identity_tier >= 2;

  -- Also count direct proposal signals if they exist
  -- (signal_count is from the curation mechanism)
  -- For now we use discussion upvotes as the primary metric

  -- Get threshold
  SELECT (value)::integer INTO v_threshold
  FROM system_config WHERE key = 'incubator_t2_upvote_threshold';
  v_threshold := COALESCE(v_threshold, 100);

  -- Update cached count
  UPDATE proposals
  SET incubator_t2_upvotes = v_count,
      incubator_passed = (v_count >= v_threshold)
  WHERE id = p_proposal_id;

  RETURN jsonb_build_object(
    'success', true,
    'proposal_id', p_proposal_id,
    't2_upvotes', v_count,
    'threshold', v_threshold,
    'incubator_passed', (v_count >= v_threshold)
  );
END;
$$;

COMMENT ON FUNCTION public.update_incubator_count IS 'DE-21: Recalculate T2+ upvote count for off-chain incubator. Sets incubator_passed when threshold reached.';

-- ─────────────────────────────────────────────
-- MISSING CRON RPCs (referenced by api/cron/evaluate)
-- ─────────────────────────────────────────────

-- ─── close_expired_proposals ───
-- Closes proposals past their expires_at date.
-- Also triggers vote reveal + strike processing.

CREATE OR REPLACE FUNCTION public.close_expired_proposals()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_closed_ids uuid[];
  v_count integer;
  v_pid uuid;
BEGIN
  -- Close all active proposals past expiration
  WITH closed AS (
    UPDATE proposals
    SET status = 'closed'
    WHERE status = 'active'
      AND expires_at IS NOT NULL
      AND expires_at <= now()
    RETURNING id
  )
  SELECT array_agg(id), COUNT(*)::integer INTO v_closed_ids, v_count FROM closed;

  v_count := COALESCE(v_count, 0);

  -- For each newly closed proposal: reveal votes + process outcome (strikes)
  IF v_closed_ids IS NOT NULL THEN
    FOREACH v_pid IN ARRAY v_closed_ids LOOP
      -- Seal votes and verify integrity
      PERFORM reveal_proposal_votes(v_pid);
      -- Process strike/reset based on outcome
      PERFORM process_proposal_outcome(v_pid);
    END LOOP;
  END IF;

  RETURN v_count;
END;
$$;

COMMENT ON FUNCTION public.close_expired_proposals IS 'Cron: close expired proposals, seal votes, process strike outcomes.';

-- ─── evaluate_curation_markets ───
-- Promotes proposals from curation → active when signal threshold is met.

CREATE OR REPLACE FUNCTION public.evaluate_curation_markets()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_threshold integer := 2; -- MVP: 2 signals to promote
  v_count integer;
BEGIN
  WITH promoted AS (
    UPDATE proposals
    SET status = 'active',
        -- Set expires_at to 7 days from now if not already set
        expires_at = COALESCE(expires_at, now() + interval '7 days')
    WHERE status = 'curation'
      AND signal_count >= v_threshold
    RETURNING id
  )
  SELECT COUNT(*)::integer INTO v_count FROM promoted;

  RETURN COALESCE(v_count, 0);
END;
$$;

COMMENT ON FUNCTION public.evaluate_curation_markets IS 'Cron: promote proposals from curation to active when signal threshold is met.';

-- ─── convert_closed_proposals_to_laws ───
-- Converts approved closed proposals into laws.

CREATE OR REPLACE FUNCTION public.convert_closed_proposals_to_laws()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_proposal record;
  v_count integer := 0;
  v_total_weight numeric;
  v_approve_weight numeric;
  v_is_approved boolean;
BEGIN
  -- Find closed proposals that haven't been converted yet
  FOR v_proposal IN
    SELECT p.*
    FROM proposals p
    WHERE p.status = 'closed'
      AND p.proposal_type = 'new'
      AND NOT EXISTS (
        SELECT 1 FROM laws l WHERE l.proposal_id = p.id
      )
  LOOP
    -- Check if approved (>50% yea weight)
    SELECT
      COALESCE(SUM(v.voting_weight), 0),
      COALESCE(SUM(CASE WHEN v.vote_type = 'yea' THEN v.voting_weight ELSE 0 END), 0)
    INTO v_total_weight, v_approve_weight
    FROM votes v
    WHERE v.proposal_id = v_proposal.id AND v.is_final = true;

    v_is_approved := (v_total_weight > 0 AND v_approve_weight::numeric / v_total_weight::numeric > 0.5);

    IF v_is_approved THEN
      -- Create law from proposal
      INSERT INTO laws (
        title, content, status, category_id, proposal_id,
        created_at, author_id
      ) VALUES (
        v_proposal.title,
        COALESCE(v_proposal.dispositivo, v_proposal.content),
        'active',
        v_proposal.category_id,
        v_proposal.id,
        now(),
        v_proposal.author_id
      );

      v_count := v_count + 1;
    END IF;
  END LOOP;

  RETURN v_count;
END;
$$;

COMMENT ON FUNCTION public.convert_closed_proposals_to_laws IS 'Cron: convert approved closed proposals into active laws.';

-- ─────────────────────────────────────────────
-- DE-21: Auto-update incubator on discussion vote changes
-- Trigger fires when someone upvotes/removes vote on a proposal discussion
-- ─────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.trigger_update_incubator()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_proposal_id uuid;
  v_discussion_id uuid;
BEGIN
  -- Get the discussion_id from the new or old row
  v_discussion_id := COALESCE(NEW.discussion_id, OLD.discussion_id);

  -- Check if this discussion is linked to a proposal
  SELECT proposal_id INTO v_proposal_id
  FROM discussions
  WHERE id = v_discussion_id;

  -- If linked to a proposal in draft/curation, update incubator count
  IF v_proposal_id IS NOT NULL THEN
    PERFORM update_incubator_count(v_proposal_id);
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Only create trigger if table exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'discussion_votes') THEN
    DROP TRIGGER IF EXISTS trg_update_incubator ON discussion_votes;
    CREATE TRIGGER trg_update_incubator
      AFTER INSERT OR DELETE ON discussion_votes
      FOR EACH ROW
      EXECUTE FUNCTION trigger_update_incubator();
  END IF;
END;
$$;

-- ─────────────────────────────────────────────
-- Grant permissions
-- ─────────────────────────────────────────────

GRANT EXECUTE ON FUNCTION public.get_pangea_cooldown TO authenticated;
GRANT EXECUTE ON FUNCTION public.process_proposal_outcome TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_incubator_count TO authenticated;
GRANT EXECUTE ON FUNCTION public.close_expired_proposals TO authenticated;
GRANT EXECUTE ON FUNCTION public.evaluate_curation_markets TO authenticated;
GRANT EXECUTE ON FUNCTION public.convert_closed_proposals_to_laws TO authenticated;

-- =============================================
-- DIAMOND EDITION — STEP 1: Identity Foundation
-- DE-01: Add identity_tier to profiles
-- DE-02: Create user_identity_proofs table
-- Applied: 2026-04-09
-- =============================================

-- DE-01: Identity Tier (0-3)
-- T0 = ghost (email only), T1 = resident (+phone), T2 = citizen (SPID hash), T3 = guarantor (Phase 2)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS identity_tier smallint NOT NULL DEFAULT 0
  CONSTRAINT identity_tier_range CHECK (identity_tier >= 0 AND identity_tier <= 3);

CREATE INDEX IF NOT EXISTS idx_profiles_identity_tier ON public.profiles(identity_tier);

-- DE-02: Identity proofs table — Anti-Sybil
CREATE TABLE IF NOT EXISTS public.user_identity_proofs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider_type text NOT NULL CHECK (provider_type IN ('email', 'phone', 'spid', 'cie', 'eidas')),
  proof_hash text NOT NULL,
  tier_granted smallint NOT NULL CHECK (tier_granted >= 0 AND tier_granted <= 3),
  verified_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT unique_proof_hash UNIQUE (proof_hash),
  CONSTRAINT unique_user_provider UNIQUE (user_id, provider_type)
);

CREATE INDEX IF NOT EXISTS idx_identity_proofs_user ON public.user_identity_proofs(user_id);
CREATE INDEX IF NOT EXISTS idx_identity_proofs_provider ON public.user_identity_proofs(provider_type);

ALTER TABLE public.user_identity_proofs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own identity proofs"
  ON public.user_identity_proofs FOR SELECT
  USING (auth.uid() = user_id);

-- SECURITY DEFINER function to verify identity and update tier
CREATE OR REPLACE FUNCTION public.verify_identity(
  p_user_id uuid,
  p_provider_type text,
  p_proof_hash text,
  p_tier_granted smallint
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_existing_user uuid;
  v_current_tier smallint;
BEGIN
  SELECT user_id INTO v_existing_user
  FROM user_identity_proofs
  WHERE proof_hash = p_proof_hash AND user_id != p_user_id;

  IF v_existing_user IS NOT NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'DUPLICATE_IDENTITY',
      'message', 'This identity is already linked to another account'
    );
  END IF;

  INSERT INTO user_identity_proofs (user_id, provider_type, proof_hash, tier_granted)
  VALUES (p_user_id, p_provider_type, p_proof_hash, p_tier_granted)
  ON CONFLICT (user_id, provider_type)
  DO UPDATE SET
    proof_hash = EXCLUDED.proof_hash,
    tier_granted = EXCLUDED.tier_granted,
    verified_at = now();

  SELECT COALESCE(MAX(tier_granted), 0) INTO v_current_tier
  FROM user_identity_proofs
  WHERE user_id = p_user_id;

  UPDATE profiles
  SET identity_tier = v_current_tier
  WHERE id = p_user_id;

  RETURN jsonb_build_object(
    'success', true,
    'tier', v_current_tier,
    'provider', p_provider_type
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.verify_identity TO authenticated;

COMMENT ON TABLE public.user_identity_proofs IS 'Diamond Edition DE-02: Identity proofs for Anti-Sybil protection.';
COMMENT ON COLUMN public.profiles.identity_tier IS 'Diamond Edition DE-01: Identity tier 0-3.';

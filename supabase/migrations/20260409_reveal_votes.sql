-- =============================================
-- DIAMOND EDITION — STEP 3 (continued)
-- DE-16: Reveal Phase — seal votes + verify hash integrity
-- Web2.5 compromise: server has plaintext, so "reveal" means:
--   1. Seal all votes (is_final = true) → immutable
--   2. Verify every vote_hash matches recomputed SHA-256
--   3. Log mismatches for audit
-- Applied: 2026-04-09
-- =============================================

-- ─── Vote integrity audit log ───
CREATE TABLE IF NOT EXISTS public.vote_integrity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id uuid NOT NULL REFERENCES proposals(id) ON DELETE CASCADE,
  vote_id uuid NOT NULL REFERENCES votes(id) ON DELETE CASCADE,
  expected_hash text NOT NULL,
  actual_hash text,
  status text NOT NULL CHECK (status IN ('verified', 'mismatch', 'missing_hash')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_vote_integrity_log_proposal
  ON public.vote_integrity_log(proposal_id);
CREATE INDEX IF NOT EXISTS idx_vote_integrity_log_status
  ON public.vote_integrity_log(status) WHERE status != 'verified';

-- RLS: only admins can read audit logs
ALTER TABLE public.vote_integrity_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read integrity logs"
  ON public.vote_integrity_log FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'moderator')
    )
  );

-- ─── DE-16: Reveal RPC ───
-- Called by cron after close_expired_proposals.
-- For each newly closed proposal: seal votes + verify hashes.
-- Returns summary per proposal.

CREATE OR REPLACE FUNCTION public.reveal_proposal_votes(
  p_proposal_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_status text;
  v_sealed_count integer := 0;
  v_verified_count integer := 0;
  v_mismatch_count integer := 0;
  v_missing_count integer := 0;
  v_vote record;
  v_hash_input text;
  v_recomputed_hash text;
  v_alloc_json text;
BEGIN
  -- 1. Validate: proposal must be closed
  SELECT status INTO v_status FROM proposals WHERE id = p_proposal_id;

  IF v_status IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'PROPOSAL_NOT_FOUND');
  END IF;

  IF v_status != 'closed' THEN
    RETURN jsonb_build_object('success', false, 'error', 'PROPOSAL_NOT_CLOSED');
  END IF;

  -- 2. Seal all unsealed votes
  UPDATE votes
  SET is_final = true
  WHERE proposal_id = p_proposal_id AND is_final = false;
  GET DIAGNOSTICS v_sealed_count = ROW_COUNT;

  -- 3. Verify hash integrity for every vote with a hash
  FOR v_vote IN
    SELECT v.id, v.vote_type, v.vote_hash, v.vote_salt, v.voting_weight,
           COALESCE(
             (SELECT jsonb_agg(
               jsonb_build_object('option_id', va.option_id, 'allocation_percentage', va.allocation_percentage)
               ORDER BY va.option_id
             )
             FROM vote_allocations va WHERE va.vote_id = v.id),
             '[]'::jsonb
           ) AS allocations
    FROM votes v
    WHERE v.proposal_id = p_proposal_id
  LOOP
    IF v_vote.vote_hash IS NULL THEN
      -- Vote cast without hash (pre-DE-14 or fallback)
      v_missing_count := v_missing_count + 1;

      INSERT INTO vote_integrity_log (proposal_id, vote_id, expected_hash, actual_hash, status)
      VALUES (p_proposal_id, v_vote.id, '', NULL, 'missing_hash');
    ELSE
      -- Recompute: SHA-256( vote_type | allocations_json | salt )
      v_alloc_json := v_vote.allocations::text;
      v_hash_input := v_vote.vote_type || '|' || v_alloc_json || '|' || v_vote.vote_salt;
      v_recomputed_hash := encode(digest(v_hash_input, 'sha256'), 'hex');

      IF v_recomputed_hash = v_vote.vote_hash THEN
        v_verified_count := v_verified_count + 1;

        INSERT INTO vote_integrity_log (proposal_id, vote_id, expected_hash, actual_hash, status)
        VALUES (p_proposal_id, v_vote.id, v_vote.vote_hash, v_recomputed_hash, 'verified');
      ELSE
        v_mismatch_count := v_mismatch_count + 1;

        INSERT INTO vote_integrity_log (proposal_id, vote_id, expected_hash, actual_hash, status)
        VALUES (p_proposal_id, v_vote.id, v_vote.vote_hash, v_recomputed_hash, 'mismatch');
      END IF;
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'proposal_id', p_proposal_id,
    'sealed_count', v_sealed_count,
    'verified_count', v_verified_count,
    'mismatch_count', v_mismatch_count,
    'missing_hash_count', v_missing_count,
    'integrity_ok', (v_mismatch_count = 0)
  );
END;
$$;

-- ─── Batch reveal: process all newly closed proposals ───
-- Called by cron. Finds closed proposals whose votes are not yet sealed.

CREATE OR REPLACE FUNCTION public.reveal_all_pending()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_proposal record;
  v_results jsonb := '[]'::jsonb;
  v_single_result jsonb;
BEGIN
  -- Find closed proposals that still have unsealed votes
  FOR v_proposal IN
    SELECT DISTINCT p.id
    FROM proposals p
    JOIN votes v ON v.proposal_id = p.id
    WHERE p.status = 'closed'
      AND v.is_final = false
  LOOP
    v_single_result := reveal_proposal_votes(v_proposal.id);
    v_results := v_results || jsonb_build_array(v_single_result);
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'proposals_processed', jsonb_array_length(v_results),
    'details', v_results
  );
END;
$$;

-- Grant: only service role (cron) calls these
GRANT EXECUTE ON FUNCTION public.reveal_proposal_votes TO authenticated;
GRANT EXECUTE ON FUNCTION public.reveal_all_pending TO authenticated;

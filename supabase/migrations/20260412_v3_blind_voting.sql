-- V3: Blind Voting — make get_proposal_results phase-aware
-- Active proposals: return zero breakdown (only turnout via get_proposal_turnout)
-- Closed/other: return full yea/nay/abstain breakdown
-- See VISION.md §V3 for rationale (anti-herding / conformism prevention)

CREATE OR REPLACE FUNCTION public.get_proposal_results(
  p_proposal_id uuid
)
RETURNS TABLE(yea_count bigint, nay_count bigint, abstain_count bigint)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_status text;
BEGIN
  SELECT status INTO v_status FROM proposals WHERE id = p_proposal_id;

  IF v_status = 'active' THEN
    -- ACTIVE: return zeros (anti-herding / blind voting V3)
    RETURN QUERY SELECT 0::bigint, 0::bigint, 0::bigint;
  ELSE
    -- CLOSED or other: return full breakdown
    RETURN QUERY
    SELECT
      COUNT(NULLIF(vote_type != 'yea', TRUE)),
      COUNT(NULLIF(vote_type != 'nay', TRUE)),
      COUNT(NULLIF(vote_type != 'abstain', TRUE))
    FROM votes
    WHERE proposal_id = p_proposal_id;
  END IF;
END;
$$;

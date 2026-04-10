-- ══════════════════════════════════════════════════════════════
-- DE-27/28: Delegation Decay — Ping & Auto-Revoke
-- Every 6 months, accepted delegations are "pinged" for confirmation.
-- If not confirmed within 30 days, they expire automatically.
-- ══════════════════════════════════════════════════════════════

-- 1. Add columns to delegations
ALTER TABLE delegations
  ADD COLUMN IF NOT EXISTS last_pinged_at TIMESTAMPTZ DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS confirmed_at TIMESTAMPTZ DEFAULT NULL;

-- 2. Expand status CHECK to include 'expired'
-- First drop existing check, then recreate
ALTER TABLE delegations DROP CONSTRAINT IF EXISTS delegations_status_check;
ALTER TABLE delegations ADD CONSTRAINT delegations_status_check
  CHECK (status IN ('pending', 'accepted', 'rejected', 'expired'));

-- 3. Index for efficient cron queries
CREATE INDEX IF NOT EXISTS idx_delegations_status_confirmed
  ON delegations (status, confirmed_at)
  WHERE status = 'accepted';

CREATE INDEX IF NOT EXISTS idx_delegations_pinged
  ON delegations (last_pinged_at)
  WHERE status = 'accepted' AND last_pinged_at IS NOT NULL;

-- 4. RPC: ping_delegation_confirmations
-- Called by cron. Finds accepted delegations not confirmed in 6 months,
-- sets last_pinged_at = now(). Returns count of pinged delegations.
CREATE OR REPLACE FUNCTION ping_delegation_confirmations()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  pinged_count INTEGER;
BEGIN
  UPDATE delegations
  SET last_pinged_at = NOW()
  WHERE status = 'accepted'
    -- Not already pinged (or pinged more than 6 months ago and confirmed since)
    AND (last_pinged_at IS NULL OR confirmed_at > last_pinged_at)
    -- Last confirmation (or creation) was more than 6 months ago
    AND COALESCE(confirmed_at, created_at) < NOW() - INTERVAL '6 months';

  GET DIAGNOSTICS pinged_count = ROW_COUNT;
  RETURN pinged_count;
END;
$$;

-- 5. RPC: expire_stale_delegations
-- Called by cron. Expires delegations pinged more than 30 days ago
-- that have NOT been confirmed since the ping.
-- Returns count of expired delegations.
CREATE OR REPLACE FUNCTION expire_stale_delegations()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  expired_count INTEGER;
BEGIN
  UPDATE delegations
  SET status = 'expired'
  WHERE status = 'accepted'
    AND last_pinged_at IS NOT NULL
    AND last_pinged_at < NOW() - INTERVAL '30 days'
    -- Not confirmed since the ping
    AND (confirmed_at IS NULL OR confirmed_at < last_pinged_at);

  GET DIAGNOSTICS expired_count = ROW_COUNT;
  RETURN expired_count;
END;
$$;

-- 6. RPC: confirm_delegation (user action)
-- The delegator confirms their delegation is still wanted.
CREATE OR REPLACE FUNCTION confirm_delegation(p_delegation_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE delegations
  SET confirmed_at = NOW(),
      last_pinged_at = NULL  -- Clear the ping
  WHERE id = p_delegation_id
    AND status = 'accepted'
    AND delegator_id = auth.uid();

  RETURN FOUND;
END;
$$;

-- 7. RPC: reactivate_expired_delegation (user re-creates)
-- Allows a delegator to reactivate an expired delegation
CREATE OR REPLACE FUNCTION reactivate_delegation(p_delegation_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE delegations
  SET status = 'accepted',
      confirmed_at = NOW(),
      last_pinged_at = NULL
  WHERE id = p_delegation_id
    AND status = 'expired'
    AND delegator_id = auth.uid();

  RETURN FOUND;
END;
$$;

-- 8. Set confirmed_at for all existing accepted delegations (backfill)
UPDATE delegations
SET confirmed_at = COALESCE(confirmed_at, created_at)
WHERE status = 'accepted'
  AND confirmed_at IS NULL;

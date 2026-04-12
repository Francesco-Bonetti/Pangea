-- ══════════════════════════════════════════════════════════════
-- Step 4: Delegation Cron RPCs (repo consistency — already applied to DB)
-- These RPCs were created via Supabase MCP in DELEGATION-CORE step.
-- Using CREATE OR REPLACE to be idempotent.
-- ══════════════════════════════════════════════════════════════

-- 1. update_last_active — called by middleware on authenticated requests
--    Throttled: max 1 update per hour per user.
CREATE OR REPLACE FUNCTION update_last_active()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE profiles
  SET last_active_at = now()
  WHERE id = auth.uid()
    AND (last_active_at IS NULL OR last_active_at < now() - interval '1 hour');
END;
$$;

-- 2. expire_inactive_delegations — called by daily cron (RPC 4.7)
--    Expires accepted delegations where delegator has been inactive for >180 days.
--    Distinct from expire_stale_delegations (which uses ping/confirm mechanism).
CREATE OR REPLACE FUNCTION expire_inactive_delegations()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  expired_count INTEGER;
BEGIN
  UPDATE delegations d
  SET status = 'expired',
      expired_at = now()
  FROM profiles p
  WHERE d.delegator_id = p.id
    AND d.status = 'accepted'
    AND p.last_active_at IS NOT NULL
    AND p.last_active_at < now() - interval '180 days';

  GET DIAGNOSTICS expired_count = ROW_COUNT;
  RETURN expired_count;
END;
$$;

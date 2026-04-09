"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import type { CooldownActionType, AccessCheckResult } from "@/lib/types";

interface UseCooldownResult {
  /** Whether the user can perform the action right now */
  canProceed: boolean;
  /** Seconds remaining until action is allowed */
  waitSeconds: number;
  /** Loading state while checking access */
  loading: boolean;
  /** Error message if check failed */
  error: string | null;
  /** Full response from check_pangea_access */
  accessCheck: AccessCheckResult | null;
  /** Re-check access (e.g. after timer expires) */
  refresh: () => Promise<void>;
  /** Record that the user performed the action (call after success) */
  recordAction: () => Promise<void>;
}

export function useCooldown(
  userId: string | null,
  actionType: CooldownActionType
): UseCooldownResult {
  const [canProceed, setCanProceed] = useState(true);
  const [waitSeconds, setWaitSeconds] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [accessCheck, setAccessCheck] = useState<AccessCheckResult | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const supabase = createClient();

  // Countdown timer
  useEffect(() => {
    if (waitSeconds > 0) {
      timerRef.current = setInterval(() => {
        setWaitSeconds((prev) => {
          if (prev <= 1) {
            if (timerRef.current) clearInterval(timerRef.current);
            setCanProceed(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [waitSeconds]);

  const checkAccess = useCallback(async () => {
    if (!userId) {
      setCanProceed(false);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const { data, error: rpcError } = await supabase.rpc(
        "check_pangea_access",
        { p_user_id: userId, p_action_type: actionType }
      );

      if (rpcError) {
        console.error("Cooldown check failed:", rpcError);
        setError(rpcError.message);
        setCanProceed(true); // fail-open: allow action if check fails
        return;
      }

      const result = data as AccessCheckResult;
      setAccessCheck(result);
      setCanProceed(result.can_proceed);
      setWaitSeconds(result.wait_seconds);
    } catch {
      setError("Failed to check cooldown");
      setCanProceed(true); // fail-open
    } finally {
      setLoading(false);
    }
  }, [userId, actionType, supabase]);

  const recordAction = useCallback(async () => {
    if (!userId) return;

    try {
      const { error: rpcError } = await supabase.rpc("record_user_action", {
        p_user_id: userId,
        p_action_type: actionType,
      });

      if (rpcError) {
        console.error("Failed to record action:", rpcError);
      }

      // Re-check access after recording
      await checkAccess();
    } catch {
      console.error("Failed to record action");
    }
  }, [userId, actionType, supabase, checkAccess]);

  useEffect(() => {
    checkAccess();
  }, [checkAccess]);

  return {
    canProceed,
    waitSeconds,
    loading,
    error,
    accessCheck,
    refresh: checkAccess,
    recordAction,
  };
}

/**
 * Format seconds into human-readable countdown
 * e.g. 3661 → "1h 1m 1s"
 */
export function formatCooldown(seconds: number): string {
  if (seconds <= 0) return "";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  const parts: string[] = [];
  if (h > 0) parts.push(`${h}h`);
  if (m > 0) parts.push(`${m}m`);
  if (s > 0 || parts.length === 0) parts.push(`${s}s`);
  return parts.join(" ");
}

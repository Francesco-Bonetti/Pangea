"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { IdentityTier } from "@/lib/types";

interface UseIdentityTierResult {
  tier: IdentityTier;
  loading: boolean;
  /** Check if user meets minimum tier for an action */
  hasTier: (minTier: IdentityTier) => boolean;
  /** Refresh tier from DB */
  refresh: () => Promise<void>;
}

export function useIdentityTier(userId: string | null): UseIdentityTierResult {
  const [tier, setTier] = useState<IdentityTier>(0);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  const fetchTier = useCallback(async () => {
    if (!userId) {
      setTier(0);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("identity_tier")
        .eq("id", userId)
        .single();

      if (error) {
        console.error("Failed to fetch identity tier:", error);
        setTier(0);
      } else {
        setTier((data?.identity_tier ?? 0) as IdentityTier);
      }
    } catch {
      setTier(0);
    } finally {
      setLoading(false);
    }
  }, [userId, supabase]);

  useEffect(() => {
    fetchTier();
  }, [fetchTier]);

  const hasTier = useCallback(
    (minTier: IdentityTier) => tier >= minTier,
    [tier]
  );

  return { tier, loading, hasTier, refresh: fetchTier };
}

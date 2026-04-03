"use client";

import React, { useEffect, useState, createContext, useContext, useCallback, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import type { PrivacySettings } from "@/lib/types";

// ============================================
// PRIVACY NAME SYSTEM
// Centralized, cached privacy-aware user name display
// ============================================

// --- Privacy Cache Context ---
// Shared cache so we don't re-fetch the same user's privacy settings

interface PrivacyCacheContextType {
  getPrivacy: (userId: string) => PrivacySettings | null | undefined;
  fetchPrivacy: (userId: string) => Promise<PrivacySettings | null>;
  batchFetchPrivacy: (userIds: string[]) => Promise<void>;
}

const PrivacyCacheContext = createContext<PrivacyCacheContextType | null>(null);

/**
 * Wrap your page with this provider to enable shared privacy caching.
 * All PrivacyName components inside will share the same cache.
 */
export function PrivacyCacheProvider({ children }: { children: React.ReactNode }) {
  const cacheRef = useRef<Map<string, PrivacySettings | null>>(new Map());
  const pendingRef = useRef<Map<string, Promise<PrivacySettings | null>>>(new Map());
  const supabase = createClient();

  const fetchPrivacy = useCallback(
    async (userId: string): Promise<PrivacySettings | null> => {
      // Return cached
      if (cacheRef.current.has(userId)) {
        return cacheRef.current.get(userId) || null;
      }

      // Return pending
      if (pendingRef.current.has(userId)) {
        return pendingRef.current.get(userId)!;
      }

      // Fetch
      const promise = supabase
        .from("privacy_settings")
        .select("*")
        .eq("user_id", userId)
        .single()
        .then(({ data }: { data: PrivacySettings | null }) => {
          const result = (data as PrivacySettings) || null;
          cacheRef.current.set(userId, result);
          pendingRef.current.delete(userId);
          return result;
        })
        .catch(() => {
          cacheRef.current.set(userId, null);
          pendingRef.current.delete(userId);
          return null;
        });

      pendingRef.current.set(userId, promise);
      return promise;
    },
    [supabase]
  );

  const batchFetchPrivacy = useCallback(
    async (userIds: string[]) => {
      const uncached = userIds.filter((id) => !cacheRef.current.has(id));
      if (uncached.length === 0) return;

      const { data } = await supabase
        .from("privacy_settings")
        .select("*")
        .in("user_id", uncached);

      if (data) {
        for (const row of data) {
          cacheRef.current.set(row.user_id, row as PrivacySettings);
        }
      }
      // Mark missing as null
      for (const id of uncached) {
        if (!cacheRef.current.has(id)) {
          cacheRef.current.set(id, null);
        }
      }
    },
    [supabase]
  );

  const getPrivacy = useCallback((userId: string): PrivacySettings | null | undefined => {
    return cacheRef.current.get(userId);
  }, []);

  return (
    <PrivacyCacheContext.Provider value={{ getPrivacy, fetchPrivacy, batchFetchPrivacy }}>
      {children}
    </PrivacyCacheContext.Provider>
  );
}

// --- Hook: usePrivacyName ---

interface UsePrivacyNameOptions {
  userId: string;
  fullName: string | null;
  currentUserId?: string | null;
  isAdmin?: boolean;
}

/**
 * Hook that returns the privacy-aware display name for a user.
 * Falls back to the raw name while loading.
 */
export function usePrivacyName({
  userId,
  fullName,
  currentUserId,
  isAdmin,
}: UsePrivacyNameOptions): string {
  const cache = useContext(PrivacyCacheContext);
  const [displayName, setDisplayName] = useState<string>(fullName || "Anonymous Citizen");

  useEffect(() => {
    // Self always sees own name
    if (currentUserId && userId === currentUserId) {
      setDisplayName(fullName || "Anonymous Citizen");
      return;
    }

    // Admin always sees real name
    if (isAdmin) {
      setDisplayName(fullName || "Anonymous Citizen");
      return;
    }

    if (!cache) {
      // No provider = show raw name (backward compatible)
      setDisplayName(fullName || "Anonymous Citizen");
      return;
    }

    // Check cache first
    const cached = cache.getPrivacy(userId);
    if (cached !== undefined) {
      setDisplayName(resolveDisplayName(fullName, cached));
      return;
    }

    // Fetch async
    cache.fetchPrivacy(userId).then((privacy) => {
      setDisplayName(resolveDisplayName(fullName, privacy));
    });
  }, [userId, fullName, currentUserId, isAdmin, cache]);

  return displayName;
}

// --- Component: PrivacyName ---

interface PrivacyNameProps {
  userId: string;
  fullName: string | null;
  currentUserId?: string | null;
  isAdmin?: boolean;
  className?: string;
  fallback?: string;
}

/**
 * Drop-in component that displays a user's name respecting their privacy settings.
 *
 * Usage:
 *   <PrivacyName userId={comment.author_id} fullName={comment.profiles?.full_name} />
 *
 * Instead of:
 *   {comment.profiles?.full_name || "Anonymous"}
 */
export default function PrivacyName({
  userId,
  fullName,
  currentUserId,
  isAdmin,
  className,
  fallback = "Anonymous Citizen",
}: PrivacyNameProps) {
  const name = usePrivacyName({ userId, fullName, currentUserId, isAdmin });
  return <span className={className}>{name || fallback}</span>;
}

// --- Component: PrivacyInitials ---

interface PrivacyInitialsProps {
  userId: string;
  fullName: string | null;
  currentUserId?: string | null;
  isAdmin?: boolean;
  className?: string;
}

/**
 * Displays privacy-aware avatar initials.
 */
export function PrivacyInitials({
  userId,
  fullName,
  currentUserId,
  isAdmin,
  className,
}: PrivacyInitialsProps) {
  const name = usePrivacyName({ userId, fullName, currentUserId, isAdmin });
  const initials = getInitials(name);
  return <span className={className}>{initials}</span>;
}

// --- Helpers ---

function resolveDisplayName(fullName: string | null, privacy: PrivacySettings | null): string {
  if (!privacy) return fullName || "Anonymous Citizen";

  // Private profile
  if (privacy.profile_visibility === "private") {
    return privacy.display_name || "Private Citizen";
  }

  // Name visible
  if (privacy.show_full_name) {
    return fullName || "Anonymous Citizen";
  }

  // Name hidden → use display_name
  if (privacy.display_name) {
    return privacy.display_name;
  }

  // Fallback
  return "Anonymous Citizen";
}

function getInitials(name: string): string {
  if (!name || name === "Anonymous Citizen" || name === "Private Citizen") return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
}

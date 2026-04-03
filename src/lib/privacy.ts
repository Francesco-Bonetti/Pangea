// ============================================
// PRIVACY UTILITIES - Agora Pangea
// Centralized privacy-aware profile rendering
// ============================================

import { createClient } from "@/lib/supabase/client";
import type { PrivacySettings, DisplayProfile, Profile } from "./types";

type SupabaseClient = ReturnType<typeof createClient>;

// Default anonymous display when name is hidden
const ANONYMOUS_LABEL = "Anonymous Citizen";
const PRIVATE_PROFILE_LABEL = "Private Profile";
const RESTRICTED_PROFILE_LABEL = "Registered Users Only";

// ---- Supabase queries ----

/**
 * Fetch privacy settings for a user
 */
export async function fetchPrivacySettings(
  userId: string,
  supabase?: SupabaseClient
): Promise<PrivacySettings | null> {
  const client = supabase || createClient();
  const { data, error } = await client
    .from("privacy_settings")
    .select("*")
    .eq("user_id", userId)
    .single();

  if (error || !data) return null;
  return data as PrivacySettings;
}

/**
 * Update privacy settings for the current user
 */
export async function updatePrivacySettings(
  userId: string,
  updates: Partial<PrivacySettings>,
  supabase?: SupabaseClient
): Promise<{ success: boolean; error?: string }> {
  const client = supabase || createClient();

  // Remove fields that shouldn't be updated directly
  const { id, user_id, created_at, updated_at, ...safeUpdates } = updates as Record<string, unknown>;

  const { error } = await client
    .from("privacy_settings")
    .update(safeUpdates)
    .eq("user_id", userId);

  if (error) return { success: false, error: error.message };
  return { success: true };
}

// ---- Display helpers ----

/**
 * Get the display name for a user, respecting privacy settings.
 * Use this everywhere you show a user's name.
 *
 * Priority:
 * 1. If viewer is the user themselves or admin → full_name
 * 2. If show_full_name=true → full_name
 * 3. If display_name is set → display_name
 * 4. If user_code is visible → "Citizen {user_code}"
 * 5. Fallback → "Anonymous Citizen"
 */
export function getDisplayName(
  profile: Profile | null,
  privacy: PrivacySettings | null,
  options?: {
    isSelf?: boolean;
    isAdmin?: boolean;
  }
): string {
  if (!profile) return ANONYMOUS_LABEL;

  // Self or admin always sees real name
  if (options?.isSelf || options?.isAdmin) {
    return profile.full_name || ANONYMOUS_LABEL;
  }

  // No privacy settings = default (show everything)
  if (!privacy) {
    return profile.full_name || ANONYMOUS_LABEL;
  }

  // Private profile
  if (privacy.profile_visibility === "private") {
    return privacy.display_name || PRIVATE_PROFILE_LABEL;
  }

  // Name is visible
  if (privacy.show_full_name) {
    return profile.full_name || ANONYMOUS_LABEL;
  }

  // Name hidden, use display_name
  if (privacy.display_name) {
    return privacy.display_name;
  }

  // Fallback to user code
  if (privacy.show_user_code && profile.user_code) {
    return `Citizen ${profile.user_code}`;
  }

  return ANONYMOUS_LABEL;
}

/**
 * Get the avatar initials for a user, respecting privacy.
 */
export function getDisplayInitials(
  profile: Profile | null,
  privacy: PrivacySettings | null,
  options?: { isSelf?: boolean; isAdmin?: boolean }
): string {
  const name = getDisplayName(profile, privacy, options);
  if (name === ANONYMOUS_LABEL || name === PRIVATE_PROFILE_LABEL) return "?";

  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
}

/**
 * Check if a specific field should be visible for a profile
 */
export function isFieldVisible(
  fieldName: keyof PrivacySettings,
  privacy: PrivacySettings | null,
  options?: { isSelf?: boolean; isAdmin?: boolean }
): boolean {
  // Self or admin sees everything
  if (options?.isSelf || options?.isAdmin) return true;

  // No settings = default visible
  if (!privacy) return true;

  // Private profile hides most things
  if (privacy.profile_visibility === "private") {
    // Only show user_code and display_name for private profiles
    if (fieldName === "show_user_code") return privacy.show_user_code;
    return false;
  }

  const value = privacy[fieldName];
  if (typeof value === "boolean") return value;
  return true;
}

/**
 * Check if the current user can send a DM to target user
 */
export function canSendDM(
  targetPrivacy: PrivacySettings | null,
  isFollowing: boolean = false
): boolean {
  if (!targetPrivacy) return true; // default: allow

  switch (targetPrivacy.dm_policy) {
    case "everyone":
      return true;
    case "followed_only":
      return isFollowing;
    case "nobody":
      return false;
    default:
      return true;
  }
}

/**
 * Build a privacy-safe profile object for display.
 * Use this when you need to pass a full profile to a component.
 */
export function buildSafeProfile(
  profile: Profile,
  privacy: PrivacySettings | null,
  options?: { isSelf?: boolean; isAdmin?: boolean }
): DisplayProfile {
  const opts = options || {};

  // Self or admin: full access
  if (opts.isSelf || opts.isAdmin) {
    return {
      id: profile.id,
      full_name: profile.full_name,
      display_name: privacy?.display_name || null,
      bio: profile.bio,
      role: profile.role || "citizen",
      user_code: profile.user_code || null,
      created_at: profile.created_at,
      show_activity: true,
      show_delegations: true,
      show_party_membership: true,
      show_jurisdiction_membership: true,
      dm_policy: privacy?.dm_policy || "everyone",
      allow_mentions: privacy?.allow_mentions ?? true,
    };
  }

  // No privacy settings: show defaults
  if (!privacy) {
    return {
      id: profile.id,
      full_name: profile.full_name,
      display_name: null,
      bio: profile.bio,
      role: profile.role || "citizen",
      user_code: profile.user_code || null,
      created_at: profile.created_at,
      show_activity: true,
      show_delegations: true,
      show_party_membership: true,
      show_jurisdiction_membership: true,
      dm_policy: "everyone",
      allow_mentions: true,
    };
  }

  // Private profile
  if (privacy.profile_visibility === "private") {
    return {
      id: profile.id,
      full_name: null,
      display_name: privacy.display_name,
      bio: null,
      role: profile.role || "citizen",
      user_code: privacy.show_user_code ? (profile.user_code || null) : null,
      created_at: null,
      is_private: true,
      dm_policy: privacy.dm_policy,
    };
  }

  // Public/registered: respect individual toggles
  return {
    id: profile.id,
    full_name: privacy.show_full_name ? profile.full_name : null,
    display_name: privacy.display_name,
    bio: privacy.show_bio ? profile.bio : null,
    role: profile.role || "citizen",
    user_code: privacy.show_user_code ? (profile.user_code || null) : null,
    created_at: privacy.show_join_date ? profile.created_at : null,
    show_activity: privacy.show_activity,
    show_delegations: privacy.show_delegations,
    show_party_membership: privacy.show_party_membership,
    show_jurisdiction_membership: privacy.show_jurisdiction_membership,
    dm_policy: privacy.dm_policy,
    allow_mentions: privacy.allow_mentions,
  };
}

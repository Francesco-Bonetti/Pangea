// ============================================
// Platform-level permission utilities
// ============================================
// Centralized check for platform roles (admin, moderator, citizen).
// For GROUP-level permissions, use group-permissions.ts instead.
//
// V1 (VISION.md): Today these check `role` from profiles table.
// When T21+T22 land, they will read from `delegations` table instead.
// Centralizing now means we only change ONE file later.
// ============================================

/** Platform roles stored in profiles.role */
export type PlatformRole = "admin" | "moderator" | "citizen";

/**
 * Can this user perform moderation actions at the platform level?
 * (delete content, manage reports, edit laws, etc.)
 * Includes admins and moderators.
 */
export function canModerate(role?: string | null): boolean {
  return role === "admin" || role === "moderator";
}

/**
 * Is this user a platform administrator?
 * (full access: user management, system settings, etc.)
 */
export function isAdmin(role?: string | null): boolean {
  return role === "admin";
}

/**
 * Is this user at least a regular citizen? (not a guest)
 * Useful for gating features that require authentication.
 */
export function isCitizen(role?: string | null): boolean {
  return role === "admin" || role === "moderator" || role === "citizen";
}

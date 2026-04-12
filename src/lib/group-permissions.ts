// ============================================
// T05 — Group Role System (10 roles + permission matrix)
// ============================================
// Each group member has a role. Permissions are derived from the role
// via a static matrix. Founders can also create custom roles (Phase 2).
//
// Hierarchy (high → low):
//   founder > co_founder > president > vice_president >
//   admin > moderator > secretary > treasurer > member > observer
// ============================================

import type { GroupMemberRole } from "@/lib/types";

// ── Role hierarchy (lower index = higher authority) ──
export const GROUP_ROLE_HIERARCHY: GroupMemberRole[] = [
  "founder",
  "co_founder",
  "president",
  "vice_president",
  "admin",
  "moderator",
  "secretary",
  "treasurer",
  "member",
  "observer",
];

/** Numeric weight: founder=0 (highest), observer=9 (lowest) */
export function getRoleWeight(role: GroupMemberRole): number {
  const idx = GROUP_ROLE_HIERARCHY.indexOf(role);
  return idx === -1 ? 99 : idx;
}

/** True when `actor` outranks `target` in the hierarchy */
export function outranks(actor: GroupMemberRole, target: GroupMemberRole): boolean {
  return getRoleWeight(actor) < getRoleWeight(target);
}

// ── Permission keys ──
export type GroupPermission =
  | "edit_settings"        // Modify group name, description, settings JSON
  | "assign_roles"         // Change another member's role
  | "create_subgroups"     // Create child groups
  | "moderate_content"     // Delete/hide posts, mute users
  | "publish_announcements"// Pin posts, send group-wide announcements
  | "vote"                 // Cast votes on proposals within the group
  | "propose_laws"         // Create new proposals/laws
  | "ban_members"          // Permanently ban a member
  | "temp_ban_members"     // Temporary ban (≤30 days)
  | "kick_members"         // Remove a member (they can rejoin)
  | "invite_members"       // Send invitations to join
  | "manage_elections"     // Create/manage elections within the group
  | "manage_treasury"      // (Phase 2) Manage group funds
  | "delete_group"         // Permanently delete the group
  | "view_content"         // Read group content (posts, laws, votes)
  | "post_content"         // Create posts/discussions in group forum
  | "manage_documents";    // Manage group documents, minutes, reports

// ── Static permission matrix ──
// true = always allowed, false = never, "conditional" handled in code
const PERMISSION_MATRIX: Record<GroupMemberRole, Set<GroupPermission>> = {
  founder: new Set<GroupPermission>([
    "edit_settings",
    "assign_roles",
    "create_subgroups",
    "moderate_content",
    "publish_announcements",
    "vote",
    "propose_laws",
    "ban_members",
    "temp_ban_members",
    "kick_members",
    "invite_members",
    "manage_elections",
    "manage_treasury",
    "delete_group",
    "view_content",
    "post_content",
    "manage_documents",
  ]),

  co_founder: new Set<GroupPermission>([
    "edit_settings",
    "assign_roles",
    "create_subgroups",
    "moderate_content",
    "publish_announcements",
    "vote",
    "propose_laws",
    "ban_members",
    "temp_ban_members",
    "kick_members",
    "invite_members",
    "manage_elections",
    "manage_treasury",
    // co_founder cannot delete group — only founder
    "view_content",
    "post_content",
    "manage_documents",
  ]),

  president: new Set<GroupPermission>([
    "edit_settings",
    "assign_roles",
    "create_subgroups",
    "moderate_content",
    "publish_announcements",
    "vote",
    "propose_laws",
    "ban_members",
    "temp_ban_members",
    "kick_members",
    "invite_members",
    "manage_elections",
    "view_content",
    "post_content",
    "manage_documents",
  ]),

  vice_president: new Set<GroupPermission>([
    "moderate_content",
    "publish_announcements",
    "vote",
    "propose_laws",
    "temp_ban_members",
    "kick_members",
    "invite_members",
    "manage_elections",
    "view_content",
    "post_content",
    "manage_documents",
  ]),

  admin: new Set<GroupPermission>([
    "edit_settings",
    "assign_roles",
    "create_subgroups",
    "moderate_content",
    "publish_announcements",
    "vote",
    "propose_laws",
    "ban_members",
    "temp_ban_members",
    "kick_members",
    "invite_members",
    "manage_elections",
    "view_content",
    "post_content",
    "manage_documents",
  ]),

  moderator: new Set<GroupPermission>([
    "moderate_content",
    "publish_announcements",
    "vote",
    "propose_laws",
    "temp_ban_members",
    "kick_members",
    "invite_members",
    "view_content",
    "post_content",
  ]),

  secretary: new Set<GroupPermission>([
    "publish_announcements",
    "vote",
    "propose_laws",
    "invite_members",
    "view_content",
    "post_content",
    "manage_documents",
  ]),

  treasurer: new Set<GroupPermission>([
    "vote",
    "propose_laws",
    "manage_treasury",
    "view_content",
    "post_content",
  ]),

  member: new Set<GroupPermission>([
    "vote",
    "propose_laws",
    "view_content",
    "post_content",
  ]),

  observer: new Set<GroupPermission>([
    "view_content",
  ]),
};

// ── Public API ──

/** Check if a role has a specific permission */
export function hasPermission(role: GroupMemberRole, permission: GroupPermission): boolean {
  return PERMISSION_MATRIX[role]?.has(permission) ?? false;
}

/** Get all permissions for a role */
export function getPermissions(role: GroupMemberRole): GroupPermission[] {
  return Array.from(PERMISSION_MATRIX[role] ?? []);
}

/** Get all roles that have a specific permission */
export function getRolesWithPermission(permission: GroupPermission): GroupMemberRole[] {
  return GROUP_ROLE_HIERARCHY.filter((role) => hasPermission(role, permission));
}

/**
 * Check if an actor can assign a target role.
 * Rules:
 * 1. Actor must have "assign_roles" permission
 * 2. Actor cannot assign a role equal to or above their own
 * 3. Founder role can never be assigned (only via group creation or transfer)
 * 4. Co-founder can only be assigned by founder
 */
export function canAssignRole(
  actorRole: GroupMemberRole,
  targetCurrentRole: GroupMemberRole,
  targetNewRole: GroupMemberRole,
): boolean {
  // Must have assign_roles permission
  if (!hasPermission(actorRole, "assign_roles")) return false;

  // Cannot touch someone at or above your level
  if (!outranks(actorRole, targetCurrentRole)) return false;

  // Cannot assign founder role
  if (targetNewRole === "founder") return false;

  // Art. 5.4 LUX v2: moderator can only be elected, never manually assigned
  if (targetNewRole === "moderator") return false;

  // Co-founder can only be assigned by founder
  if (targetNewRole === "co_founder" && actorRole !== "founder") return false;

  // Cannot assign a role at or above your own level
  if (!outranks(actorRole, targetNewRole)) return false;

  return true;
}

/**
 * Check if an actor can remove (kick/ban) a target member.
 * Rules:
 * 1. Actor must have kick_members or ban_members permission
 * 2. Cannot kick/ban someone at or above your level
 * 3. Cannot kick/ban a founder or co-founder (only Guardian can)
 */
export function canRemoveMember(
  actorRole: GroupMemberRole,
  targetRole: GroupMemberRole,
  permanent: boolean = false,
): boolean {
  const perm = permanent ? "ban_members" : "kick_members";
  if (!hasPermission(actorRole, perm)) return false;
  if (!outranks(actorRole, targetRole)) return false;
  if (targetRole === "founder" || targetRole === "co_founder") return false;
  return true;
}

/**
 * Get the list of roles that an actor can assign to a member.
 * Used to populate the role-change dropdown in the UI.
 */
export function getAssignableRoles(
  actorRole: GroupMemberRole,
  targetCurrentRole: GroupMemberRole,
): GroupMemberRole[] {
  return GROUP_ROLE_HIERARCHY.filter(
    (r) => r !== targetCurrentRole && canAssignRole(actorRole, targetCurrentRole, r),
  );
}

// ── Role metadata for UI ──
export interface RoleMeta {
  key: GroupMemberRole;
  icon: string;       // lucide icon name
  colorClass: string;  // Tailwind classes
  weight: number;
}

export const ROLE_META: Record<GroupMemberRole, RoleMeta> = {
  founder:        { key: "founder",        icon: "Crown",        colorClass: "text-amber-400 bg-amber-500/15",   weight: 0 },
  co_founder:     { key: "co_founder",     icon: "Crown",        colorClass: "text-amber-300 bg-amber-400/15",   weight: 1 },
  president:      { key: "president",      icon: "Star",         colorClass: "text-yellow-400 bg-yellow-500/15", weight: 2 },
  vice_president: { key: "vice_president", icon: "Star",         colorClass: "text-yellow-300 bg-yellow-400/15", weight: 3 },
  admin:          { key: "admin",          icon: "Shield",       colorClass: "text-blue-400 bg-blue-500/15",     weight: 4 },
  moderator:      { key: "moderator",      icon: "ShieldCheck",  colorClass: "text-cyan-400 bg-cyan-500/15",     weight: 5 },
  secretary:      { key: "secretary",      icon: "FileText",     colorClass: "text-indigo-400 bg-indigo-500/15", weight: 6 },
  treasurer:      { key: "treasurer",      icon: "Wallet",       colorClass: "text-emerald-400 bg-emerald-500/15", weight: 7 },
  member:         { key: "member",         icon: "Users",        colorClass: "text-slate-400 bg-slate-500/15",   weight: 8 },
  observer:       { key: "observer",       icon: "Eye",          colorClass: "text-gray-400 bg-gray-500/15",     weight: 9 },
};

/** Sort members by role hierarchy (founders first) */
export function sortByRole<T extends { role: GroupMemberRole }>(members: T[]): T[] {
  return [...members].sort((a, b) => getRoleWeight(a.role) - getRoleWeight(b.role));
}

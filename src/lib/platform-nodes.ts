/**
 * platform-nodes.ts — Single source of truth for all navigation/tree nodes.
 *
 * Consumed by: Navbar, AppSidebar, PangeaTree.
 * No "use client" — pure config module, safe to import anywhere.
 */

import type { LucideIcon } from "lucide-react";
import {
  Globe,
  Landmark,
  Flag,
  Users,
  BookOpen,
  Vote,
  MessageCircle,
  User,
  Settings,
  Info,
  Search,
  Briefcase,
  Scale,
  Bell,
  Heart,
  Shield,
  FileText,
  ShieldCheck,
  Compass,
  Wrench,
  LayoutDashboard,
  Rss,
  Mail,
} from "lucide-react";

/* ═══════════════════════════════════════════════════════════
   Types
   ═══════════════════════════════════════════════════════════ */

export interface PlatformNode {
  /** Stable unique id — used as React key and for tree relationships */
  id: string;
  /** Route href */
  href: string;
  /** i18n key for nav/sidebar label */
  labelKey: string;
  /**
   * i18n key used exclusively by PangeaTree (when different from labelKey).
   * PangeaTree uses `treeLabelKey ?? labelKey`.
   */
  treeLabelKey?: string;
  /** String key for ICON_MAP lookup */
  iconKey: string;
  /** Primary hex color (used in PangeaTree node fill + icon tint in Navbar) */
  color: string;
  /** Lighter variant hex color for PangeaTree highlights */
  colorLight: string;
  /** Glow rgba string for PangeaTree bloom effect */
  glow: string;
  /** i18n key for PangeaTree description card */
  descKey: string;
  /** i18n key for PangeaTree action button text */
  actionKey: string;
  /** Optional secondary action href in PangeaTree */
  actionHref?: string;
  /** Whether the node supports in-tree creation */
  canCreate?: boolean;
  /** Href for the create action */
  createHref?: string;
  /** Parent node id — null means top-level */
  parent: string | null;
}

/** Subset of PlatformNode used as PangeaTree tree node (recursive children added by buildPlatformTree) */
export interface PlatformTreeNode
  extends Omit<PlatformNode, "parent" | "labelKey" | "treeLabelKey"> {
  labelKey: string; // resolved (treeLabelKey ?? labelKey)
  children?: PlatformTreeNode[];
}

/* ═══════════════════════════════════════════════════════════
   Icon map  (iconKey → Lucide component)
   ═══════════════════════════════════════════════════════════ */

export const ICON_MAP: Record<string, LucideIcon> = {
  globe: Globe,
  landmark: Landmark,
  flag: Flag,
  users: Users,
  book: BookOpen,
  vote: Vote,
  message: MessageCircle,
  user: User,
  settings: Settings,
  info: Info,
  search: Search,
  briefcase: Briefcase,
  scale: Scale,
  bell: Bell,
  heart: Heart,
  shield: Shield,
  fileText: FileText,
  shieldCheck: ShieldCheck,
  compass: Compass,
  wrench: Wrench,
  dashboard: LayoutDashboard,
  rss: Rss,
  mail: Mail,
};

/* ═══════════════════════════════════════════════════════════
   Node registry (flat list — parent field encodes hierarchy)
   ═══════════════════════════════════════════════════════════ */

export const PLATFORM_NODES: PlatformNode[] = [
  /* ── Root ─────────────────────────────────────────────── */
  {
    id: "dashboard", href: "/dashboard",
    labelKey: "nav.dashboard", iconKey: "dashboard",
    color: "#2563eb", colorLight: "#3b82f6", glow: "rgba(37,99,235,0.25)",
    descKey: "tree.dashboardDesc", actionKey: "tree.open",
    parent: null,
  },

  /* ── Main sections (Level 1) ──────────────────────────── */
  {
    id: "groups", href: "/groups",
    labelKey: "nav.groups", iconKey: "compass",
    color: "#2563eb", colorLight: "#3b82f6", glow: "rgba(37,99,235,0.25)",
    descKey: "tree.groupsDesc", actionKey: "tree.explore",
    parent: null,
  },
  {
    id: "laws", href: "/laws",
    labelKey: "nav.laws", iconKey: "book",
    color: "#d97706", colorLight: "#f59e0b", glow: "rgba(217,119,6,0.25)",
    descKey: "tree.lawsDesc", actionKey: "tree.explore",
    parent: null,
  },
  {
    id: "proposals", href: "/proposals",
    labelKey: "nav.proposals", iconKey: "fileText",
    color: "#c2410c", colorLight: "#fb923c", glow: "rgba(194,65,12,0.25)",
    descKey: "tree.proposalsDesc", actionKey: "tree.explore",
    parent: null,
  },
  {
    id: "elections", href: "/elections",
    labelKey: "nav.elections", iconKey: "vote",
    color: "#059669", colorLight: "#10b981", glow: "rgba(5,150,105,0.25)",
    descKey: "tree.electionsDesc", actionKey: "tree.explore",
    parent: null,
  },
  {
    id: "agora", href: "/social",
    labelKey: "nav.forum", treeLabelKey: "tree.agora", iconKey: "message",
    color: "#db2777", colorLight: "#ec4899", glow: "rgba(219,39,119,0.25)",
    descKey: "tree.agoraDesc", actionKey: "tree.explore",
    parent: null,
  },
  {
    id: "about", href: "/about",
    labelKey: "nav.about", iconKey: "info",
    color: "#0891b2", colorLight: "#22d3ee", glow: "rgba(8,145,178,0.25)",
    descKey: "tree.aboutDesc", actionKey: "tree.learn",
    parent: null,
  },
  {
    id: "verify", href: "/verify",
    labelKey: "integrity.navTitle", iconKey: "shieldCheck",
    color: "#6b7280", colorLight: "#9ca3af", glow: "rgba(107,114,128,0.25)",
    descKey: "tree.verifyDesc", actionKey: "tree.open",
    parent: null,
  },

  /* ── Personal space (tree section + user dropdown) ────── */
  {
    id: "personal", href: "/settings",
    labelKey: "nav.yourSpace", treeLabelKey: "tree.personal", iconKey: "user",
    color: "#7c3aed", colorLight: "#8b5cf6", glow: "rgba(124,58,237,0.25)",
    descKey: "tree.personalDesc", actionKey: "tree.open",
    parent: null,
  },

  /* ── Groups children ───────────────────────────────────── */
  {
    id: "jurisdictions", href: "/groups?type=jurisdiction",
    labelKey: "nav.jurisdictions", iconKey: "landmark",
    color: "#1d4ed8", colorLight: "#3b82f6", glow: "rgba(29,78,216,0.25)",
    descKey: "tree.jurisdictionsDesc", actionKey: "tree.browse",
    parent: "groups",
  },
  {
    id: "parties", href: "/groups?type=party",
    labelKey: "nav.movements", treeLabelKey: "tree.parties", iconKey: "flag",
    color: "#dc2626", colorLight: "#ef4444", glow: "rgba(220,38,38,0.25)",
    descKey: "tree.partiesDesc", actionKey: "tree.browse",
    canCreate: true, createHref: "/groups?type=party&create=1",
    parent: "groups",
  },
  {
    id: "communities", href: "/groups?type=community",
    labelKey: "nav.communities", iconKey: "users",
    color: "#7c3aed", colorLight: "#a78bfa", glow: "rgba(124,58,237,0.25)",
    descKey: "tree.communitiesDesc", actionKey: "tree.browse",
    canCreate: true, createHref: "/groups?type=community&create=1",
    parent: "groups",
  },
  {
    id: "workingGroups", href: "/groups?type=working_group",
    labelKey: "nav.workingGroups", treeLabelKey: "tree.workingGroups", iconKey: "wrench",
    color: "#0d9488", colorLight: "#2dd4bf", glow: "rgba(13,148,136,0.25)",
    descKey: "tree.workingGroupsDesc", actionKey: "tree.browse",
    canCreate: true, createHref: "/groups?type=working_group&create=1",
    parent: "groups",
  },
  {
    id: "religions", href: "/groups?type=religion",
    labelKey: "nav.religions", iconKey: "heart",
    color: "#0f766e", colorLight: "#5eead4", glow: "rgba(15,118,110,0.25)",
    descKey: "tree.religionsDesc", actionKey: "tree.browse",
    canCreate: true, createHref: "/groups?type=religion&create=1",
    parent: "groups",
  },

  /* ── Laws children ──────────────────────────────────────── */
  {
    id: "browseLaws", href: "/laws",
    labelKey: "tree.browseLaws", iconKey: "search",
    color: "#b45309", colorLight: "#f59e0b", glow: "rgba(180,83,9,0.25)",
    descKey: "tree.browseLawsDesc", actionKey: "tree.browse",
    parent: "laws",
  },
  {
    id: "proposeLaw", href: "/laws?propose=1",
    labelKey: "tree.proposeLaw", iconKey: "fileText",
    color: "#ea580c", colorLight: "#fb923c", glow: "rgba(234,88,12,0.25)",
    descKey: "tree.proposeLawDesc", actionKey: "tree.create",
    parent: "laws",
  },

  /* ── Proposals children ─────────────────────────────────── */
  {
    id: "activeProposals", href: "/proposals?status=active",
    labelKey: "tree.activeProposals", iconKey: "vote",
    color: "#ea580c", colorLight: "#fdba74", glow: "rgba(234,88,12,0.25)",
    descKey: "tree.activeProposalsDesc", actionKey: "tree.browse",
    parent: "proposals",
  },
  {
    id: "curation", href: "/proposals?status=curation",
    labelKey: "tree.curation", iconKey: "search",
    color: "#9a3412", colorLight: "#f97316", glow: "rgba(154,52,18,0.25)",
    descKey: "tree.curationDesc", actionKey: "tree.browse",
    parent: "proposals",
  },
  {
    id: "archiveProposals", href: "/proposals?status=closed",
    labelKey: "tree.archiveProposals", iconKey: "book",
    color: "#78350f", colorLight: "#d97706", glow: "rgba(120,53,15,0.25)",
    descKey: "tree.archiveProposalsDesc", actionKey: "tree.browse",
    parent: "proposals",
  },

  /* ── Agora children ─────────────────────────────────────── */
  {
    id: "discussions", href: "/social",
    labelKey: "tree.discussions", iconKey: "message",
    color: "#be185d", colorLight: "#f472b6", glow: "rgba(190,24,93,0.25)",
    descKey: "tree.discussionsDesc", actionKey: "tree.browse",
    parent: "agora",
  },
  {
    id: "channels", href: "/social?tab=channels",
    labelKey: "tree.channels", iconKey: "message",
    color: "#9d174d", colorLight: "#ec4899", glow: "rgba(157,23,77,0.25)",
    descKey: "tree.channelsDesc", actionKey: "tree.browse",
    parent: "agora",
  },

  /* ── Elections children ─────────────────────────────────── */
  {
    id: "activeElections", href: "/elections?status=active",
    labelKey: "tree.activeElections", iconKey: "vote",
    color: "#047857", colorLight: "#34d399", glow: "rgba(4,120,87,0.25)",
    descKey: "tree.activeElectionsDesc", actionKey: "tree.browse",
    parent: "elections",
  },
  {
    id: "pastResults", href: "/elections?status=completed",
    labelKey: "tree.pastResults", iconKey: "scale",
    color: "#065f46", colorLight: "#6ee7b7", glow: "rgba(6,95,70,0.25)",
    descKey: "tree.pastResultsDesc", actionKey: "tree.browse",
    parent: "elections",
  },

  /* ── About children ─────────────────────────────────────── */
  {
    id: "mission", href: "/about#mission",
    labelKey: "tree.mission", iconKey: "heart",
    color: "#0e7490", colorLight: "#22d3ee", glow: "rgba(14,116,144,0.25)",
    descKey: "tree.missionDesc", actionKey: "tree.learn",
    parent: "about",
  },
  {
    id: "charter", href: "/about#charter",
    labelKey: "tree.charter", iconKey: "fileText",
    color: "#155e75", colorLight: "#67e8f9", glow: "rgba(21,94,117,0.25)",
    descKey: "tree.charterDesc", actionKey: "tree.learn",
    parent: "about",
  },

  /* ── Personal children ──────────────────────────────────── */
  {
    id: "citizenProfile", href: "/settings",
    labelKey: "nav.citizenProfile", treeLabelKey: "tree.profile", iconKey: "user",
    color: "#6d28d9", colorLight: "#a78bfa", glow: "rgba(109,40,217,0.25)",
    descKey: "tree.profileDesc", actionKey: "tree.open",
    parent: "personal",
  },
  {
    id: "messagesNode", href: "/messages",
    labelKey: "nav.messages", treeLabelKey: "tree.messages", iconKey: "mail",
    color: "#7e22ce", colorLight: "#c084fc", glow: "rgba(126,34,206,0.25)",
    descKey: "tree.messagesDesc", actionKey: "tree.open",
    parent: "personal",
  },
  {
    id: "feedNode", href: "/feed",
    labelKey: "nav.feed", treeLabelKey: "tree.feed", iconKey: "rss",
    color: "#5b21b6", colorLight: "#a78bfa", glow: "rgba(91,33,182,0.25)",
    descKey: "tree.feedDesc", actionKey: "tree.open",
    parent: "personal",
  },
  {
    id: "delegationsNode", href: "/dashboard/delegations",
    labelKey: "nav.delegations", treeLabelKey: "tree.delegations", iconKey: "users",
    color: "#4c1d95", colorLight: "#8b5cf6", glow: "rgba(76,29,149,0.25)",
    descKey: "tree.delegationsDesc", actionKey: "tree.open",
    parent: "personal",
  },
  {
    id: "positions", href: "/admin",
    labelKey: "nav.positions", treeLabelKey: "tree.positions", iconKey: "shield",
    color: "#6d28d9", colorLight: "#c4b5fd", glow: "rgba(109,40,217,0.25)",
    descKey: "tree.positionsDesc", actionKey: "tree.open",
    parent: "personal",
  },
  {
    id: "settingsNode", href: "/settings",
    labelKey: "nav.settings", treeLabelKey: "tree.settings", iconKey: "settings",
    color: "#4b5563", colorLight: "#9ca3af", glow: "rgba(75,85,99,0.25)",
    descKey: "tree.settingsDesc", actionKey: "tree.open",
    parent: "personal",
  },
];

/* ═══════════════════════════════════════════════════════════
   Helper functions
   ═══════════════════════════════════════════════════════════ */

export function getNodeById(id: string): PlatformNode | undefined {
  return PLATFORM_NODES.find((n) => n.id === id);
}

export function getChildren(parentId: string): PlatformNode[] {
  return PLATFORM_NODES.filter((n) => n.parent === parentId);
}

/* ═══════════════════════════════════════════════════════════
   Pre-computed node groups (used by Navbar / AppSidebar)
   ═══════════════════════════════════════════════════════════ */

/** Items shown in the Groups dropdown (Navbar) and sidebar accordion */
export const GROUP_NODES = getChildren("groups");

/** Main sidebar nav items (below Groups accordion) */
export const SIDEBAR_MAIN_NODES: PlatformNode[] = [
  "laws", "proposals", "elections", "agora", "about", "verify",
].map((id) => getNodeById(id)!);

/** User personal-space nav items (sidebar + navbar dropdown) */
export const USER_NAV_NODES: PlatformNode[] = [
  "citizenProfile", "messagesNode", "feedNode",
].map((id) => getNodeById(id)!);

/* ═══════════════════════════════════════════════════════════
   PangeaTree — buildPlatformTree()
   Builds the nested tree structure expected by PangeaTree,
   resolving treeLabelKey where present.
   ═══════════════════════════════════════════════════════════ */

function toPlatformTreeNode(node: PlatformNode): PlatformTreeNode {
  const children = getChildren(node.id);
  return {
    id: node.id,
    href: node.href,
    labelKey: node.treeLabelKey ?? node.labelKey,
    iconKey: node.iconKey,
    color: node.color,
    colorLight: node.colorLight,
    glow: node.glow,
    descKey: node.descKey,
    actionKey: node.actionKey,
    actionHref: node.actionHref,
    canCreate: node.canCreate,
    createHref: node.createHref,
    children: children.length > 0 ? children.map(toPlatformTreeNode) : undefined,
  };
}

/** Root-level sections for PangeaTree (order matches original TREE) */
const TREE_ROOT_IDS = [
  "groups", "laws", "proposals", "agora", "elections", "personal", "about",
];

export const PLATFORM_TREE: PlatformTreeNode[] = TREE_ROOT_IDS.map(
  (id) => toPlatformTreeNode(getNodeById(id)!),
);

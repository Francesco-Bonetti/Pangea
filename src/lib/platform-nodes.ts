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

/** Describes how to fetch children dynamically from Supabase */
export interface DynamicChildSource {
  /** Supabase table name */
  table: string;
  /** Column filters (e.g., { group_type: 'jurisdiction' }) */
  filter?: Record<string, string>;
  /** Column that holds parent reference for recursive loading */
  parentField?: string;
  /** Select columns */
  select?: string;
  /** Column for display name */
  nameField?: string;
  /** Column for ordering */
  orderField?: string;
  /** Prefix for href generation */
  hrefPrefix?: string;
  /** Icon key for dynamic children */
  childIconKey?: string;
  /** Max items to load */
  limit?: number;
}

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
  /** If set, children are loaded dynamically from Supabase */
  dynamicChildSource?: DynamicChildSource;
}

/** Subset of PlatformNode used as PangeaTree tree node (recursive children added by buildPlatformTree) */
export interface PlatformTreeNode
  extends Omit<PlatformNode, "parent" | "labelKey" | "treeLabelKey"> {
  labelKey: string; // resolved (treeLabelKey ?? labelKey)
  children?: PlatformTreeNode[];
  /** True while async children are being fetched */
  isLoading?: boolean;
  /** True once dynamic children have been loaded */
  childrenLoaded?: boolean;
  /** If true, label is raw text (not i18n key) — used for DB-loaded nodes */
  rawLabel?: boolean;
  /** If true, description is raw text (not i18n key) */
  rawDesc?: boolean;
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
    color: "#3b82f6", colorLight: "#60a5fa", glow: "rgba(59,130,246,0.3)",
    descKey: "tree.groupsDesc", actionKey: "tree.explore",
    parent: null,
  },
  {
    id: "laws", href: "/laws",
    labelKey: "nav.laws", iconKey: "book",
    color: "#f59e0b", colorLight: "#fbbf24", glow: "rgba(245,158,11,0.3)",
    descKey: "tree.lawsDesc", actionKey: "tree.explore",
    parent: null,
  },
  {
    id: "proposals", href: "/proposals",
    labelKey: "nav.proposals", iconKey: "fileText",
    color: "#f97316", colorLight: "#fb923c", glow: "rgba(249,115,22,0.3)",
    descKey: "tree.proposalsDesc", actionKey: "tree.explore",
    parent: null,
  },
  {
    id: "elections", href: "/elections",
    labelKey: "nav.elections", iconKey: "vote",
    color: "#10b981", colorLight: "#34d399", glow: "rgba(16,185,129,0.3)",
    descKey: "tree.electionsDesc", actionKey: "tree.explore",
    parent: null,
  },
  {
    id: "agora", href: "/social",
    labelKey: "nav.forum", treeLabelKey: "tree.agora", iconKey: "message",
    color: "#ec4899", colorLight: "#f472b6", glow: "rgba(236,72,153,0.3)",
    descKey: "tree.agoraDesc", actionKey: "tree.explore",
    parent: null,
  },
  {
    id: "about", href: "/about",
    labelKey: "nav.about", iconKey: "info",
    color: "#06b6d4", colorLight: "#22d3ee", glow: "rgba(6,182,212,0.3)",
    descKey: "tree.aboutDesc", actionKey: "tree.learn",
    parent: null,
  },
  {
    id: "verify", href: "/verify",
    labelKey: "integrity.navTitle", iconKey: "shieldCheck",
    color: "#64748b", colorLight: "#94a3b8", glow: "rgba(100,116,139,0.25)",
    descKey: "tree.verifyDesc", actionKey: "tree.open",
    parent: null,
  },

  /* ── Personal space (tree section + user dropdown) ────── */
  {
    id: "personal", href: "/settings",
    labelKey: "nav.yourSpace", treeLabelKey: "tree.personal", iconKey: "user",
    color: "#8b5cf6", colorLight: "#a78bfa", glow: "rgba(139,92,246,0.3)",
    descKey: "tree.personalDesc", actionKey: "tree.open",
    parent: null,
  },

  /* ── Groups children ───────────────────────────────────── */
  {
    id: "jurisdictions", href: "/groups?type=jurisdiction",
    labelKey: "nav.jurisdictions", iconKey: "landmark",
    color: "#2563eb", colorLight: "#60a5fa", glow: "rgba(37,99,235,0.3)",
    descKey: "tree.jurisdictionsDesc", actionKey: "tree.browse",
    parent: "groups",
    dynamicChildSource: {
      table: "groups", filter: { group_type: "jurisdiction" },
      parentField: "parent_group_id", nameField: "name",
      select: "id,uid,name,description,logo_emoji,parent_group_id",
      hrefPrefix: "/groups/", childIconKey: "landmark", orderField: "name", limit: 50,
    },
  },
  {
    id: "parties", href: "/groups?type=party",
    labelKey: "nav.movements", treeLabelKey: "tree.parties", iconKey: "flag",
    color: "#ef4444", colorLight: "#f87171", glow: "rgba(239,68,68,0.3)",
    descKey: "tree.partiesDesc", actionKey: "tree.browse",
    canCreate: true, createHref: "/groups?type=party&create=1",
    parent: "groups",
    dynamicChildSource: {
      table: "groups", filter: { group_type: "party" },
      parentField: "parent_group_id", nameField: "name",
      select: "id,uid,name,description,logo_emoji,parent_group_id",
      hrefPrefix: "/groups/", childIconKey: "flag", orderField: "name", limit: 50,
    },
  },
  {
    id: "communities", href: "/groups?type=community",
    labelKey: "nav.communities", iconKey: "users",
    color: "#8b5cf6", colorLight: "#a78bfa", glow: "rgba(139,92,246,0.3)",
    descKey: "tree.communitiesDesc", actionKey: "tree.browse",
    canCreate: true, createHref: "/groups?type=community&create=1",
    parent: "groups",
    dynamicChildSource: {
      table: "groups", filter: { group_type: "community" },
      parentField: "parent_group_id", nameField: "name",
      select: "id,uid,name,description,logo_emoji,parent_group_id",
      hrefPrefix: "/groups/", childIconKey: "users", orderField: "name", limit: 50,
    },
  },
  {
    id: "workingGroups", href: "/groups?type=working_group",
    labelKey: "nav.workingGroups", treeLabelKey: "tree.workingGroups", iconKey: "wrench",
    color: "#14b8a6", colorLight: "#2dd4bf", glow: "rgba(20,184,166,0.3)",
    descKey: "tree.workingGroupsDesc", actionKey: "tree.browse",
    canCreate: true, createHref: "/groups?type=working_group&create=1",
    parent: "groups",
    dynamicChildSource: {
      table: "groups", filter: { group_type: "working_group" },
      parentField: "parent_group_id", nameField: "name",
      select: "id,uid,name,description,logo_emoji,parent_group_id",
      hrefPrefix: "/groups/", childIconKey: "wrench", orderField: "name", limit: 50,
    },
  },
  {
    id: "religions", href: "/groups?type=religion",
    labelKey: "nav.religions", iconKey: "heart",
    color: "#06b6d4", colorLight: "#67e8f9", glow: "rgba(6,182,212,0.3)",
    descKey: "tree.religionsDesc", actionKey: "tree.browse",
    canCreate: true, createHref: "/groups?type=religion&create=1",
    parent: "groups",
    dynamicChildSource: {
      table: "groups", filter: { group_type: "religion" },
      parentField: "parent_group_id", nameField: "name",
      select: "id,uid,name,description,logo_emoji,parent_group_id",
      hrefPrefix: "/groups/", childIconKey: "heart", orderField: "name", limit: 50,
    },
  },

  /* ── Laws children ──────────────────────────────────────── */
  {
    id: "browseLaws", href: "/laws",
    labelKey: "tree.browseLaws", iconKey: "search",
    color: "#eab308", colorLight: "#facc15", glow: "rgba(234,179,8,0.3)",
    descKey: "tree.browseLawsDesc", actionKey: "tree.browse",
    parent: "laws",
    dynamicChildSource: {
      table: "laws", filter: {},
      parentField: "parent_id", nameField: "title",
      select: "id,uid,title,code,law_type,parent_id,article_number",
      hrefPrefix: "/laws/", childIconKey: "book", orderField: "article_number", limit: 60,
    },
  },
  {
    id: "proposeLaw", href: "/laws?propose=1",
    labelKey: "tree.proposeLaw", iconKey: "fileText",
    color: "#d97706", colorLight: "#fbbf24", glow: "rgba(217,119,6,0.3)",
    descKey: "tree.proposeLawDesc", actionKey: "tree.create",
    parent: "laws",
  },

  /* ── Proposals children ─────────────────────────────────── */
  {
    id: "activeProposals", href: "/proposals?status=active",
    labelKey: "tree.activeProposals", iconKey: "vote",
    color: "#fb923c", colorLight: "#fdba74", glow: "rgba(251,146,60,0.3)",
    descKey: "tree.activeProposalsDesc", actionKey: "tree.browse",
    parent: "proposals",
    dynamicChildSource: {
      table: "proposals", filter: { status: "active" },
      nameField: "title", select: "id,uid,title,status",
      hrefPrefix: "/proposals/", childIconKey: "fileText", orderField: "created_at", limit: 20,
    },
  },
  {
    id: "curation", href: "/proposals?status=curation",
    labelKey: "tree.curation", iconKey: "search",
    color: "#e27b30", colorLight: "#f59e0b", glow: "rgba(226,123,48,0.3)",
    descKey: "tree.curationDesc", actionKey: "tree.browse",
    parent: "proposals",
  },
  {
    id: "archiveProposals", href: "/proposals?status=closed",
    labelKey: "tree.archiveProposals", iconKey: "book",
    color: "#c2710c", colorLight: "#e89020", glow: "rgba(194,113,12,0.25)",
    descKey: "tree.archiveProposalsDesc", actionKey: "tree.browse",
    parent: "proposals",
  },

  /* ── Agora children ─────────────────────────────────────── */
  {
    id: "discussions", href: "/social",
    labelKey: "tree.discussions", iconKey: "message",
    color: "#ec4899", colorLight: "#f9a8d4", glow: "rgba(236,72,153,0.3)",
    descKey: "tree.discussionsDesc", actionKey: "tree.browse",
    parent: "agora",
    dynamicChildSource: {
      table: "discussion_channels", filter: {},
      parentField: "parent_id", nameField: "name",
      select: "id,uid,name,description,emoji,color,sort_order,parent_id",
      hrefPrefix: "/social?channel=", childIconKey: "message", orderField: "sort_order", limit: 30,
    },
  },
  {
    id: "channels", href: "/social?tab=channels",
    labelKey: "tree.channels", iconKey: "message",
    color: "#db2777", colorLight: "#f472b6", glow: "rgba(219,39,119,0.3)",
    descKey: "tree.channelsDesc", actionKey: "tree.browse",
    parent: "agora",
  },

  /* ── Elections children ─────────────────────────────────── */
  {
    id: "activeElections", href: "/elections?status=active",
    labelKey: "tree.activeElections", iconKey: "vote",
    color: "#10b981", colorLight: "#6ee7b7", glow: "rgba(16,185,129,0.3)",
    descKey: "tree.activeElectionsDesc", actionKey: "tree.browse",
    parent: "elections",
    dynamicChildSource: {
      table: "elections", filter: {},
      nameField: "title", select: "id,uid,title,status,election_type",
      hrefPrefix: "/elections/", childIconKey: "vote", orderField: "created_at", limit: 20,
    },
  },
  {
    id: "pastResults", href: "/elections?status=completed",
    labelKey: "tree.pastResults", iconKey: "scale",
    color: "#059669", colorLight: "#34d399", glow: "rgba(5,150,105,0.3)",
    descKey: "tree.pastResultsDesc", actionKey: "tree.browse",
    parent: "elections",
  },

  /* ── About children ─────────────────────────────────────── */
  {
    id: "mission", href: "/about#mission",
    labelKey: "tree.mission", iconKey: "heart",
    color: "#06b6d4", colorLight: "#67e8f9", glow: "rgba(6,182,212,0.3)",
    descKey: "tree.missionDesc", actionKey: "tree.learn",
    parent: "about",
  },
  {
    id: "charter", href: "/about#charter",
    labelKey: "tree.charter", iconKey: "fileText",
    color: "#0891b2", colorLight: "#22d3ee", glow: "rgba(8,145,178,0.3)",
    descKey: "tree.charterDesc", actionKey: "tree.learn",
    parent: "about",
  },

  /* ── Personal children ──────────────────────────────────── */
  {
    id: "citizenProfile", href: "/settings",
    labelKey: "nav.citizenProfile", treeLabelKey: "tree.profile", iconKey: "user",
    color: "#8b5cf6", colorLight: "#c4b5fd", glow: "rgba(139,92,246,0.3)",
    descKey: "tree.profileDesc", actionKey: "tree.open",
    parent: "personal",
  },
  {
    id: "messagesNode", href: "/messages",
    labelKey: "nav.messages", treeLabelKey: "tree.messages", iconKey: "mail",
    color: "#a855f7", colorLight: "#c084fc", glow: "rgba(168,85,247,0.3)",
    descKey: "tree.messagesDesc", actionKey: "tree.open",
    parent: "personal",
  },
  {
    id: "feedNode", href: "/feed",
    labelKey: "nav.feed", treeLabelKey: "tree.feed", iconKey: "rss",
    color: "#7c3aed", colorLight: "#a78bfa", glow: "rgba(124,58,237,0.3)",
    descKey: "tree.feedDesc", actionKey: "tree.open",
    parent: "personal",
  },
  {
    id: "delegationsNode", href: "/dashboard/delegations",
    labelKey: "nav.delegations", treeLabelKey: "tree.delegations", iconKey: "users",
    color: "#6d28d9", colorLight: "#a78bfa", glow: "rgba(109,40,217,0.3)",
    descKey: "tree.delegationsDesc", actionKey: "tree.open",
    parent: "personal",
  },
  {
    id: "positions", href: "/admin",
    labelKey: "nav.positions", treeLabelKey: "tree.positions", iconKey: "shield",
    color: "#9333ea", colorLight: "#c084fc", glow: "rgba(147,51,234,0.3)",
    descKey: "tree.positionsDesc", actionKey: "tree.open",
    parent: "personal",
  },
  {
    id: "settingsNode", href: "/settings",
    labelKey: "nav.settings", treeLabelKey: "tree.settings", iconKey: "settings",
    color: "#64748b", colorLight: "#94a3b8", glow: "rgba(100,116,139,0.25)",
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
    dynamicChildSource: node.dynamicChildSource,
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

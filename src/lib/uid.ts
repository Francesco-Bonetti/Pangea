/**
 * Universal Entity ID (UID) System
 * Every entity in Pangea has a permanent, unique, human-readable code.
 * Format: PREFIX-8alphanumeric (e.g. LAW-a4f8b2c1)
 */

// ── Prefix mapping ──
export const UID_PREFIXES = {
  profiles: "CIT",
  proposals: "PRP",
  laws: "LAW",
  discussions: "DSC",
  discussion_replies: "RPL",
  discussion_channels: "CHN",
  groups: "GRP",
  elections: "ELC",
  candidates: "CND",
  delegations: "DLG",
  categories: "CAT",
  tags: "TAG",
  comments: "CMT",
  dm_conversations: "DMC",
  dm_messages: "MSG",
  bug_reports: "BUG",
  group_forum_posts: "PST",
  feed_events: "FEV",
  votes: "VOT",
  election_votes: "ELV",
} as const;

export type EntityTable = keyof typeof UID_PREFIXES;
export type UidPrefix = (typeof UID_PREFIXES)[EntityTable];

// ── Reverse mapping: prefix → table ──
export const PREFIX_TO_TABLE: Record<string, EntityTable> = Object.fromEntries(
  Object.entries(UID_PREFIXES).map(([table, prefix]) => [prefix, table as EntityTable])
) as Record<string, EntityTable>;

// ── Entity type labels (for UI) ──
export const ENTITY_TYPE_LABELS: Record<UidPrefix, string> = {
  CIT: "Citizen",
  PRP: "Proposal",
  LAW: "Law",
  DSC: "Discussion",
  RPL: "Reply",
  CHN: "Channel",
  GRP: "Group",
  ELC: "Election",
  CND: "Candidate",
  DLG: "Delegation",
  CAT: "Category",
  TAG: "Tag",
  CMT: "Comment",
  DMC: "Conversation",
  MSG: "Message",
  BUG: "Bug Report",
  PST: "Post",
  FEV: "Feed Event",
  VOT: "Vote",
  ELV: "Election Vote",
};

// ── Color mapping for each prefix ──
export const UID_COLORS: Record<UidPrefix, { bg: string; text: string; border: string }> = {
  CIT: { bg: "bg-blue-500/15", text: "text-blue-400", border: "border-blue-500/30" },
  PRP: { bg: "bg-amber-500/15", text: "text-amber-400", border: "border-amber-500/30" },
  LAW: { bg: "bg-orange-500/15", text: "text-orange-400", border: "border-orange-500/30" },
  DSC: { bg: "bg-cyan-500/15", text: "text-cyan-400", border: "border-cyan-500/30" },
  RPL: { bg: "bg-cyan-500/10", text: "text-cyan-300", border: "border-cyan-500/20" },
  CHN: { bg: "bg-teal-500/15", text: "text-teal-400", border: "border-teal-500/30" },
  GRP: { bg: "bg-purple-500/15", text: "text-purple-400", border: "border-purple-500/30" },
  ELC: { bg: "bg-rose-500/15", text: "text-rose-400", border: "border-rose-500/30" },
  CND: { bg: "bg-rose-500/10", text: "text-rose-300", border: "border-rose-500/20" },
  DLG: { bg: "bg-indigo-500/15", text: "text-indigo-400", border: "border-indigo-500/30" },
  CAT: { bg: "bg-slate-500/15", text: "text-slate-400", border: "border-slate-500/30" },
  TAG: { bg: "bg-lime-500/15", text: "text-lime-400", border: "border-lime-500/30" },
  CMT: { bg: "bg-gray-500/15", text: "text-gray-400", border: "border-gray-500/30" },
  DMC: { bg: "bg-violet-500/15", text: "text-violet-400", border: "border-violet-500/30" },
  MSG: { bg: "bg-violet-500/10", text: "text-violet-300", border: "border-violet-500/20" },
  BUG: { bg: "bg-red-500/15", text: "text-red-400", border: "border-red-500/30" },
  PST: { bg: "bg-sky-500/15", text: "text-sky-400", border: "border-sky-500/30" },
  FEV: { bg: "bg-yellow-500/15", text: "text-yellow-400", border: "border-yellow-500/30" },
  VOT: { bg: "bg-green-500/15", text: "text-green-400", border: "border-green-500/30" },
  ELV: { bg: "bg-green-500/10", text: "text-green-300", border: "border-green-500/20" },
};

// ── Parse a UID string ──
export function parseUid(uid: string): { prefix: UidPrefix; code: string; table: EntityTable } | null {
  const match = uid.match(/^([A-Z]{3})-([a-z0-9]{8})$/);
  if (!match) return null;
  const prefix = match[1] as UidPrefix;
  const table = PREFIX_TO_TABLE[prefix];
  if (!table) return null;
  return { prefix, code: match[2], table };
}

// ── Validate a UID string ──
export function isValidUid(uid: string): boolean {
  return parseUid(uid) !== null;
}

// ── Get the route for an entity by UID ──
export function getEntityRoute(uid: string): string | null {
  const parsed = parseUid(uid);
  if (!parsed) return null;

  switch (parsed.prefix) {
    case "CIT": return `/profile/${uid}`;
    case "PRP": return `/proposals?uid=${uid}`;
    case "LAW": return `/laws?uid=${uid}`;
    case "DSC": return `/forum?uid=${uid}`;
    case "RPL": return `/forum?reply=${uid}`;
    case "GRP": return `/groups?uid=${uid}`;
    case "ELC": return `/elections?uid=${uid}`;
    case "DLG": return `/delegations?uid=${uid}`;
    case "CAT": return `/proposals?category=${uid}`;
    case "TAG": return `/forum?tag=${uid}`;
    case "BUG": return `/admin/bugs?uid=${uid}`;
    default: return null;
  }
}

// ── Copy UID to clipboard ──
export async function copyUidToClipboard(uid: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(uid);
    return true;
  } catch {
    return false;
  }
}

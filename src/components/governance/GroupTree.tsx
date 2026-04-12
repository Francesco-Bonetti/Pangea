"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ChevronRight,
  ChevronDown,
  Users,
  FolderTree,
  Map,
  Flag,
  Globe,
  Briefcase,
  Layers,
} from "lucide-react";
import type { GroupTreeNode, GroupType } from "@/lib/types";
import { useLanguage } from "@/components/core/language-provider";

/* ── Icon + color by group type ── */
const GROUP_TYPE_CONFIG: Record<
  GroupType,
  { icon: typeof Globe; color: string; bgColor: string }
> = {
  jurisdiction: { icon: Map, color: "text-emerald-400", bgColor: "bg-emerald-500/15" },
  party: { icon: Flag, color: "text-purple-400", bgColor: "bg-purple-500/15" },
  community: { icon: Globe, color: "text-blue-400", bgColor: "bg-blue-500/15" },
  working_group: { icon: Briefcase, color: "text-amber-400", bgColor: "bg-amber-500/15" },
  religion: { icon: Globe, color: "text-teal-400", bgColor: "bg-teal-500/15" },
  custom: { icon: Layers, color: "text-slate-400", bgColor: "bg-slate-500/15" },
};

/* ── Build nested tree from flat list ── */
export function buildTree(flatNodes: GroupTreeNode[], rootId?: string | null): GroupTreeNode[] {
  const map: Record<string, GroupTreeNode> = {};
  const roots: GroupTreeNode[] = [];

  // Clone nodes and init children
  for (const node of flatNodes) {
    map[node.id] = { ...node, children: [] };
  }

  for (const node of flatNodes) {
    const current = map[node.id];
    if (node.parent_group_id && map[node.parent_group_id]) {
      map[node.parent_group_id].children!.push(current);
    } else if (!rootId || node.parent_group_id === rootId) {
      roots.push(current);
    }
  }

  return roots;
}

/* ── Single tree row ── */
function TreeRow({
  node,
  depth = 0,
  expandedIds,
  toggleExpand,
}: {
  node: GroupTreeNode;
  depth?: number;
  expandedIds: Set<string>;
  toggleExpand: (id: string) => void;
}) {
  const { t } = useLanguage();
  const isExpanded = expandedIds.has(node.id);
  const hasChildren = (node.children?.length ?? 0) > 0 || node.child_count > 0;
  const config = GROUP_TYPE_CONFIG[node.group_type] || GROUP_TYPE_CONFIG.custom;
  const TypeIcon = config.icon;

  return (
    <>
      <div
        className="flex items-center gap-2 py-2 px-3 rounded-lg transition-colors duration-150 hover:bg-[var(--muted)] group"
        style={{ paddingLeft: `${depth * 24 + 12}px` }}
      >
        {/* Expand/collapse toggle */}
        <button
          onClick={() => hasChildren && toggleExpand(node.id)}
          className={`p-0.5 rounded transition-colors ${hasChildren ? "hover:bg-[var(--muted)] cursor-pointer" : "opacity-0 pointer-events-none"}`}
        >
          {isExpanded ? (
            <ChevronDown className="w-4 h-4" style={{ color: "var(--muted-foreground)" }} />
          ) : (
            <ChevronRight className="w-4 h-4" style={{ color: "var(--muted-foreground)" }} />
          )}
        </button>

        {/* Emoji */}
        <span className="text-lg shrink-0">{node.logo_emoji}</span>

        {/* Name (link to detail) */}
        <Link
          href={`/groups/${node.id}`}
          className="flex-1 min-w-0 text-sm font-medium truncate hover:underline"
          style={{ color: "var(--foreground)" }}
        >
          {node.name}
        </Link>

        {/* Type badge */}
        <span className={`px-2 py-0.5 text-[10px] font-semibold rounded-full ${config.bgColor} ${config.color} uppercase tracking-wider shrink-0`}>
          {t(`groups.type.${node.group_type}`)}
        </span>

        {/* Member count */}
        <span className="flex items-center gap-1 text-xs shrink-0" style={{ color: "var(--muted-foreground)" }}>
          <Users className="w-3.5 h-3.5" />
          {node.member_count}
        </span>

        {/* Subgroup count */}
        {node.child_count > 0 && (
          <span className="flex items-center gap-1 text-xs shrink-0" style={{ color: "var(--muted-foreground)" }}>
            <FolderTree className="w-3.5 h-3.5" />
            {node.child_count}
          </span>
        )}
      </div>

      {/* Render children if expanded */}
      {isExpanded && node.children?.map((child) => (
        <TreeRow
          key={child.id}
          node={child}
          depth={depth + 1}
          expandedIds={expandedIds}
          toggleExpand={toggleExpand}
        />
      ))}
    </>
  );
}

/* ── Main GroupTree component ── */
export default function GroupTree({
  nodes,
  rootId,
  defaultExpanded = true,
}: {
  nodes: GroupTreeNode[];
  rootId?: string | null;
  defaultExpanded?: boolean;
}) {
  const tree = buildTree(nodes, rootId);

  // Default expand first level
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => {
    if (defaultExpanded) {
      return new Set(tree.map((n) => n.id));
    }
    return new Set<string>();
  });

  function toggleExpand(id: string) {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  if (tree.length === 0) {
    return (
      <div className="text-center py-12" style={{ color: "var(--muted-foreground)" }}>
        <FolderTree className="w-12 h-12 mx-auto mb-3 opacity-40" />
        <p className="text-sm">No groups found</p>
      </div>
    );
  }

  return (
    <div className="space-y-0.5">
      {tree.map((node) => (
        <TreeRow
          key={node.id}
          node={node}
          expandedIds={expandedIds}
          toggleExpand={toggleExpand}
        />
      ))}
    </div>
  );
}

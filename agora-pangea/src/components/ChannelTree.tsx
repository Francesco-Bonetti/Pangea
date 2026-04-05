"use client";

import { useState } from "react";
import { ChevronRight, ChevronDown, MessageCircle, FolderOpen } from "lucide-react";
import type { DiscussionChannel } from "@/lib/types";
import { useLanguage } from "@/components/language-provider";

/* ── Build nested tree from flat list ── */
export function buildChannelTree(
  flatChannels: DiscussionChannel[],
  rootId?: string | null
): DiscussionChannel[] {
  const map: Record<string, DiscussionChannel> = {};
  const roots: DiscussionChannel[] = [];

  // Clone nodes and init children
  for (const ch of flatChannels) {
    map[ch.id] = { ...ch, children: [] };
  }

  for (const ch of flatChannels) {
    const current = map[ch.id];
    if (ch.parent_id && map[ch.parent_id]) {
      map[ch.parent_id].children!.push(current);
    } else if (!rootId || ch.parent_id === rootId) {
      roots.push(current);
    }
  }

  return roots;
}

/* ── Single channel row in tree ── */
function ChannelRow({
  channel,
  depth = 0,
  activeChannel,
  expandedIds,
  toggleExpand,
}: {
  channel: DiscussionChannel;
  depth?: number;
  activeChannel?: string;
  expandedIds: Set<string>;
  toggleExpand: (id: string) => void;
}) {
  const isExpanded = expandedIds.has(channel.id);
  const hasChildren = (channel.children?.length ?? 0) > 0 || channel.child_count > 0;
  const isActive = activeChannel === channel.id;

  return (
    <>
      <div
        className="flex items-center gap-1.5 group"
        style={{ paddingLeft: `${depth * 16 + 4}px` }}
      >
        {/* Expand/collapse toggle */}
        {hasChildren ? (
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              toggleExpand(channel.id);
            }}
            className="p-0.5 rounded transition-colors hover:bg-white/10 shrink-0"
          >
            {isExpanded ? (
              <ChevronDown className="w-3.5 h-3.5 text-fg-muted" />
            ) : (
              <ChevronRight className="w-3.5 h-3.5 text-fg-muted" />
            )}
          </button>
        ) : (
          <span className="w-[18px] shrink-0" />
        )}

        {/* Channel link */}
        <a
          href={`/social?channel=${channel.id}`}
          className={`flex-1 flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm transition-colors min-w-0 ${
            isActive
              ? "bg-pangea-900/40 text-fg-primary border border-pangea-700/50"
              : "text-fg-muted hover:text-fg hover:bg-theme-muted/30"
          }`}
        >
          <span className="text-base shrink-0">{channel.emoji}</span>
          <span className="truncate">{channel.name}</span>
          {channel.discussion_count > 0 && (
            <span className="ml-auto text-[10px] opacity-60 shrink-0">
              {channel.discussion_count}
            </span>
          )}
        </a>
      </div>

      {/* Children */}
      {isExpanded &&
        channel.children?.map((child) => (
          <ChannelRow
            key={child.id}
            channel={child}
            depth={depth + 1}
            activeChannel={activeChannel}
            expandedIds={expandedIds}
            toggleExpand={toggleExpand}
          />
        ))}
    </>
  );
}

/* ── Main ChannelTree component ── */
export default function ChannelTree({
  channels,
  activeChannel,
  defaultExpanded = true,
}: {
  channels: DiscussionChannel[];
  activeChannel?: string;
  defaultExpanded?: boolean;
}) {
  const { t } = useLanguage();
  const tree = buildChannelTree(channels);

  // Default expand all root-level channels
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

  return (
    <div className="card p-4">
      <h3 className="text-sm font-semibold text-fg mb-3 flex items-center gap-2">
        <FolderOpen className="w-4 h-4 text-fg-primary" />
        {t("forum.channels")}
      </h3>
      <div className="space-y-0.5">
        {/* All Channels option */}
        <a
          href="/social"
          className={`flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm transition-colors ${
            !activeChannel
              ? "bg-pangea-900/40 text-fg-primary border border-pangea-700/50"
              : "text-fg-muted hover:text-fg hover:bg-theme-muted/30"
          }`}
        >
          <MessageCircle className="w-4 h-4 shrink-0" />
          <span>{t("forum.allChannels")}</span>
        </a>

        {/* Tree */}
        {tree.map((ch) => (
          <ChannelRow
            key={ch.id}
            channel={ch}
            activeChannel={activeChannel}
            expandedIds={expandedIds}
            toggleExpand={toggleExpand}
          />
        ))}
      </div>
    </div>
  );
}

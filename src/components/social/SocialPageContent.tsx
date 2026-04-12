"use client";

import { useState } from "react";
import { MessageCircle, TrendingUp, ArrowLeft, ChevronRight, ChevronDown, FolderTree, MessageSquare } from "lucide-react";
import Link from "next/link";
import { useLanguage } from "@/components/core/language-provider";
import type { DiscussionChannel, Tag } from "@/lib/types";

/* ── Build nested tree from flat channel list ── */
function buildChannelTree(flatChannels: DiscussionChannel[]): DiscussionChannel[] {
  const map: Record<string, DiscussionChannel> = {};
  const roots: DiscussionChannel[] = [];

  for (const ch of flatChannels) {
    map[ch.id] = { ...ch, children: [] };
  }

  for (const ch of flatChannels) {
    const current = map[ch.id];
    if (ch.parent_id && map[ch.parent_id]) {
      map[ch.parent_id].children!.push(current);
    } else {
      roots.push(current);
    }
  }

  return roots;
}

/* ── Page Header ── */
export function SocialHeader() {
  const { t } = useLanguage();
  return (
    <div className="flex items-center gap-4 mb-8 overflow-hidden">
      <Link
        href="/dashboard"
        className="p-2 rounded-lg text-fg-muted hover:text-fg hover:bg-theme-card transition-colors shrink-0"
      >
        <ArrowLeft className="w-5 h-5" />
      </Link>
      <div className="flex-1 min-w-0">
        <h1 className="text-3xl font-bold text-fg flex items-center gap-2 overflow-hidden">
          <MessageCircle className="w-8 h-8 text-fg-primary shrink-0" />
          <span className="truncate">{t("forum.title")}</span>
        </h1>
        <p className="text-sm text-fg-muted mt-1">
          {t("forum.joinDiscussion")}
        </p>
      </div>
    </div>
  );
}

/* ── New Discussion CTA ── */
export function NewDiscussionCTA({ isLoggedIn }: { isLoggedIn: boolean }) {
  const { t } = useLanguage();
  if (!isLoggedIn) {
    return (
      <a
        href="/auth"
        className="w-full block px-4 py-3 bg-theme-muted hover:bg-theme-muted text-fg font-medium rounded-lg text-center transition-colors"
      >
        {t("forum.signIn")}
      </a>
    );
  }
  return null;
}

/* ── Single channel row in tree ── */
function ChannelTreeRow({
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
  const hasChildren = (channel.children?.length ?? 0) > 0;
  const isActive = activeChannel === channel.id;

  return (
    <>
      <div
        className={`flex items-center gap-1.5 rounded-lg text-sm transition-colors ${
          isActive
            ? "bg-pangea-900/40 text-fg-primary border border-pangea-700/50"
            : "text-fg-muted hover:text-fg hover:bg-theme-muted/30"
        }`}
        style={{ paddingLeft: `${depth * 16 + 8}px`, paddingRight: "8px", paddingTop: "6px", paddingBottom: "6px" }}
      >
        {/* Expand toggle */}
        {hasChildren ? (
          <button
            onClick={(e) => { e.preventDefault(); toggleExpand(channel.id); }}
            className="p-0.5 rounded hover:bg-theme-muted/50 shrink-0"
          >
            {isExpanded ? (
              <ChevronDown className="w-3.5 h-3.5" />
            ) : (
              <ChevronRight className="w-3.5 h-3.5" />
            )}
          </button>
        ) : (
          <span className="w-4.5 shrink-0" />
        )}

        {/* Channel link */}
        <a
          href={`/social?channel=${channel.id}`}
          className="flex items-center gap-2 flex-1 min-w-0"
        >
          <span className="text-base shrink-0">{channel.emoji}</span>
          <span className="truncate">{channel.name}</span>
        </a>

        {/* Discussion count badge */}
        {channel.discussion_count > 0 && (
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-theme-muted/50 text-fg-muted shrink-0">
            {channel.discussion_count}
          </span>
        )}
      </div>

      {/* Render children if expanded */}
      {isExpanded && channel.children?.map((child) => (
        <ChannelTreeRow
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

/* ── Channels Sidebar (Tree) ── */
export function ChannelsSidebar({
  channels,
  activeChannel,
}: {
  channels: DiscussionChannel[];
  activeChannel?: string;
}) {
  const { t } = useLanguage();
  const tree = buildChannelTree(channels);

  // Default: expand all channels that have children
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => {
    const ids = new Set<string>();
    channels.forEach((ch) => {
      if (ch.child_count > 0) ids.add(ch.id);
    });
    return ids;
  });

  function toggleExpand(id: string) {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div className="card p-4">
      <h3 className="text-sm font-semibold text-fg mb-3 flex items-center gap-2">
        <FolderTree className="w-4 h-4 text-fg-primary" />
        {t("forum.channels")}
      </h3>
      <div className="space-y-0.5">
        <a
          href="/social"
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors ${
            !activeChannel
              ? "bg-pangea-900/40 text-fg-primary border border-pangea-700/50"
              : "text-fg-muted hover:text-fg hover:bg-theme-muted/30"
          }`}
        >
          <MessageSquare className="w-3.5 h-3.5 shrink-0" />
          {t("forum.allChannels")}
        </a>
        {tree.map((ch) => (
          <ChannelTreeRow
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

/* ── Tags Sidebar ── */
export function TagsSidebar({
  tags,
  activeTag,
}: {
  tags: Tag[];
  activeTag?: string;
}) {
  const { t } = useLanguage();
  return (
    <div className="card p-4">
      <h3 className="text-sm font-semibold text-fg mb-3 flex items-center gap-2">
        <TrendingUp className="w-4 h-4 text-fg-primary" />
        {t("forum.popularTags")}
      </h3>
      <div className="flex flex-wrap gap-2">
        {tags.map((tag) => (
          <a
            key={tag.id}
            href={`/social?tag=${tag.id}`}
            className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
              activeTag === tag.id
                ? "text-fg-primary bg-pangea-900/40 border-pangea-700/50"
                : "text-fg-primary bg-pangea-900/20 border-pangea-800/30 hover:border-pangea-700/50"
            }`}
          >
            #{tag.name}
          </a>
        ))}
      </div>
    </div>
  );
}

/* ── Channel Breadcrumb ── */
export function ChannelBreadcrumb({
  ancestors,
  currentChannelId,
}: {
  ancestors: { id: string; name: string; slug: string; emoji: string; depth: number }[];
  currentChannelId?: string;
}) {
  if (ancestors.length <= 1) return null;

  return (
    <nav className="flex items-center gap-1 text-xs text-fg-muted flex-wrap mb-1">
      <a href="/social" className="hover:text-fg transition-colors">Agora</a>
      {ancestors.map((a) => (
        <span key={a.id} className="flex items-center gap-1">
          <ChevronRight className="w-3 h-3" />
          {a.id === currentChannelId ? (
            <span className="text-fg font-medium">{a.emoji} {a.name}</span>
          ) : (
            <a href={`/social?channel=${a.id}`} className="hover:text-fg transition-colors">
              {a.emoji} {a.name}
            </a>
          )}
        </span>
      ))}
    </nav>
  );
}

/* ── Discussion Section Header ── */
export function DiscussionSectionHeader({
  channelName,
  ancestors,
  currentChannelId,
}: {
  channelName?: string;
  ancestors?: { id: string; name: string; slug: string; emoji: string; depth: number }[];
  currentChannelId?: string;
}) {
  const { t } = useLanguage();
  return (
    <div>
      {ancestors && ancestors.length > 1 && (
        <ChannelBreadcrumb ancestors={ancestors} currentChannelId={currentChannelId} />
      )}
      <h2 className="text-lg font-semibold text-fg">
        {channelName || t("forum.allDiscussions")}
      </h2>
    </div>
  );
}

/* ── Start Discussion Header ── */
export function StartDiscussionHeader() {
  const { t } = useLanguage();
  return (
    <h2 className="text-lg font-semibold text-fg mb-4">
      {t("forum.startDiscussion")}
    </h2>
  );
}

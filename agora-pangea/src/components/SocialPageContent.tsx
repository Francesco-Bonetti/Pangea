"use client";

import { MessageCircle, TrendingUp, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useLanguage } from "@/components/language-provider";
import type { DiscussionChannel, Tag } from "@/lib/types";

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
  if (isLoggedIn) {
    return (
      <a
        href="#new-discussion"
        className="w-full block px-4 py-3 bg-pangea-600 hover:bg-pangea-700 text-fg font-medium rounded-lg text-center transition-colors"
      >
        + {t("forum.newDiscussion")}
      </a>
    );
  }
  return (
    <a
      href="/auth"
      className="w-full block px-4 py-3 bg-theme-muted hover:bg-theme-muted text-fg font-medium rounded-lg text-center transition-colors"
    >
      {t("forum.signIn")}
    </a>
  );
}

/* ── Channels Sidebar ── */
export function ChannelsSidebar({
  channels,
  activeChannel,
}: {
  channels: DiscussionChannel[];
  activeChannel?: string;
}) {
  const { t } = useLanguage();
  return (
    <div className="card p-4">
      <h3 className="text-sm font-semibold text-fg mb-3">
        {t("forum.channels")}
      </h3>
      <div className="space-y-2">
        <a
          href="/social"
          className={`block px-3 py-2 rounded-lg text-sm transition-colors ${
            !activeChannel
              ? "bg-pangea-900/40 text-fg-primary border border-pangea-700/50"
              : "text-fg-muted hover:text-fg hover:bg-theme-muted/30"
          }`}
        >
          {t("forum.allChannels")}
        </a>
        {channels.map((ch) => (
          <a
            key={ch.id}
            href={`/social?channel=${ch.id}`}
            className={`block px-3 py-2 rounded-lg text-sm transition-colors flex items-center gap-2 ${
              activeChannel === ch.id
                ? "bg-pangea-900/40 text-fg-primary border border-pangea-700/50"
                : "text-fg-muted hover:text-fg hover:bg-theme-muted/30"
            }`}
          >
            <span className="text-base">{ch.emoji}</span>
            <span className="truncate">{ch.name}</span>
          </a>
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

/* ── Discussion Section Header ── */
export function DiscussionSectionHeader({
  channelName,
}: {
  channelName?: string;
}) {
  const { t } = useLanguage();
  return (
    <h2 className="text-lg font-semibold text-fg">
      {channelName || t("forum.allDiscussions")}
    </h2>
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

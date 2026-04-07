"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ArrowBigUp, ArrowBigDown, MessageCircle, Eye, Pin, Lock, Flag } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { GroupForumPost } from "@/lib/types";
import PrivacyName from "@/components/PrivacyName";
import TranslatedContent from "@/components/TranslatedContent";
import UidBadge from "@/components/UidBadge";
import { stripMentions } from "@/components/MentionInput";
import { useLanguage } from "@/components/language-provider";
import { logger } from "@/lib/logger";

interface GroupDiscussionCardProps {
  post: GroupForumPost;
  groupId: string;
  userId?: string;
  onReport?: (postId: string) => void;
  showGroupBadge?: boolean;
}

function formatTimeAgo(dateString: string): string {
  const now = new Date();
  const date = new Date(dateString);
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  if (seconds < 60) return "now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  return date.toLocaleDateString();
}

export default function GroupDiscussionCard({
  post,
  groupId,
  userId,
  onReport,
  showGroupBadge = false,
}: GroupDiscussionCardProps) {
  const supabase = createClient();
  const { t } = useLanguage();
  const [upvotes, setUpvotes] = useState(post.upvotes_count || 0);
  const [downvotes, setDownvotes] = useState(post.downvotes_count || 0);
  const [userVote, setUserVote] = useState<"up" | "down" | null>(null);
  const [isVoting, setIsVoting] = useState(false);

  const handleVote = async (voteType: "up" | "down") => {
    if (!userId) return;
    setIsVoting(true);
    try {
      if (userVote === voteType) {
        // Remove vote
        await supabase
          .from("group_forum_votes")
          .delete()
          .eq("user_id", userId)
          .eq("post_id", post.id);
        if (voteType === "up") setUpvotes(Math.max(0, upvotes - 1));
        else setDownvotes(Math.max(0, downvotes - 1));
        setUserVote(null);
      } else {
        if (userVote) {
          // Remove opposite vote
          await supabase
            .from("group_forum_votes")
            .delete()
            .eq("user_id", userId)
            .eq("post_id", post.id);
          if (userVote === "up") setUpvotes(Math.max(0, upvotes - 1));
          else setDownvotes(Math.max(0, downvotes - 1));
        }
        // Insert new vote
        await supabase.from("group_forum_votes").insert({
          user_id: userId,
          post_id: post.id,
          vote_type: voteType,
        });
        if (voteType === "up") setUpvotes(upvotes + (userVote === "down" ? 0 : 1));
        else setDownvotes(downvotes + (userVote === "up" ? 0 : 1));
        setUserVote(voteType);
      }
    } catch (err) {
      logger.error("Vote error:", err);
    } finally {
      setIsVoting(false);
    }
  };

  const netScore = upvotes - downvotes;
  const cleanBody = stripMentions(post.body);
  const preview = cleanBody.length > 180 ? cleanBody.substring(0, 180) + "..." : cleanBody;

  return (
    <Link href={`/groups/${groupId}/discussion/${post.id}`}>
      <div className="p-5 rounded-xl border transition-all duration-200 hover:scale-[1.01] hover:shadow-lg group"
        style={{ backgroundColor: "var(--card)", borderColor: "var(--border)" }}
      >
        {/* Header: badges */}
        <div className="flex items-center gap-2 flex-wrap mb-2">
          {post.is_pinned && (
            <span className="inline-flex items-center gap-1 bg-purple-900/30 text-purple-400 border border-purple-700/40 px-2 py-0.5 rounded-full text-[10px] font-medium">
              <Pin className="w-3 h-3" /> {t("groupDiscussions.pinned")}
            </span>
          )}
          {post.is_locked && (
            <span className="inline-flex items-center gap-1 bg-amber-900/30 text-amber-400 border border-amber-700/40 px-2 py-0.5 rounded-full text-[10px] font-medium">
              <Lock className="w-3 h-3" /> {t("groupDiscussions.locked")}
            </span>
          )}
          {post.uid && <UidBadge uid={post.uid} size="xs" clickable={false} />}
          {showGroupBadge && post.groups && (
            <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full"
              style={{ backgroundColor: "var(--muted)", color: "var(--muted-foreground)" }}>
              {post.groups.logo_emoji} {post.groups.name}
            </span>
          )}
        </div>

        {/* Title */}
        {post.title && (
          <h3 className="font-semibold text-base leading-snug mb-1.5 group-hover:text-purple-400 transition-colors"
            style={{ color: "var(--foreground)" }}>
            <TranslatedContent text={post.title} contentType="group_post_title" contentId={post.id} compact />
          </h3>
        )}

        {/* Preview */}
        <p className="text-sm line-clamp-2 mb-3" style={{ color: "var(--muted-foreground)" }}>
          <TranslatedContent text={preview} contentType="group_post_body" contentId={post.id} compact />
        </p>

        {/* Author + time */}
        <div className="flex items-center gap-2 text-xs mb-3" style={{ color: "var(--muted-foreground)" }}>
          <span>{t("groupDiscussions.by")} <PrivacyName userId={post.author_id} fullName={post.profiles?.full_name ?? null} currentUserId={userId} /></span>
          <span>·</span>
          <span>{formatTimeAgo(post.created_at)}</span>
        </div>

        {/* Footer: voting + stats */}
        <div className="flex items-center justify-between pt-3" style={{ borderTop: "1px solid var(--border)" }}>
          <div className="flex items-center gap-3">
            <button
              onClick={(e) => { e.preventDefault(); handleVote("up"); }}
              disabled={isVoting || !userId}
              className={`flex items-center gap-1 px-2 py-1 rounded transition-colors shrink-0 ${
                userVote === "up" ? "text-purple-400 bg-purple-900/30" : "hover:bg-[var(--muted)]"
              } disabled:opacity-50`}
              style={userVote !== "up" ? { color: "var(--muted-foreground)" } : undefined}
            >
              <ArrowBigUp className="w-4 h-4" />
              <span className="text-xs font-medium">{upvotes}</span>
            </button>

            <span className={`text-xs font-semibold px-2 py-0.5 rounded ${
              netScore > 0 ? "text-green-400 bg-green-500/10" :
              netScore < 0 ? "text-red-400 bg-red-500/10" : ""
            }`} style={netScore === 0 ? { color: "var(--muted-foreground)" } : undefined}>
              {netScore > 0 ? "+" : ""}{netScore}
            </span>

            <button
              onClick={(e) => { e.preventDefault(); handleVote("down"); }}
              disabled={isVoting || !userId}
              className={`flex items-center gap-1 px-2 py-1 rounded transition-colors shrink-0 ${
                userVote === "down" ? "text-red-400 bg-red-500/20" : "hover:bg-[var(--muted)]"
              } disabled:opacity-50`}
              style={userVote !== "down" ? { color: "var(--muted-foreground)" } : undefined}
            >
              <ArrowBigDown className="w-4 h-4" />
              <span className="text-xs font-medium">{downvotes}</span>
            </button>
          </div>

          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1 text-xs" style={{ color: "var(--muted-foreground)" }}>
              <Eye className="w-3.5 h-3.5" /> {post.views_count || 0}
            </span>
            <span className="flex items-center gap-1 text-xs" style={{ color: "var(--muted-foreground)" }}>
              <MessageCircle className="w-3.5 h-3.5" /> {post.replies_count || 0}
            </span>
            {onReport && (
              <button
                onClick={(e) => { e.preventDefault(); onReport(post.id); }}
                className="p-1 rounded transition-colors hover:bg-[var(--muted)]"
                style={{ color: "var(--muted-foreground)" }}
                title={t("groupDiscussions.report")}
              >
                <Flag className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}

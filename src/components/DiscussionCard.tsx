"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ArrowBigUp, ArrowBigDown, MessageCircle, Flag } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { Discussion } from "@/lib/types";
import PrivacyName from "@/components/PrivacyName";

interface DiscussionCardProps {
  discussion: Discussion;
  userId?: string;
  onReport?: (discussionId: string) => void;
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

export default function DiscussionCard({
  discussion,
  userId,
  onReport,
}: DiscussionCardProps) {
  const supabase = createClient();
  const [upvotes, setUpvotes] = useState(discussion.upvotes_count || 0);
  const [downvotes, setDownvotes] = useState(discussion.downvotes_count || 0);
  const [userVote, setUserVote] = useState<"up" | "down" | null>(null);
  const [isVoting, setIsVoting] = useState(false);

  const handleVote = async (voteType: "up" | "down") => {
    if (!userId) {
      alert("Please sign in to vote");
      return;
    }

    setIsVoting(true);
    try {
      // If user already voted same type, remove it
      if (userVote === voteType) {
        const { error: deleteError } = await supabase
          .from("discussion_votes")
          .delete()
          .eq("user_id", userId)
          .eq("discussion_id", discussion.id)
          .eq("vote_type", voteType);

        if (!deleteError) {
          if (voteType === "up") {
            setUpvotes(Math.max(0, upvotes - 1));
          } else {
            setDownvotes(Math.max(0, downvotes - 1));
          }
          setUserVote(null);
        }
      } else {
        // First, remove opposite vote if it exists
        if (userVote) {
          await supabase
            .from("discussion_votes")
            .delete()
            .eq("user_id", userId)
            .eq("discussion_id", discussion.id)
            .eq("vote_type", userVote);

          if (userVote === "up") {
            setUpvotes(Math.max(0, upvotes - 1));
          } else {
            setDownvotes(Math.max(0, downvotes - 1));
          }
        }

        // Insert new vote
        const { error: insertError } = await supabase
          .from("discussion_votes")
          .insert([
            {
              user_id: userId,
              discussion_id: discussion.id,
              reply_id: null,
              vote_type: voteType,
            },
          ]);

        if (!insertError) {
          if (voteType === "up") {
            setUpvotes(upvotes + 1);
          } else {
            setDownvotes(downvotes + 1);
          }
          setUserVote(voteType);
        }
      }
    } catch (error) {
      console.error("Error voting:", error);
    } finally {
      setIsVoting(false);
    }
  };

  const netScore = upvotes - downvotes;
  const preview = discussion.body.length > 150 ? discussion.body.substring(0, 150) + "..." : discussion.body;

  return (
    <Link href={`/social/${discussion.id}`}>
      <div className="card p-6 hover:border-slate-600 hover:bg-slate-800/70 transition-all duration-200 group block overflow-hidden">
        {/* Header row: title + channel badge */}
        <div className="flex items-start justify-between gap-4 mb-3 overflow-hidden">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-slate-100 text-base leading-snug group-hover:text-white truncate">
              {discussion.title}
            </h3>
            {discussion.discussion_channels && (
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                <span className="inline-flex items-center gap-1 text-xs text-slate-300 bg-slate-700/40 px-2.5 py-1 rounded-full">
                  <span className="text-sm">{discussion.discussion_channels.emoji}</span>
                  {discussion.discussion_channels.name}
                </span>
                <span className="text-xs text-slate-500">
                  {formatTimeAgo(discussion.created_at)}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Preview text */}
        <p className="text-sm text-slate-300 line-clamp-2 mb-4">
          {preview}
        </p>

        {/* Tags if any */}
        {discussion.tags && discussion.tags.length > 0 && (
          <div className="flex gap-2 mb-4 flex-wrap">
            {discussion.tags.slice(0, 3).map((tag) => (
              <span
                key={tag.id}
                className="text-xs text-pangea-400 bg-pangea-900/20 px-2 py-1 rounded-full border border-pangea-800/30"
              >
                #{tag.name}
              </span>
            ))}
            {discussion.tags.length > 3 && (
              <span className="text-xs text-slate-500">+{discussion.tags.length - 3}</span>
            )}
          </div>
        )}

        {/* Author info */}
        <div className="flex items-center gap-2 text-xs text-slate-400 mb-4">
          <span>by <PrivacyName userId={discussion.author_id} fullName={discussion.profiles?.full_name ?? null} currentUserId={userId} /></span>
        </div>

        {/* Footer: voting + reply count */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-700/50 overflow-hidden">
          <div className="flex items-center gap-4 overflow-hidden">
            {/* Upvote button */}
            <button
              onClick={(e) => {
                e.preventDefault();
                handleVote("up");
              }}
              disabled={isVoting}
              className={`flex items-center gap-1 px-2 py-1 rounded transition-colors shrink-0 ${
                userVote === "up"
                  ? "text-pangea-400 bg-pangea-900/30"
                  : "text-slate-400 hover:text-slate-300 hover:bg-slate-700/30"
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              <ArrowBigUp className="w-4 h-4 shrink-0" />
              <span className="text-xs font-medium">{upvotes}</span>
            </button>

            {/* Net score */}
            <span
              className={`text-xs font-semibold px-2 py-1 rounded shrink-0 ${
                netScore > 0
                  ? "text-green-400 bg-green-900/20"
                  : netScore < 0
                    ? "text-red-400 bg-red-900/20"
                    : "text-slate-400"
              }`}
            >
              {netScore > 0 ? "+" : ""}{netScore}
            </span>

            {/* Downvote button */}
            <button
              onClick={(e) => {
                e.preventDefault();
                handleVote("down");
              }}
              disabled={isVoting}
              className={`flex items-center gap-1 px-2 py-1 rounded transition-colors shrink-0 ${
                userVote === "down"
                  ? "text-red-400 bg-red-900/30"
                  : "text-slate-400 hover:text-slate-300 hover:bg-slate-700/30"
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              <ArrowBigDown className="w-4 h-4 shrink-0" />
              <span className="text-xs font-medium">{downvotes}</span>
            </button>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {/* Reply count */}
            <div
              onClick={(e) => e.preventDefault()}
              className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-300 shrink-0"
            >
              <MessageCircle className="w-4 h-4 shrink-0" />
              <span>{discussion.replies_count || 0}</span>
            </div>

            {/* Report button */}
            <button
              onClick={(e) => {
                e.preventDefault();
                onReport?.(discussion.id);
              }}
              className="p-1 rounded text-slate-500 hover:text-slate-300 hover:bg-slate-700/30 transition-colors shrink-0"
              title="Report"
            >
              <Flag className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </Link>
  );
}

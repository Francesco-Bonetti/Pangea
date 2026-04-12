"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ArrowBigUp, ArrowBigDown, MessageCircle, Share2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { PersonalPost } from "@/lib/types";
import PrivacyName from "@/components/ui/PrivacyName";
import TranslatedContent from "@/components/ui/TranslatedContent";
import UidBadge from "@/components/ui/UidBadge";
import { formatTimeAgo } from "@/lib/formatTimeAgo";

interface PostCardProps {
  post: PersonalPost;
  userId?: string;
  showAuthor?: boolean;
}


export default function PostCard({ post, userId, showAuthor = true }: PostCardProps) {
  const supabase = createClient();
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
        await supabase.from("post_votes").delete().eq("user_id", userId).eq("post_id", post.id);
        if (voteType === "up") setUpvotes((v) => v - 1);
        else setDownvotes((v) => v - 1);
        setUserVote(null);
      } else {
        // Remove old vote if exists
        if (userVote) {
          await supabase.from("post_votes").delete().eq("user_id", userId).eq("post_id", post.id);
          if (userVote === "up") setUpvotes((v) => v - 1);
          else setDownvotes((v) => v - 1);
        }
        // Insert new vote
        await supabase.from("post_votes").insert({ user_id: userId, post_id: post.id, vote_type: voteType });
        if (voteType === "up") setUpvotes((v) => v + 1);
        else setDownvotes((v) => v + 1);
        setUserVote(voteType);
      }
    } catch (err) {
      console.error("Vote error:", err);
    } finally {
      setIsVoting(false);
    }
  };

  const score = upvotes - downvotes;

  return (
    <div
      className="p-4 rounded-xl border transition-colors hover:border-purple-500/30"
      style={{ backgroundColor: "var(--card)", borderColor: "var(--border)" }}
    >
      {/* Author header */}
      {showAuthor && (
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-600 to-purple-800 flex items-center justify-center text-xs font-bold text-white shrink-0">
            {(post.profiles?.full_name || "?")[0].toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <Link href={`/citizens/${post.author_id}`} className="hover:underline">
              <PrivacyName
                userId={post.author_id}
                fullName={post.profiles?.full_name || null}
                fallback="Anonymous"
                className="text-sm font-medium"
              />
            </Link>
            <p className="text-[10px]" style={{ color: "var(--muted-foreground)" }}>
              {formatTimeAgo(post.created_at)}
            </p>
          </div>
          {post.uid && <UidBadge uid={post.uid} size="sm" />}
        </div>
      )}

      {/* Body */}
      <div className="text-sm leading-relaxed mb-3" style={{ color: "var(--foreground)" }}>
        <TranslatedContent
          text={post.body}
          contentType="post_body"
          contentId={post.id}
          as="div"
          compact
        />
      </div>

      {/* Actions bar */}
      <div className="flex items-center gap-4 text-xs" style={{ color: "var(--muted-foreground)" }}>
        {/* Votes */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => handleVote("up")}
            disabled={isVoting || !userId}
            className={`p-1 rounded transition-colors hover:bg-green-500/10 ${userVote === "up" ? "text-green-400" : ""}`}
          >
            <ArrowBigUp className="w-4 h-4" />
          </button>
          <span className={`font-semibold min-w-[1.5rem] text-center ${score > 0 ? "text-green-400" : score < 0 ? "text-red-400" : ""}`}>
            {score}
          </span>
          <button
            onClick={() => handleVote("down")}
            disabled={isVoting || !userId}
            className={`p-1 rounded transition-colors hover:bg-red-500/10 ${userVote === "down" ? "text-red-400" : ""}`}
          >
            <ArrowBigDown className="w-4 h-4" />
          </button>
        </div>

        {/* Replies */}
        <span className="flex items-center gap-1">
          <MessageCircle className="w-3.5 h-3.5" />
          {post.replies_count || 0}
        </span>

        {/* Time (if no author shown) */}
        {!showAuthor && (
          <span>{formatTimeAgo(post.created_at)}</span>
        )}
      </div>
    </div>
  );
}

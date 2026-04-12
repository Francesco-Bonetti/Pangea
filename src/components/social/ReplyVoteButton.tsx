"use client";

import React, { useState } from "react";
import { ArrowBigUp, ArrowBigDown, Flag } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import ReportModal from "@/components/social/ReportModal";

interface ReplyVoteButtonProps {
  replyId: string;
  discussionId: string;
  initialUpvotes: number;
  initialDownvotes: number;
  initialUserVote: "up" | "down" | null;
  userId?: string;
}

export default function ReplyVoteButton({
  replyId,
  discussionId,
  initialUpvotes,
  initialDownvotes,
  initialUserVote,
  userId,
}: ReplyVoteButtonProps) {
  const supabase = createClient();
  const [upvotes, setUpvotes] = useState(initialUpvotes);
  const [downvotes, setDownvotes] = useState(initialDownvotes);
  const [userVote, setUserVote] = useState(initialUserVote);
  const [isVoting, setIsVoting] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);

  const handleVote = async (voteType: "up" | "down") => {
    if (!userId) return;
    setIsVoting(true);
    try {
      if (userVote === voteType) {
        // Remove vote
        const { error } = await supabase
          .from("discussion_votes")
          .delete()
          .eq("user_id", userId)
          .eq("reply_id", replyId)
          .eq("vote_type", voteType);

        if (!error) {
          if (voteType === "up") setUpvotes(Math.max(0, upvotes - 1));
          else setDownvotes(Math.max(0, downvotes - 1));
          setUserVote(null);
        }
      } else {
        // Remove opposite vote first
        if (userVote) {
          await supabase
            .from("discussion_votes")
            .delete()
            .eq("user_id", userId)
            .eq("reply_id", replyId)
            .eq("vote_type", userVote);
          if (userVote === "up") setUpvotes(Math.max(0, upvotes - 1));
          else setDownvotes(Math.max(0, downvotes - 1));
        }

        // Insert new vote
        const { error } = await supabase
          .from("discussion_votes")
          .insert([{
            user_id: userId,
            discussion_id: discussionId,
            reply_id: replyId,
            vote_type: voteType,
          }]);

        if (!error) {
          if (voteType === "up") setUpvotes(upvotes + 1);
          else setDownvotes(downvotes + 1);
          setUserVote(voteType);
        }
      }
    } catch (err) {
      console.error("Error voting on reply:", err);
    } finally {
      setIsVoting(false);
    }
  };

  const netScore = upvotes - downvotes;

  return (
    <>
      <div className="flex items-center gap-2">
        <button
          onClick={() => handleVote("up")}
          disabled={isVoting || !userId}
          className={`flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors ${
            userVote === "up"
              ? "text-fg-primary bg-pangea-900/30"
              : "text-fg-muted hover:text-fg hover:bg-theme-muted/30"
          } disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          <ArrowBigUp className="w-3.5 h-3.5" />
          <span className="font-medium">{upvotes}</span>
        </button>

        <span
          className={`text-xs font-semibold px-1.5 py-0.5 rounded ${
            netScore > 0
              ? "text-fg-success bg-success-tint"
              : netScore < 0
                ? "text-fg-danger bg-danger-tint"
                : "text-fg-muted"
          }`}
        >
          {netScore > 0 ? "+" : ""}{netScore}
        </span>

        <button
          onClick={() => handleVote("down")}
          disabled={isVoting || !userId}
          className={`flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors ${
            userVote === "down"
              ? "text-fg-danger bg-danger-tint"
              : "text-fg-muted hover:text-fg hover:bg-theme-muted/30"
          } disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          <ArrowBigDown className="w-3.5 h-3.5" />
          <span className="font-medium">{downvotes}</span>
        </button>

        {userId && (
          <button
            onClick={() => setReportOpen(true)}
            className="p-1 rounded text-fg-muted hover:text-fg hover:bg-theme-muted/30 transition-colors ml-1"
            title="Report"
          >
            <Flag className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      <ReportModal
        isOpen={reportOpen}
        onClose={() => setReportOpen(false)}
        replyId={replyId}
        userId={userId}
        onSuccess={() => setReportOpen(false)}
      />
    </>
  );
}

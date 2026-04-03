"use client";

import React, { useState } from "react";
import { ArrowBigUp, ArrowBigDown, Flag } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import ReportModal from "./ReportModal";

interface DiscussionThreadClientProps {
  discussionId: string;
  userId?: string;
  initialUpvotes?: number;
  initialDownvotes?: number;
  initialUserVote?: "up" | "down" | null;
  isLocked?: boolean;
  isReplyForm?: boolean;
}

export default function DiscussionThreadClient({
  discussionId,
  userId,
  initialUpvotes = 0,
  initialDownvotes = 0,
  initialUserVote = null,
  isLocked = false,
  isReplyForm = false,
}: DiscussionThreadClientProps) {
  const supabase = createClient();
  const [upvotes, setUpvotes] = useState(initialUpvotes);
  const [downvotes, setDownvotes] = useState(initialDownvotes);
  const [userVote, setUserVote] = useState(initialUserVote);
  const [isVoting, setIsVoting] = useState(false);
  const [replyBody, setReplyBody] = useState("");
  const [isSubmittingReply, setIsSubmittingReply] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);

  // For reply form
  const handleSubmitReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId || !replyBody.trim()) return;

    setIsSubmittingReply(true);
    try {
      const { error } = await supabase.from("discussion_replies").insert([
        {
          discussion_id: discussionId,
          author_id: userId,
          body: replyBody.trim(),
          parent_reply_id: null,
        },
      ]);

      if (!error) {
        setReplyBody("");
        // Increment replies count on discussion
        await supabase.rpc("increment_discussion_replies", {
          discussion_id: discussionId,
        });
        window.location.reload();
      }
    } catch (error) {
      console.error("Error posting reply:", error);
    } finally {
      setIsSubmittingReply(false);
    }
  };

  // For voting
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
          .eq("discussion_id", discussionId)
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
            .eq("discussion_id", discussionId)
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
              discussion_id: discussionId,
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

  // If this is for voting display
  if (!isReplyForm) {
    const netScore = upvotes - downvotes;
    return (
      <>
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleVote("up")}
            disabled={isVoting || isLocked}
            className={`flex items-center gap-1 px-3 py-1.5 rounded transition-colors ${
              userVote === "up"
                ? "text-pangea-400 bg-pangea-900/30"
                : "text-slate-400 hover:text-slate-300 hover:bg-slate-700/30"
            } disabled:opacity-50 disabled:cursor-not-allowed`}
            title={!userId ? "Sign in to vote" : ""}
          >
            <ArrowBigUp className="w-4 h-4" />
            <span className="text-xs font-medium">{upvotes}</span>
          </button>

          <span
            className={`text-xs font-semibold px-2 py-1 rounded ${
              netScore > 0
                ? "text-green-400 bg-green-900/20"
                : netScore < 0
                  ? "text-red-400 bg-red-900/20"
                  : "text-slate-400"
            }`}
          >
            {netScore > 0 ? "+" : ""}
            {netScore}
          </span>

          <button
            onClick={() => handleVote("down")}
            disabled={isVoting || isLocked}
            className={`flex items-center gap-1 px-3 py-1.5 rounded transition-colors ${
              userVote === "down"
                ? "text-red-400 bg-red-900/30"
                : "text-slate-400 hover:text-slate-300 hover:bg-slate-700/30"
            } disabled:opacity-50 disabled:cursor-not-allowed`}
            title={!userId ? "Sign in to vote" : ""}
          >
            <ArrowBigDown className="w-4 h-4" />
            <span className="text-xs font-medium">{downvotes}</span>
          </button>

          <button
            onClick={() => setReportOpen(true)}
            className="p-1.5 rounded text-slate-500 hover:text-slate-300 hover:bg-slate-700/30 transition-colors ml-2"
            title="Report"
          >
            <Flag className="w-4 h-4" />
          </button>
        </div>

        <ReportModal
          isOpen={reportOpen}
          onClose={() => setReportOpen(false)}
          discussionId={discussionId}
          userId={userId}
        />
      </>
    );
  }

  // If this is a reply form
  return (
    <form onSubmit={handleSubmitReply} className="space-y-4">
      <textarea
        value={replyBody}
        onChange={(e) => setReplyBody(e.target.value)}
        placeholder="Share your thoughts..."
        rows={5}
        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-pangea-600 focus:ring-1 focus:ring-pangea-600 transition-colors resize-none"
      />
      <div className="flex justify-end gap-3">
        <button
          type="button"
          onClick={() => setReplyBody("")}
          className="px-4 py-2 text-slate-300 hover:text-slate-200 transition-colors text-sm font-medium"
        >
          Clear
        </button>
        <button
          type="submit"
          disabled={isSubmittingReply || !replyBody.trim()}
          className="px-4 py-2 bg-pangea-600 hover:bg-pangea-700 disabled:bg-pangea-600/50 text-white font-medium rounded-lg transition-colors disabled:cursor-not-allowed text-sm"
        >
          {isSubmittingReply ? "Posting..." : "Post Reply"}
        </button>
      </div>
    </form>
  );
}

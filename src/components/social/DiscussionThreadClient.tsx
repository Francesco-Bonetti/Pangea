"use client";

import React, { useState, useMemo, useCallback } from "react";
import { ArrowBigUp, ArrowBigDown, Flag, Reply, ChevronDown, ChevronRight } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import ReportModal from "@/components/social/ReportModal";
import PrivacyName from "@/components/ui/PrivacyName";
import TranslatedContent from "@/components/ui/TranslatedContent";
import { triggerTranslation } from "@/lib/translate";
import { formatTimeAgo } from "@/lib/formatTimeAgo";

interface DiscussionReply {
  id: string;
  discussion_id: string;
  author_id: string;
  body: string;
  parent_reply_id: string | null;
  upvotes_count: number;
  downvotes_count: number;
  created_at: string;
  updated_at: string;
}

interface DiscussionThreadClientProps {
  discussionId: string;
  userId?: string;
  initialUpvotes?: number;
  initialDownvotes?: number;
  initialUserVote?: "up" | "down" | null;
  isLocked?: boolean;
  isReplyForm?: boolean;
  replies?: DiscussionReply[];
  profilesMap?: Record<string, { full_name: string | null; bio: string | null }>;
  userVotes?: Record<string, "up" | "down">;
}


// Nested reply component
interface NestedReplyProps {
  reply: DiscussionReply;
  discussionId: string;
  userId?: string;
  profilesMap: Record<string, any>;
  userVotes: Record<string, "up" | "down">;
  depth: number;
  onReplyAdded: (newReply: DiscussionReply) => void;
  childReplies: DiscussionReply[];
  isLocked?: boolean;
}

function NestedReply({
  reply,
  discussionId,
  userId,
  profilesMap,
  userVotes,
  depth,
  onReplyAdded,
  childReplies,
  isLocked = false,
}: NestedReplyProps) {
  const supabase = createClient();
  const [showReplyForm, setShowReplyForm] = useState(false);
  const [replyBody, setReplyBody] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [upvotes, setUpvotes] = useState(reply.upvotes_count);
  const [downvotes, setDownvotes] = useState(reply.downvotes_count);
  const [userVote, setUserVote] = useState<"up" | "down" | null>(userVotes[reply.id] || null);
  const [isVoting, setIsVoting] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  const authorProfile = profilesMap[reply.author_id] || { full_name: null, bio: null };

  const handleSubmitNestedReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId || !replyBody.trim()) return;

    setIsSubmitting(true);
    try {
      const { data: newReplyData, error } = await supabase
        .from("discussion_replies")
        .insert([
          {
            discussion_id: discussionId,
            author_id: userId,
            body: replyBody.trim(),
            parent_reply_id: reply.id,
          },
        ])
        .select("*")
        .single();

      if (!error && newReplyData) {
        // Trigger translation
        triggerTranslation(replyBody.trim(), "forum_reply", newReplyData.id);
        setReplyBody("");
        setShowReplyForm(false);
        // Increment replies count
        await supabase.rpc("increment_discussion_replies", {
          discussion_id: discussionId,
        });
        onReplyAdded(newReplyData);
      }
    } catch (error) {
      console.error("Error posting nested reply:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVote = async (voteType: "up" | "down") => {
    if (!userId) {
      alert("Please sign in to vote");
      return;
    }

    setIsVoting(true);
    try {
      if (userVote === voteType) {
        await supabase
          .from("discussion_votes")
          .delete()
          .eq("user_id", userId)
          .eq("reply_id", reply.id)
          .eq("vote_type", voteType);

        if (voteType === "up") {
          setUpvotes(Math.max(0, upvotes - 1));
        } else {
          setDownvotes(Math.max(0, downvotes - 1));
        }
        setUserVote(null);
      } else {
        if (userVote) {
          await supabase
            .from("discussion_votes")
            .delete()
            .eq("user_id", userId)
            .eq("reply_id", reply.id);

          if (userVote === "up") {
            setUpvotes(Math.max(0, upvotes - 1));
          } else {
            setDownvotes(Math.max(0, downvotes - 1));
          }
        }

        await supabase.from("discussion_votes").insert([
          {
            user_id: userId,
            discussion_id: discussionId,
            reply_id: reply.id,
            vote_type: voteType,
          },
        ]);

        if (voteType === "up") {
          setUpvotes(upvotes + 1);
        } else {
          setDownvotes(downvotes + 1);
        }
        setUserVote(voteType);
      }
    } catch (error) {
      console.error("Error voting on reply:", error);
    } finally {
      setIsVoting(false);
    }
  };

  const netScore = upvotes - downvotes;
  const maxDepth = 4;
  const canNest = depth < maxDepth;

  return (
    <div
      className={`border-l-2 border-pangea-600/30 pl-4 ${
        depth > 0 ? "ml-6" : ""
      }`}
    >
      <div className="card p-4 mb-2">
        {/* Header */}
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex-1 min-w-0">
            <p className="font-medium text-fg text-sm">
              <PrivacyName
                userId={reply.author_id}
                fullName={authorProfile.full_name}
              />
            </p>
            <p className="text-xs text-fg-muted">
              {formatTimeAgo(reply.created_at)}
            </p>
          </div>
          {childReplies.length > 0 && (
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="p-1 text-fg-muted hover:text-fg transition-colors shrink-0"
              title={isCollapsed ? "Expand" : "Collapse"}
            >
              {isCollapsed ? (
                <ChevronRight className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </button>
          )}
        </div>

        {/* Body */}
        {!isCollapsed && (
          <>
            <TranslatedContent
              text={reply.body}
              contentType="forum_reply"
              contentId={reply.id}
              as="p"
              className="text-fg text-sm leading-relaxed whitespace-pre-wrap mb-3"
            />

            {/* Actions */}
            <div className="flex items-center gap-2 text-xs">
              <button
                onClick={() => handleVote("up")}
                disabled={isVoting || isLocked}
                className={`flex items-center gap-1 px-2 py-1 rounded transition-colors ${
                  userVote === "up"
                    ? "text-fg-primary bg-pangea-900/30"
                    : "text-fg-muted hover:text-fg hover:bg-theme-muted/30"
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                <ArrowBigUp className="w-3 h-3" />
                <span className="text-xs">{upvotes}</span>
              </button>

              <span className={`px-1.5 py-0.5 rounded ${
                netScore > 0
                  ? "text-fg-success"
                  : netScore < 0
                    ? "text-fg-danger"
                    : "text-fg-muted"
              }`}>
                {netScore > 0 ? "+" : ""}
                {netScore}
              </span>

              <button
                onClick={() => handleVote("down")}
                disabled={isVoting || isLocked}
                className={`flex items-center gap-1 px-2 py-1 rounded transition-colors ${
                  userVote === "down"
                    ? "text-fg-danger"
                    : "text-fg-muted hover:text-fg hover:bg-theme-muted/30"
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                <ArrowBigDown className="w-3 h-3" />
                <span className="text-xs">{downvotes}</span>
              </button>

              {canNest && !isLocked && (
                <button
                  onClick={() => setShowReplyForm(!showReplyForm)}
                  className="flex items-center gap-1 px-2 py-1 rounded text-fg-muted hover:text-fg hover:bg-theme-muted/30 transition-colors ml-1"
                >
                  <Reply className="w-3 h-3" />
                  <span>Reply</span>
                </button>
              )}

              <button
                onClick={() => setReportOpen(true)}
                className="p-1 rounded text-fg-muted hover:text-fg hover:bg-theme-muted/30 transition-colors"
                title="Report"
              >
                <Flag className="w-3 h-3" />
              </button>
            </div>

            {/* Nested reply form */}
            {showReplyForm && (
              <form onSubmit={handleSubmitNestedReply} className="mt-3 space-y-2">
                <textarea
                  value={replyBody}
                  onChange={(e) => setReplyBody(e.target.value)}
                  placeholder="Add a reply..."
                  rows={3}
                  className="w-full bg-theme-base border border-theme rounded px-3 py-2 text-fg placeholder-slate-500 text-sm focus:outline-none focus:border-pangea-600 focus:ring-1 focus:ring-pangea-600 transition-colors resize-none"
                />
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowReplyForm(false);
                      setReplyBody("");
                    }}
                    className="px-3 py-1.5 text-fg-muted hover:text-fg text-xs font-medium transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting || !replyBody.trim()}
                    className="px-3 py-1.5 bg-pangea-600 hover:bg-pangea-700 disabled:bg-pangea-600/50 text-fg font-medium rounded text-xs transition-colors disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? "Posting..." : "Post Reply"}
                  </button>
                </div>
              </form>
            )}
          </>
        )}
      </div>

      {/* Child replies (recursive) */}
      {!isCollapsed && childReplies.length > 0 && (
        <div className="space-y-2">
          {childReplies.map((childReply) => (
            <NestedReply
              key={childReply.id}
              reply={childReply}
              discussionId={discussionId}
              userId={userId}
              profilesMap={profilesMap}
              userVotes={userVotes}
              depth={depth + 1}
              onReplyAdded={onReplyAdded}
              childReplies={[]}
              isLocked={isLocked}
            />
          ))}
        </div>
      )}

      <ReportModal
        isOpen={reportOpen}
        onClose={() => setReportOpen(false)}
        discussionId={discussionId}
        userId={userId}
        replyId={reply.id}
      />
    </div>
  );
}

export default function DiscussionThreadClient({
  discussionId,
  userId,
  initialUpvotes = 0,
  initialDownvotes = 0,
  initialUserVote = null,
  isLocked = false,
  isReplyForm = false,
  replies = [],
  profilesMap = {},
  userVotes = {},
}: DiscussionThreadClientProps) {
  const supabase = createClient();
  const [upvotes, setUpvotes] = useState(initialUpvotes);
  const [downvotes, setDownvotes] = useState(initialDownvotes);
  const [userVote, setUserVote] = useState(initialUserVote);
  const [isVoting, setIsVoting] = useState(false);
  const [replyBody, setReplyBody] = useState("");
  const [isSubmittingReply, setIsSubmittingReply] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [allReplies, setAllReplies] = useState<DiscussionReply[]>(replies);

  // Build reply tree: map parent_reply_id to children
  const replyTree = useMemo(() => {
    const tree: Record<string, DiscussionReply[]> = {};
    for (const reply of allReplies) {
      const parentId = reply.parent_reply_id || "root";
      if (!tree[parentId]) tree[parentId] = [];
      tree[parentId].push(reply);
    }
    return tree;
  }, [allReplies]);

  const handleReplyAdded = useCallback((newReply: DiscussionReply) => {
    setAllReplies((prev) => [...prev, newReply]);
  }, []);

  // For top-level reply form
  const handleSubmitReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId || !replyBody.trim()) return;

    setIsSubmittingReply(true);
    try {
      const { data: replyData, error } = await supabase
        .from("discussion_replies")
        .insert([
          {
            discussion_id: discussionId,
            author_id: userId,
            body: replyBody.trim(),
            parent_reply_id: null,
          },
        ])
        .select("*")
        .single();

      if (!error && replyData) {
        triggerTranslation(replyBody.trim(), "forum_reply", replyData.id);
        setReplyBody("");
        await supabase.rpc("increment_discussion_replies", {
          discussion_id: discussionId,
        });
        handleReplyAdded(replyData);
      }
    } catch (error) {
      console.error("Error posting reply:", error);
    } finally {
      setIsSubmittingReply(false);
    }
  };

  // For voting on discussion
  const handleVote = async (voteType: "up" | "down") => {
    if (!userId) {
      alert("Please sign in to vote");
      return;
    }

    setIsVoting(true);
    try {
      if (userVote === voteType) {
        const { error: deleteError } = await supabase
          .from("discussion_votes")
          .delete()
          .eq("user_id", userId)
          .eq("discussion_id", discussionId)
          .is("reply_id", null)
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
        if (userVote) {
          await supabase
            .from("discussion_votes")
            .delete()
            .eq("user_id", userId)
            .eq("discussion_id", discussionId)
            .is("reply_id", null);

          if (userVote === "up") {
            setUpvotes(Math.max(0, upvotes - 1));
          } else {
            setDownvotes(Math.max(0, downvotes - 1));
          }
        }

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

  // Voting display
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
                ? "text-fg-primary bg-pangea-900/30"
                : "text-fg-muted hover:text-fg hover:bg-theme-muted/30"
            } disabled:opacity-50 disabled:cursor-not-allowed`}
            title={!userId ? "Sign in to vote" : ""}
          >
            <ArrowBigUp className="w-4 h-4" />
            <span className="text-xs font-medium">{upvotes}</span>
          </button>

          <span
            className={`text-xs font-semibold px-2 py-1 rounded ${
              netScore > 0
                ? "text-fg-success bg-success-tint"
                : netScore < 0
                  ? "text-fg-danger bg-danger-tint"
                  : "text-fg-muted"
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
                ? "text-fg-danger bg-danger-tint"
                : "text-fg-muted hover:text-fg hover:bg-theme-muted/30"
            } disabled:opacity-50 disabled:cursor-not-allowed`}
            title={!userId ? "Sign in to vote" : ""}
          >
            <ArrowBigDown className="w-4 h-4" />
            <span className="text-xs font-medium">{downvotes}</span>
          </button>

          <button
            onClick={() => setReportOpen(true)}
            className="p-1.5 rounded text-fg-muted hover:text-fg hover:bg-theme-muted/30 transition-colors ml-2"
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

  // Top-level reply form
  return (
    <>
      {/* Form */}
      <form onSubmit={handleSubmitReply} className="space-y-4">
        <textarea
          value={replyBody}
          onChange={(e) => setReplyBody(e.target.value)}
          placeholder="Share your thoughts..."
          rows={5}
          className="w-full bg-theme-base border border-theme rounded-lg px-4 py-3 text-fg placeholder-slate-500 focus:outline-none focus:border-pangea-600 focus:ring-1 focus:ring-pangea-600 transition-colors resize-none"
        />
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={() => setReplyBody("")}
            className="px-4 py-2 text-fg hover:text-fg transition-colors text-sm font-medium"
          >
            Clear
          </button>
          <button
            type="submit"
            disabled={isSubmittingReply || !replyBody.trim()}
            className="px-4 py-2 bg-pangea-600 hover:bg-pangea-700 disabled:bg-pangea-600/50 text-fg font-medium rounded-lg transition-colors disabled:cursor-not-allowed text-sm"
          >
            {isSubmittingReply ? "Posting..." : "Post Reply"}
          </button>
        </div>
      </form>

      {/* Threaded replies */}
      {allReplies.length > 0 && (
        <div className="mt-8 space-y-2">
          {(replyTree["root"] || []).map((topLevelReply) => (
            <NestedReply
              key={topLevelReply.id}
              reply={topLevelReply}
              discussionId={discussionId}
              userId={userId}
              profilesMap={profilesMap}
              userVotes={userVotes}
              depth={0}
              onReplyAdded={handleReplyAdded}
              childReplies={replyTree[topLevelReply.id] || []}
              isLocked={isLocked}
            />
          ))}
        </div>
      )}
    </>
  );
}

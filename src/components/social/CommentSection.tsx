"use client";

import React, { useState, useEffect } from "react";
import {
  MessageCircle,
  ThumbsUp,
  ThumbsDown,
  ChevronDown,
  ChevronUp,
  User,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import PrivacyName from "@/components/ui/PrivacyName";
import { triggerTranslation } from "@/lib/translate";
import TranslatedContent from "@/components/ui/TranslatedContent";
import { formatTimeAgo as timeAgo } from "@/lib/formatTimeAgo";

interface Comment {
  id: string;
  author_id: string;
  body: string;
  created_at: string;
  likes_count: number;
  dislikes_count: number;
  replies_count: number;
  proposal_id: string | null;
  law_id: string | null;
  parent_id: string | null;
  profiles: {
    full_name: string;
  } | null;
}

interface CommentReaction {
  id: string;
  comment_id: string;
  user_id: string;
  reaction_type: "like" | "dislike";
}

interface CommentSectionProps {
  targetType: "proposal" | "law" | "general";
  targetId?: string;
  userId?: string;
}


function CommentCard({
  comment,
  userId,
  onReplyClick,
  onReactionsChange,
  userReactions,
}: {
  comment: Comment;
  userId?: string;
  onReplyClick: (commentId: string) => void;
  onReactionsChange: () => void;
  userReactions: Record<string, "like" | "dislike">;
}) {
  const supabase = createClient();
  const [isReacting, setIsReacting] = useState(false);
  const currentReaction = userReactions[comment.id];

  const handleReaction = async (reactionType: "like" | "dislike") => {
    if (!userId) return;

    setIsReacting(true);
    try {
      if (currentReaction === reactionType) {
        // Remove reaction
        const { error } = await supabase
          .from("comment_reactions")
          .delete()
          .eq("comment_id", comment.id)
          .eq("user_id", userId)
          .eq("reaction_type", reactionType);

        if (error) throw error;
      } else {
        // Remove old reaction if exists
        if (currentReaction) {
          await supabase
            .from("comment_reactions")
            .delete()
            .eq("comment_id", comment.id)
            .eq("user_id", userId);
        }

        // Add new reaction
        const { error } = await supabase
          .from("comment_reactions")
          .insert([
            {
              comment_id: comment.id,
              user_id: userId,
              reaction_type: reactionType,
            },
          ]);

        if (error) throw error;
      }

      onReactionsChange();
    } catch (error) {
      console.error("Error updating reaction:", error);
    } finally {
      setIsReacting(false);
    }
  };

  return (
    <div className="bg-[var(--background)] border border-[var(--border)] rounded-lg p-4 mb-3 overflow-hidden">
      <div className="flex items-start gap-3 overflow-hidden">
        <div className="flex-shrink-0">
          <div className="w-8 h-8 bg-theme-muted rounded-full flex items-center justify-center shrink-0">
            <User className="w-4 h-4 text-[var(--muted-foreground)] shrink-0" />
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2 overflow-hidden flex-wrap">
            <span className="font-medium text-[var(--foreground)] min-w-0">
              <PrivacyName userId={comment.author_id} fullName={comment.profiles?.full_name ?? null} currentUserId={userId} />
            </span>
            <span className="text-xs text-[var(--muted-foreground)] shrink-0">
              {timeAgo(comment.created_at)}
            </span>
          </div>

          <p className="text-[var(--muted-foreground)] text-sm mb-3 break-words">
            <TranslatedContent text={comment.body} contentType="comment" contentId={comment.id} />
          </p>

          <div className="flex items-center gap-2 overflow-hidden flex-wrap">
            <button
              onClick={() => handleReaction("like")}
              disabled={isReacting || !userId}
              className={`flex items-center gap-1 px-3 py-1 rounded-md text-sm transition-colors shrink-0 ${
                currentReaction === "like"
                  ? "bg-theme-primary text-[var(--background)]"
                  : "bg-theme-card text-fg-muted hover:bg-theme-muted disabled:opacity-50 disabled:cursor-not-allowed"
              }`}
              title={!userId ? "Log in to react" : ""}
            >
              <ThumbsUp className="w-4 h-4 shrink-0" />
              <span>{comment.likes_count}</span>
            </button>

            <button
              onClick={() => handleReaction("dislike")}
              disabled={isReacting || !userId}
              className={`flex items-center gap-1 px-3 py-1 rounded-md text-sm transition-colors shrink-0 ${
                currentReaction === "dislike"
                  ? "bg-red-400 text-[var(--background)]"
                  : "bg-theme-card text-fg-muted hover:bg-theme-muted disabled:opacity-50 disabled:cursor-not-allowed"
              }`}
              title={!userId ? "Log in to react" : ""}
            >
              <ThumbsDown className="w-4 h-4 shrink-0" />
              <span>{comment.dislikes_count}</span>
            </button>

            <button
              onClick={() => onReplyClick(comment.id)}
              disabled={!userId}
              className={`flex items-center gap-1 px-3 py-1 rounded-md text-sm transition-colors shrink-0 ${
                userId
                  ? "bg-theme-card text-fg-muted hover:bg-theme-muted"
                  : "bg-theme-card text-fg-muted opacity-50 cursor-not-allowed"
              }`}
              title={!userId ? "Log in to reply" : ""}
            >
              <MessageCircle className="w-4 h-4 shrink-0" />
              <span>Reply</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function RepliesSection({
  parentCommentId,
  userId,
  userReactions,
  onReactionsChange,
}: {
  parentCommentId: string;
  userId?: string;
  userReactions: Record<string, "like" | "dislike">;
  onReactionsChange: () => void;
}) {
  const supabase = createClient();
  const [replies, setReplies] = useState<Comment[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchReplies = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("comments")
        .select("*")
        .eq("parent_id", parentCommentId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Fetch profiles separately (FK may point to auth.users, not profiles)
      const authorIds = Array.from(new Set((data || []).map((c: { author_id: string }) => c.author_id)));
      let profilesMap: Record<string, { full_name: string | null }> = {};
      if (authorIds.length > 0) {
        const { data: profilesData } = await supabase
          .from("profiles")
          .select("id, full_name")
          .in("id", authorIds);
        if (profilesData) {
          profilesMap = Object.fromEntries(
            profilesData.map((p: { id: string; full_name: string | null }) => [p.id, { full_name: p.full_name }])
          );
        }
      }

      const repliesWithProfiles = (data || []).map((c: Record<string, unknown>) => ({
        ...c,
        profiles: profilesMap[c.author_id as string] || null,
      }));

      setReplies(repliesWithProfiles as Comment[]);
    } catch (error) {
      console.error("Error fetching replies:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmitReply = async () => {
    if (!userId || !replyText.trim()) return;

    setIsSubmitting(true);
    try {
      const { data: commentData, error } = await supabase.from("comments").insert([
        {
          author_id: userId,
          body: replyText,
          parent_id: parentCommentId,
          proposal_id: null,
          law_id: null,
        },
      ]).select("id").single();

      if (error) throw error;

      // Trigger translation for comment
      if (commentData?.id) {
        triggerTranslation(replyText.trim(), "comment", commentData.id);
      }

      setReplyText("");
      setReplyingTo(null);
      await fetchReplies();
      onReactionsChange();
    } catch (error) {
      console.error("Error submitting reply:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleExpanded = async () => {
    if (!isExpanded && replies.length === 0) {
      await fetchReplies();
    }
    setIsExpanded(!isExpanded);
  };

  return (
    <div className="ml-6 mt-3 border-l-2 border-[var(--border)] pl-4">
      <button
        onClick={handleToggleExpanded}
        className="text-sm text-fg-primary hover:text-fg-primary transition-colors flex items-center gap-2 mb-2 shrink-0"
      >
        {isExpanded ? (
          <ChevronUp className="w-4 h-4 shrink-0" />
        ) : (
          <ChevronDown className="w-4 h-4 shrink-0" />
        )}
        {isExpanded ? "Hide replies" : `Show replies (${replies.length})`}
      </button>

      {isExpanded && (
        <div>
          {isLoading ? (
            <div className="text-[var(--muted-foreground)] text-sm py-2">Loading...</div>
          ) : replies.length === 0 ? (
            <div className="text-[var(--muted-foreground)] text-sm py-2">
              No replies yet
            </div>
          ) : (
            <div className="space-y-3 mb-3">
              {replies.map((reply) => (
                <CommentCard
                  key={reply.id}
                  comment={reply}
                  userId={userId}
                  onReplyClick={() => {}}
                  onReactionsChange={onReactionsChange}
                  userReactions={userReactions}
                />
              ))}
            </div>
          )}

          {replyingTo === parentCommentId ? (
            <div className="bg-[var(--card)] border border-[var(--border)] rounded-lg p-3 mb-2">
              <textarea
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder="Write a reply..."
                className="w-full bg-[var(--background)] text-[var(--muted-foreground)] placeholder-[var(--muted-foreground)] border border-[var(--border)] rounded-lg p-2 text-sm focus:outline-none focus:border-pangea-400 resize-none"
                rows={2}
              />
              <div className="flex gap-2 mt-2">
                <button
                  onClick={handleSubmitReply}
                  disabled={isSubmitting || !replyText.trim()}
                  className="bg-theme-primary text-fg px-3 py-1 rounded-md text-sm hover:bg-pangea-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                >
                  Reply
                </button>
                <button
                  onClick={() => {
                    setReplyingTo(null);
                    setReplyText("");
                  }}
                  className="bg-theme-card text-fg px-3 py-1 rounded-md text-sm hover:bg-theme-muted transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setReplyingTo(parentCommentId)}
              className="text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
            >
              + Write a reply
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default function CommentSection({
  targetType,
  targetId,
  userId,
}: CommentSectionProps) {
  const supabase = createClient();
  const [comments, setComments] = useState<Comment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newCommentText, setNewCommentText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [userReactions, setUserReactions] = useState<
    Record<string, "like" | "dislike">
  >({});
  const [expandedReplies, setExpandedReplies] = useState<Set<string>>(
    new Set()
  );

  useEffect(() => {
    fetchComments();
    fetchUserReactions();
  }, [targetType, targetId, userId]);

  const fetchComments = async () => {
    setIsLoading(true);
    try {
      let query = supabase
        .from("comments")
        .select("*")
        .is("parent_id", null)
        .order("created_at", { ascending: false });

      if (targetType === "proposal" && targetId) {
        query = query.eq("proposal_id", targetId);
      } else if (targetType === "law" && targetId) {
        query = query.eq("law_id", targetId);
      } else if (targetType === "general") {
        query = query
          .is("proposal_id", null)
          .is("law_id", null);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Fetch profiles separately (FK may point to auth.users, not profiles)
      const authorIds = Array.from(new Set((data || []).map((c: { author_id: string }) => c.author_id)));
      let profilesMap: Record<string, { full_name: string | null }> = {};
      if (authorIds.length > 0) {
        const { data: profilesData } = await supabase
          .from("profiles")
          .select("id, full_name")
          .in("id", authorIds);
        if (profilesData) {
          profilesMap = Object.fromEntries(
            profilesData.map((p: { id: string; full_name: string | null }) => [p.id, { full_name: p.full_name }])
          );
        }
      }

      const commentsWithProfiles = (data || []).map((c: Record<string, unknown>) => ({
        ...c,
        profiles: profilesMap[c.author_id as string] || null,
      }));

      setComments(commentsWithProfiles as Comment[]);
    } catch (error) {
      console.error("Error fetching comments:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchUserReactions = async () => {
    if (!userId) return;

    try {
      const { data, error } = await supabase
        .from("comment_reactions")
        .select("*")
        .eq("user_id", userId);

      if (error) throw error;

      const reactionsMap: Record<string, "like" | "dislike"> = {};
      (data || []).forEach((reaction: CommentReaction) => {
        reactionsMap[reaction.comment_id] = reaction.reaction_type;
      });

      setUserReactions(reactionsMap);
    } catch (error) {
      console.error("Error fetching user reactions:", error);
    }
  };

  const handleSubmitComment = async () => {
    if (!newCommentText.trim()) return;

    setIsSubmitting(true);
    try {
      const insertData: Record<string, any> = {
        author_id: userId,
        body: newCommentText,
        parent_id: null,
      };

      if (targetType === "proposal") {
        insertData.proposal_id = targetId;
      } else if (targetType === "law") {
        insertData.law_id = targetId;
      }

      const { data: newCommentData, error } = await supabase
        .from("comments")
        .insert([insertData])
        .select("id")
        .single();

      if (error) throw error;

      // Trigger translation for new comment
      if (newCommentData?.id) {
        triggerTranslation(newCommentText.trim(), "comment", newCommentData.id);
      }

      setNewCommentText("");
      await fetchComments();
    } catch (error) {
      console.error("Error submitting comment:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReplyClick = (commentId: string) => {
    setExpandedReplies(
      new Set(
        expandedReplies.has(commentId)
          ? Array.from(expandedReplies).filter((id) => id !== commentId)
          : [...Array.from(expandedReplies), commentId]
      )
    );
  };

  return (
    <div className="w-full bg-[var(--background)] rounded-lg border border-[var(--border)] p-6 overflow-hidden">
      <div className="flex items-center gap-2 mb-6 overflow-hidden">
        <MessageCircle className="w-5 h-5 text-fg-primary shrink-0" />
        <h2 className="text-lg font-semibold text-[var(--foreground)] truncate">Discussion</h2>
      </div>

      {/* New Comment Form */}
      {userId ? (
        <div className="mb-6">
          <textarea
            value={newCommentText}
            onChange={(e) => setNewCommentText(e.target.value)}
            placeholder="Share your opinion..."
            className="w-full bg-[var(--card)] text-[var(--muted-foreground)] placeholder-[var(--muted-foreground)] border border-[var(--border)] rounded-lg p-3 text-sm focus:outline-none focus:border-pangea-400 resize-none mb-3"
            rows={3}
          />
          <button
            onClick={handleSubmitComment}
            disabled={isSubmitting || !newCommentText.trim()}
            className="bg-theme-primary text-fg px-4 py-2 rounded-lg text-sm hover:bg-pangea-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium flex items-center gap-2"
          >
            <span>Comment</span>
          </button>
        </div>
      ) : (
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-lg p-4 mb-6 text-center">
          <p className="text-[var(--muted-foreground)] text-sm mb-3">
            Log in to join the discussion
          </p>
          <a
            href="/auth"
            className="inline-block bg-theme-primary text-fg px-4 py-2 rounded-lg text-sm hover:bg-pangea-600 transition-colors font-medium"
          >
            Log in
          </a>
        </div>
      )}

      {/* Comments List */}
      {isLoading ? (
        <div className="text-center py-8 text-[var(--muted-foreground)]">Loading...</div>
      ) : comments.length === 0 ? (
        <div className="text-center py-8 text-[var(--muted-foreground)] text-sm">
          No comments yet. Be the first to comment!
        </div>
      ) : (
        <div className="space-y-3">
          {comments.map((comment) => (
            <div key={comment.id}>
              <CommentCard
                comment={comment}
                userId={userId}
                onReplyClick={() => handleReplyClick(comment.id)}
                onReactionsChange={fetchUserReactions}
                userReactions={userReactions}
              />

              {comment.replies_count > 0 && expandedReplies.has(comment.id) && (
                <RepliesSection
                  parentCommentId={comment.id}
                  userId={userId}
                  userReactions={userReactions}
                  onReactionsChange={fetchUserReactions}
                />
              )}

              {comment.replies_count > 0 && !expandedReplies.has(comment.id) && (
                <div className="ml-6 mt-2 pl-4 border-l-2 border-[var(--border)]">
                  <button
                    onClick={() => handleReplyClick(comment.id)}
                    className="text-sm text-fg-primary hover:text-fg-primary transition-colors flex items-center gap-2"
                  >
                    <ChevronDown className="w-4 h-4" />
                    Show {comment.replies_count} replies
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

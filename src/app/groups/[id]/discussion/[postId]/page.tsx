"use client";

import { createClient } from "@/lib/supabase/client";
import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import AppShell from "@/components/AppShell";
import PrivacyName from "@/components/PrivacyName";
import UidBadge from "@/components/UidBadge";
import MentionInput, { extractMentions } from "@/components/MentionInput";
import MentionText from "@/components/MentionText";
import { useLanguage } from "@/components/language-provider";
import { triggerTranslation } from "@/lib/translate";
import {
  ArrowLeft,
  ArrowBigUp,
  ArrowBigDown,
  MessageCircle,
  Eye,
  Pin,
  Lock,
  Reply,
  ChevronDown,
  ChevronRight,
  Shield,
  Trash2,
} from "lucide-react";
import type { Profile, Group, GroupForumPost, GroupMember } from "@/lib/types";

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

type EnrichedReply = GroupForumPost & { profiles: { full_name: string | null } };

/* ── Nested Reply Component ── */
function ReplyItem({
  reply,
  userId,
  isAdmin,
  depth,
  childReplies,
  allReplies,
  profilesMap,
  postId,
  isLocked,
  onReplyAdded,
  onDelete,
}: {
  reply: EnrichedReply;
  userId?: string;
  isAdmin: boolean;
  depth: number;
  childReplies: EnrichedReply[];
  allReplies: EnrichedReply[];
  profilesMap: Record<string, { full_name: string | null }>;
  postId: string;
  isLocked: boolean;
  onReplyAdded: () => void;
  onDelete: (id: string) => void;
}) {
  const supabase = createClient();
  const { t, locale } = useLanguage();
  const [showReplyForm, setShowReplyForm] = useState(false);
  const [replyBody, setReplyBody] = useState("");
  const [posting, setPosting] = useState(false);
  const [expanded, setExpanded] = useState(true);
  const [upvotes, setUpvotes] = useState(reply.upvotes_count || 0);
  const [downvotes, setDownvotes] = useState(reply.downvotes_count || 0);
  const [userVote, setUserVote] = useState<"up" | "down" | null>(null);

  const handleVote = async (voteType: "up" | "down") => {
    if (!userId) return;
    try {
      if (userVote === voteType) {
        await supabase.from("group_forum_votes").delete().eq("user_id", userId).eq("post_id", reply.id);
        if (voteType === "up") setUpvotes(Math.max(0, upvotes - 1));
        else setDownvotes(Math.max(0, downvotes - 1));
        setUserVote(null);
      } else {
        if (userVote) {
          await supabase.from("group_forum_votes").delete().eq("user_id", userId).eq("post_id", reply.id);
          if (userVote === "up") setUpvotes(Math.max(0, upvotes - 1));
          else setDownvotes(Math.max(0, downvotes - 1));
        }
        await supabase.from("group_forum_votes").insert({ user_id: userId, post_id: reply.id, vote_type: voteType });
        if (voteType === "up") setUpvotes(u => u + 1);
        else setDownvotes(d => d + 1);
        setUserVote(voteType);
      }
    } catch (err) { console.error(err); }
  };

  const handleSubmitReply = async () => {
    if (!userId || !replyBody.trim()) return;
    setPosting(true);
    const groupId = reply.group_id;
    const { data: newReply } = await supabase.from("group_forum_posts").insert({
      group_id: groupId,
      author_id: userId,
      body: replyBody.trim(),
      parent_id: reply.id,
    }).select().single();

    if (newReply) {
      const mentions = extractMentions(replyBody);
      if (mentions.length > 0) {
        await supabase.from("entity_mentions").insert(
          mentions.map(m => ({
            source_type: "group_forum_reply",
            source_id: newReply.id,
            target_type: m.type,
            target_id: m.id,
            target_uid: m.uid,
            mentioned_by: userId,
          }))
        );
      }
      triggerTranslation(replyBody.trim(), "group_post_body", newReply.id, locale);
    }
    setReplyBody("");
    setShowReplyForm(false);
    setPosting(false);
    onReplyAdded();
  };

  const netScore = upvotes - downvotes;
  const nestedChildren = allReplies.filter(r => r.parent_id === reply.id);
  const maxDepth = 4;

  return (
    <div className={`${depth > 0 ? "ml-4 sm:ml-6 pl-4 border-l-2" : ""}`} style={{ borderColor: depth > 0 ? "var(--border)" : undefined }}>
      <div className="py-3">
        {/* Author line */}
        <div className="flex items-center gap-2 text-xs mb-2" style={{ color: "var(--muted-foreground)" }}>
          <div className="w-6 h-6 rounded-full bg-gradient-to-br from-purple-600 to-purple-800 flex items-center justify-center text-[10px] font-bold text-white shrink-0">
            {(reply.profiles?.full_name || "?")[0].toUpperCase()}
          </div>
          <PrivacyName userId={reply.author_id} fullName={reply.profiles?.full_name ?? null} currentUserId={userId} className="font-medium" />
          <span>·</span>
          <span>{formatTimeAgo(reply.created_at)}</span>
          {reply.uid && <UidBadge uid={reply.uid} size="xs" clickable={false} />}
        </div>

        {/* Body */}
        <div className="text-sm leading-relaxed mb-2" style={{ color: "var(--foreground)" }}>
          <MentionText text={reply.body} />
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3">
          <button onClick={() => handleVote("up")} disabled={!userId}
            className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-xs transition-colors ${userVote === "up" ? "text-purple-400" : ""}`}
            style={userVote !== "up" ? { color: "var(--muted-foreground)" } : undefined}>
            <ArrowBigUp className="w-3.5 h-3.5" /> {upvotes}
          </button>
          <span className={`text-xs font-semibold ${netScore > 0 ? "text-green-400" : netScore < 0 ? "text-red-400" : ""}`}
            style={netScore === 0 ? { color: "var(--muted-foreground)" } : undefined}>
            {netScore > 0 ? "+" : ""}{netScore}
          </span>
          <button onClick={() => handleVote("down")} disabled={!userId}
            className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-xs transition-colors ${userVote === "down" ? "text-red-400" : ""}`}
            style={userVote !== "down" ? { color: "var(--muted-foreground)" } : undefined}>
            <ArrowBigDown className="w-3.5 h-3.5" /> {downvotes}
          </button>

          {!isLocked && userId && depth < maxDepth && (
            <button onClick={() => setShowReplyForm(!showReplyForm)}
              className="flex items-center gap-1 px-1.5 py-0.5 rounded text-xs transition-colors hover:bg-[var(--muted)]"
              style={{ color: "var(--muted-foreground)" }}>
              <Reply className="w-3.5 h-3.5" /> {t("groupDiscussions.reply")}
            </button>
          )}

          {(isAdmin || reply.author_id === userId) && (
            <button onClick={() => onDelete(reply.id)}
              className="flex items-center gap-1 px-1.5 py-0.5 rounded text-xs text-red-400 transition-colors hover:bg-red-500/10">
              <Trash2 className="w-3 h-3" />
            </button>
          )}

          {nestedChildren.length > 0 && (
            <button onClick={() => setExpanded(!expanded)}
              className="flex items-center gap-1 text-xs transition-colors"
              style={{ color: "var(--muted-foreground)" }}>
              {expanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
              {nestedChildren.length} {nestedChildren.length === 1 ? t("groupDiscussions.reply") : t("groupDiscussions.replies")}
            </button>
          )}
        </div>

        {/* Reply form */}
        {showReplyForm && (
          <div className="mt-3 space-y-2">
            <MentionInput value={replyBody} onChange={setReplyBody} placeholder={t("groupDiscussions.writeReply")} rows={3}
              className="w-full px-3 py-2 rounded-lg border text-sm resize-none"
              />
            <div className="flex gap-2">
              <button onClick={handleSubmitReply} disabled={posting || !replyBody.trim()}
                className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white text-xs font-medium rounded-lg transition-colors disabled:opacity-50">
                {posting ? "..." : t("groupDiscussions.postReply")}
              </button>
              <button onClick={() => { setShowReplyForm(false); setReplyBody(""); }}
                className="px-3 py-1.5 rounded-lg text-xs transition-colors hover:bg-[var(--muted)]"
                style={{ color: "var(--muted-foreground)" }}>
                {t("groupDiscussions.cancel")}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Nested replies */}
      {expanded && nestedChildren.map(child => (
        <ReplyItem key={child.id} reply={child} userId={userId} isAdmin={isAdmin}
          depth={depth + 1} childReplies={[]} allReplies={allReplies}
          profilesMap={profilesMap} postId={postId} isLocked={isLocked}
          onReplyAdded={onReplyAdded} onDelete={onDelete} />
      ))}
    </div>
  );
}

/* ── Main Thread Page ── */
export default function GroupDiscussionThreadPage() {
  const supabase = createClient();
  const params = useParams();
  const groupId = params.id as string;
  const postId = params.postId as string;
  const { t, locale } = useLanguage();

  const [user, setUser] = useState<{ id: string } | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isGuest, setIsGuest] = useState(true);
  const [pendingDelegations, setPendingDelegations] = useState(0);

  const [group, setGroup] = useState<Group | null>(null);
  const [post, setPost] = useState<EnrichedReply | null>(null);
  const [replies, setReplies] = useState<EnrichedReply[]>([]);
  const [currentMember, setCurrentMember] = useState<GroupMember | null>(null);
  const [loading, setLoading] = useState(true);

  // New reply state
  const [replyBody, setReplyBody] = useState("");
  const [posting, setPosting] = useState(false);

  // Voting
  const [upvotes, setUpvotes] = useState(0);
  const [downvotes, setDownvotes] = useState(0);
  const [userVote, setUserVote] = useState<"up" | "down" | null>(null);

  const loadData = useCallback(async () => {
    const { data: { user: u } } = await supabase.auth.getUser();
    setUser(u);
    setIsGuest(!u);

    if (u) {
      const { data: prof } = await supabase.from("profiles").select("*").eq("id", u.id).single();
      setProfile(prof);
      const { count } = await supabase.from("delegations").select("*", { count: "exact", head: true }).eq("delegate_id", u.id).eq("status", "pending");
      setPendingDelegations(count || 0);
    }

    // Group
    const { data: g } = await supabase.from("groups").select("*").eq("id", groupId).single();
    if (g) setGroup(g as Group);

    // Main post
    const { data: p } = await supabase.from("group_forum_posts").select("*").eq("id", postId).single();
    if (p) {
      const { data: authorProf } = await supabase.from("profiles").select("id, full_name").eq("id", p.author_id).single();
      const enriched: EnrichedReply = { ...p, profiles: { full_name: authorProf?.full_name ?? null } };
      setPost(enriched);
      setUpvotes(p.upvotes_count || 0);
      setDownvotes(p.downvotes_count || 0);

      // Increment views
      await supabase.rpc("increment_group_post_views", { p_post_id: postId });
    }

    // User's vote on main post
    if (u && p) {
      const { data: vote } = await supabase.from("group_forum_votes").select("vote_type").eq("user_id", u.id).eq("post_id", postId).single();
      if (vote) setUserVote(vote.vote_type as "up" | "down");
    }

    // Replies (all nested)
    const { data: reps } = await supabase
      .from("group_forum_posts")
      .select("*")
      .eq("group_id", groupId)
      .not("parent_id", "is", null)
      .order("created_at", { ascending: true });

    if (reps) {
      // Find all replies in this thread (parent chain leads to postId)
      const allReplies = reps as GroupForumPost[];
      const threadReplies = filterThreadReplies(allReplies, postId);

      // Fetch profiles
      const authorIds = Array.from(new Set(threadReplies.map(r => r.author_id)));
      const { data: profs } = await supabase.from("profiles").select("id, full_name").in("id", authorIds.length ? authorIds : ["00000000-0000-0000-0000-000000000000"]);
      const profMap: Record<string, { full_name: string | null }> = {};
      (profs || []).forEach((pr: { id: string; full_name: string | null }) => { profMap[pr.id] = { full_name: pr.full_name }; });

      setReplies(threadReplies.map(r => ({ ...r, profiles: profMap[r.author_id] || { full_name: null } })));
    }

    // Check membership
    if (u) {
      const { data: mem } = await supabase.from("group_members").select("*").eq("group_id", groupId).eq("user_id", u.id).single();
      if (mem) setCurrentMember(mem);
    }

    setLoading(false);
  }, [groupId, postId]);

  useEffect(() => { loadData(); }, [loadData]);

  // Filter replies that belong to this thread
  function filterThreadReplies(allReplies: GroupForumPost[], rootId: string): GroupForumPost[] {
    const directChildren = allReplies.filter(r => r.parent_id === rootId);
    const result = [...directChildren];
    for (const child of directChildren) {
      result.push(...filterThreadReplies(allReplies, child.id));
    }
    return result;
  }

  const handleMainVote = async (voteType: "up" | "down") => {
    if (!user) return;
    try {
      if (userVote === voteType) {
        await supabase.from("group_forum_votes").delete().eq("user_id", user.id).eq("post_id", postId);
        if (voteType === "up") setUpvotes(Math.max(0, upvotes - 1));
        else setDownvotes(Math.max(0, downvotes - 1));
        setUserVote(null);
      } else {
        if (userVote) {
          await supabase.from("group_forum_votes").delete().eq("user_id", user.id).eq("post_id", postId);
          if (userVote === "up") setUpvotes(Math.max(0, upvotes - 1));
          else setDownvotes(Math.max(0, downvotes - 1));
        }
        await supabase.from("group_forum_votes").insert({ user_id: user.id, post_id: postId, vote_type: voteType });
        if (voteType === "up") setUpvotes(u => u + 1);
        else setDownvotes(d => d + 1);
        setUserVote(voteType);
      }
    } catch (err) { console.error(err); }
  };

  const handlePostReply = async () => {
    if (!user || !replyBody.trim()) return;
    setPosting(true);
    const { data: newReply } = await supabase.from("group_forum_posts").insert({
      group_id: groupId,
      author_id: user.id,
      body: replyBody.trim(),
      parent_id: postId,
    }).select().single();

    if (newReply) {
      const mentions = extractMentions(replyBody);
      if (mentions.length > 0) {
        await supabase.from("entity_mentions").insert(
          mentions.map(m => ({
            source_type: "group_forum_reply",
            source_id: newReply.id,
            target_type: m.type,
            target_id: m.id,
            target_uid: m.uid,
            mentioned_by: user.id,
          }))
        );
      }
      triggerTranslation(replyBody.trim(), "group_post_body", newReply.id, locale);
    }
    setReplyBody("");
    setPosting(false);
    loadData();
  };

  const handleDeleteReply = async (replyId: string) => {
    await supabase.from("group_forum_posts").delete().eq("id", replyId);
    loadData();
  };

  // Mod actions
  const handleTogglePin = async () => {
    if (!post) return;
    await supabase.from("group_forum_posts").update({ is_pinned: !post.is_pinned }).eq("id", postId);
    loadData();
  };
  const handleToggleLock = async () => {
    if (!post) return;
    await supabase.from("group_forum_posts").update({ is_locked: !post.is_locked }).eq("id", postId);
    loadData();
  };
  const handleDeletePost = async () => {
    await supabase.from("group_forum_posts").delete().eq("id", postId);
    window.location.href = `/groups/${groupId}`;
  };

  const isAdmin = currentMember?.role === "founder" || currentMember?.role === "admin";
  const isMember = !!currentMember;
  const netScore = upvotes - downvotes;
  const topLevelReplies = replies.filter(r => r.parent_id === postId);
  const profilesMap: Record<string, { full_name: string | null }> = {};
  replies.forEach(r => { if (r.profiles) profilesMap[r.author_id] = r.profiles; });

  if (loading) {
    return (
      <AppShell isGuest pendingDelegations={0}>
        <div className="flex items-center justify-center py-24">
          <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
        </div>
      </AppShell>
    );
  }

  if (!post || !group) {
    return (
      <AppShell isGuest pendingDelegations={0}>
        <div className="max-w-3xl mx-auto px-4 py-16 text-center">
          <p className="text-lg font-semibold" style={{ color: "var(--foreground)" }}>{t("groupDiscussions.notFound")}</p>
          <Link href={`/groups/${groupId}`} className="text-purple-400 text-sm mt-2 inline-block hover:underline">
            {t("groupDiscussions.backToGroup")}
          </Link>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell
      userEmail={user ? "" : undefined}
      userName={profile?.full_name}
      userRole={profile?.role}
      isGuest={isGuest}
      pendingDelegations={pendingDelegations}
    >
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-1.5 text-sm mb-6 flex-wrap" style={{ color: "var(--muted-foreground)" }}>
          <Link href="/groups" className="hover:underline">{t("groups.title")}</Link>
          <span>/</span>
          <Link href={`/groups/${groupId}`} className="hover:underline">{group.logo_emoji} {group.name}</Link>
          <span>/</span>
          <span style={{ color: "var(--foreground)" }} className="font-medium truncate max-w-[200px]">
            {post.title || t("groupDiscussions.discussion")}
          </span>
        </nav>

        {/* Main post */}
        <div className="rounded-xl border p-6 mb-6" style={{ backgroundColor: "var(--card)", borderColor: "var(--border)" }}>
          {/* Badges */}
          <div className="flex items-center gap-2 flex-wrap mb-3">
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
            {post.uid && <UidBadge uid={post.uid} />}
          </div>

          {/* Title */}
          {post.title && (
            <h1 className="text-xl font-bold mb-3" style={{ color: "var(--foreground)" }}>{post.title}</h1>
          )}

          {/* Author */}
          <div className="flex items-center gap-2 text-xs mb-4" style={{ color: "var(--muted-foreground)" }}>
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-purple-600 to-purple-800 flex items-center justify-center text-xs font-bold text-white shrink-0">
              {(post.profiles?.full_name || "?")[0].toUpperCase()}
            </div>
            <PrivacyName userId={post.author_id} fullName={post.profiles?.full_name ?? null} currentUserId={user?.id} className="font-medium" />
            <span>·</span>
            <span>{formatTimeAgo(post.created_at)}</span>
            <span>·</span>
            <span className="flex items-center gap-1"><Eye className="w-3 h-3" /> {post.views_count || 0} {t("groupDiscussions.views")}</span>
          </div>

          {/* Body */}
          <div className="text-sm leading-relaxed mb-4" style={{ color: "var(--foreground)" }}>
            <MentionText text={post.body} />
          </div>

          {/* Vote bar + mod tools */}
          <div className="flex items-center justify-between pt-4" style={{ borderTop: "1px solid var(--border)" }}>
            <div className="flex items-center gap-3">
              <button onClick={() => handleMainVote("up")} disabled={!user}
                className={`flex items-center gap-1 px-2 py-1 rounded transition-colors ${userVote === "up" ? "text-purple-400 bg-purple-900/30" : "hover:bg-[var(--muted)]"} disabled:opacity-50`}
                style={userVote !== "up" ? { color: "var(--muted-foreground)" } : undefined}>
                <ArrowBigUp className="w-4 h-4" /> <span className="text-xs font-medium">{upvotes}</span>
              </button>
              <span className={`text-xs font-semibold px-2 py-0.5 rounded ${netScore > 0 ? "text-green-400 bg-green-500/10" : netScore < 0 ? "text-red-400 bg-red-500/10" : ""}`}
                style={netScore === 0 ? { color: "var(--muted-foreground)" } : undefined}>
                {netScore > 0 ? "+" : ""}{netScore}
              </span>
              <button onClick={() => handleMainVote("down")} disabled={!user}
                className={`flex items-center gap-1 px-2 py-1 rounded transition-colors ${userVote === "down" ? "text-red-400 bg-red-500/20" : "hover:bg-[var(--muted)]"} disabled:opacity-50`}
                style={userVote !== "down" ? { color: "var(--muted-foreground)" } : undefined}>
                <ArrowBigDown className="w-4 h-4" /> <span className="text-xs font-medium">{downvotes}</span>
              </button>
              <span className="flex items-center gap-1 text-xs" style={{ color: "var(--muted-foreground)" }}>
                <MessageCircle className="w-3.5 h-3.5" /> {replies.length}
              </span>
            </div>

            {/* Admin mod tools */}
            {isAdmin && (
              <div className="flex items-center gap-1.5">
                <button onClick={handleTogglePin}
                  className={`p-1.5 rounded transition-colors ${post.is_pinned ? "text-purple-400 bg-purple-900/30" : "hover:bg-[var(--muted)]"}`}
                  style={!post.is_pinned ? { color: "var(--muted-foreground)" } : undefined}
                  title={post.is_pinned ? t("groupDiscussions.unpin") : t("groupDiscussions.pin")}>
                  <Pin className="w-4 h-4" />
                </button>
                <button onClick={handleToggleLock}
                  className={`p-1.5 rounded transition-colors ${post.is_locked ? "text-amber-400 bg-amber-900/30" : "hover:bg-[var(--muted)]"}`}
                  style={!post.is_locked ? { color: "var(--muted-foreground)" } : undefined}
                  title={post.is_locked ? t("groupDiscussions.unlock") : t("groupDiscussions.lock")}>
                  <Lock className="w-4 h-4" />
                </button>
                <button onClick={handleDeletePost}
                  className="p-1.5 rounded text-red-400 transition-colors hover:bg-red-500/10"
                  title={t("groupDiscussions.delete")}>
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Reply form (for members, if not locked) */}
        {isMember && !post.is_locked && (
          <div className="rounded-xl border p-5 mb-6" style={{ backgroundColor: "var(--card)", borderColor: "var(--border)" }}>
            <h3 className="text-sm font-semibold mb-3" style={{ color: "var(--foreground)" }}>{t("groupDiscussions.writeReply")}</h3>
            <MentionInput value={replyBody} onChange={setReplyBody} placeholder={t("groupDiscussions.replyPlaceholder")} rows={4}
              className="w-full px-4 py-2.5 rounded-lg border text-sm resize-none"
              />
            <button onClick={handlePostReply} disabled={posting || !replyBody.trim()}
              className="mt-3 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50">
              {posting ? "..." : t("groupDiscussions.postReply")}
            </button>
          </div>
        )}

        {post.is_locked && (
          <div className="flex items-center gap-2 px-4 py-3 mb-6 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400 text-sm">
            <Lock className="w-4 h-4 shrink-0" /> {t("groupDiscussions.lockedMessage")}
          </div>
        )}

        {/* Replies */}
        <div className="rounded-xl border overflow-hidden" style={{ backgroundColor: "var(--card)", borderColor: "var(--border)" }}>
          <div className="px-5 py-3" style={{ borderBottom: "1px solid var(--border)" }}>
            <h3 className="text-sm font-semibold" style={{ color: "var(--foreground)" }}>
              {t("groupDiscussions.replies")} ({replies.length})
            </h3>
          </div>
          <div className="px-5 py-2">
            {topLevelReplies.length > 0 ? (
              topLevelReplies.map(reply => (
                <ReplyItem key={reply.id} reply={reply} userId={user?.id} isAdmin={isAdmin}
                  depth={0} childReplies={[]} allReplies={replies}
                  profilesMap={profilesMap} postId={postId} isLocked={post.is_locked}
                  onReplyAdded={loadData} onDelete={handleDeleteReply} />
              ))
            ) : (
              <div className="text-center py-10 text-sm" style={{ color: "var(--muted-foreground)" }}>
                {t("groupDiscussions.noReplies")}
              </div>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}

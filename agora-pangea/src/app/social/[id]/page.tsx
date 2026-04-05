import { createClient } from "@/lib/supabase/server";
import AppShell from "@/components/AppShell";
import DiscussionThreadClient from "@/components/DiscussionThreadClient";
import DiscussionModTools from "@/components/DiscussionModTools";
import { ArrowLeft, MessageCircle, Eye } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import TranslatedContent from "@/components/TranslatedContent";

// Server-side privacy name resolver
function resolvePrivacyName(
  fullName: string | null,
  privacy: { show_full_name?: boolean; display_name?: string | null; profile_visibility?: string } | null
): string {
  if (!privacy) return fullName || "Anonymous Citizen";
  if (privacy.profile_visibility === "private") return privacy.display_name || "Private Citizen";
  if (privacy.show_full_name === false) return privacy.display_name || "Anonymous Citizen";
  return fullName || "Anonymous Citizen";
}

export const metadata = {
  title: "Discussion Thread — Pangea",
  description: "Read and join the discussion",
};

export default async function DiscussionPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isGuest = !user;

  let profile: { full_name?: string; role?: string } | null = null;
  if (user) {
    const { data } = await supabase
      .from("profiles")
      .select("full_name, role")
      .eq("id", user.id)
      .single();
    profile = data;
  }

  // Fetch discussion (no profiles join — FK goes to auth.users, not profiles)
  const { data: discussion, error: discussionError } = await supabase
    .from("discussions")
    .select(
      `*,
       discussion_channels(id, name, slug, description, emoji, color),
       discussion_tags(tags(id, name, slug, usage_count))`
    )
    .eq("id", params.id)
    .single();

  if (discussionError || !discussion) {
    notFound();
  }

  // Increment view count
  await supabase
    .from("discussions")
    .update({ views_count: (discussion.views_count || 0) + 1 })
    .eq("id", params.id);

  // Transform tags
  const tags = (discussion.discussion_tags || []).map(
    (dt: { tags: Record<string, unknown> }) => dt.tags
  );

  // Fetch ALL replies (including nested ones) with flat array and parent_reply_id
  const { data: replies } = await supabase
    .from("discussion_replies")
    .select("*")
    .eq("discussion_id", params.id)
    .order("created_at", { ascending: true });

  // Fetch all author profiles separately (safe approach)
  const allAuthorIds = new Set<string>();
  if (discussion.author_id) allAuthorIds.add(discussion.author_id);
  if (replies) {
    for (const r of replies) {
      if (r.author_id) allAuthorIds.add(r.author_id as string);
    }
  }

  let profilesMap: Record<string, { full_name: string | null; bio: string | null }> = {};
  if (allAuthorIds.size > 0) {
    const { data: profilesData } = await supabase
      .from("profiles")
      .select("id, full_name, bio")
      .in("id", Array.from(allAuthorIds));
    if (profilesData) {
      profilesMap = Object.fromEntries(
        profilesData.map((p: { id: string; full_name: string | null; bio: string | null }) => [
          p.id,
          { full_name: p.full_name, bio: p.bio },
        ])
      );
    }
  }

  // Fetch privacy settings for all authors
  const { data: privacyData } = await supabase
    .from("privacy_settings")
    .select("user_id, show_full_name, display_name, profile_visibility")
    .in("user_id", Array.from(allAuthorIds));
  const privacyMapServer = new Map<string, { show_full_name?: boolean; display_name?: string | null; profile_visibility?: string }>();
  if (privacyData) {
    for (const p of privacyData) {
      privacyMapServer.set(p.user_id, p);
    }
  }

  // Check user votes on discussion
  let userVote: { vote_type: "up" | "down" } | null = null;
  if (user) {
    const { data: vote } = await supabase
      .from("discussion_votes")
      .select("vote_type")
      .eq("user_id", user.id)
      .eq("discussion_id", params.id)
      .is("reply_id", null)
      .maybeSingle();
    userVote = vote;
  }

  // Fetch user votes on ALL replies (including nested) in this thread
  let replyVotesMap: Record<string, "up" | "down"> = {};
  if (user && replies && replies.length > 0) {
    const replyIds = replies.map((r: Record<string, unknown>) => r.id as string);
    const { data: replyVotes } = await supabase
      .from("discussion_votes")
      .select("reply_id, vote_type")
      .eq("user_id", user.id)
      .in("reply_id", replyIds);
    if (replyVotes) {
      replyVotesMap = Object.fromEntries(
        replyVotes.map((v: { reply_id: string; vote_type: string }) => [v.reply_id, v.vote_type as "up" | "down"])
      );
    }
  }

  const isModOrAdmin = profile?.role === "admin" || profile?.role === "moderator";

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

  const authorProfile = profilesMap[discussion.author_id] || { full_name: null, bio: null };

  return (
    <AppShell
      userEmail={user?.email}
      userName={profile?.full_name}
      userRole={profile?.role}
      isGuest={isGuest}
    >
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Back button */}
        <Link
          href="/social"
          className="inline-flex items-center gap-2 text-fg-primary hover:text-fg-primary font-medium mb-6 transition-colors overflow-hidden"
        >
          <ArrowLeft className="w-4 h-4 shrink-0" />
          <span className="truncate">Back to Agora</span>
        </Link>

        {/* Discussion Header Card */}
        <div className="card p-8 mb-8 overflow-hidden">
          {/* Channel badge + metadata + mod tools */}
          <div className="flex items-center justify-between gap-2 mb-4 flex-wrap">
            <div className="flex items-center gap-2 flex-wrap">
              {discussion.discussion_channels && (
                <>
                  <Link
                    href={`/social?channel=${discussion.discussion_channels.id}`}
                    className="inline-flex items-center gap-1.5 text-sm text-fg bg-theme-muted/40 px-3 py-1 rounded-full hover:bg-theme-muted/60 transition-colors shrink-0"
                  >
                    <span className="text-base">
                      {discussion.discussion_channels.emoji}
                    </span>
                    <span className="truncate">{discussion.discussion_channels.name}</span>
                  </Link>
                  <span className="text-fg-muted shrink-0">·</span>
                </>
              )}
              <span className="text-sm text-fg-muted shrink-0">
                {formatTimeAgo(discussion.created_at)}
              </span>
            </div>

            {/* Moderator tools */}
            {isModOrAdmin && (
              <DiscussionModTools
                discussionId={params.id}
                isPinned={discussion.is_pinned}
                isLocked={discussion.is_locked}
              />
            )}
          </div>

          {/* Title */}
          <h1 className="text-3xl font-bold text-fg mb-4">
            <TranslatedContent
              text={discussion.title}
              contentType="forum_post_title"
              contentId={discussion.id}
            />
          </h1>

          {/* Author info */}
          <div className="flex items-center gap-3 py-4 border-b border-theme overflow-hidden">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-fg truncate">
                {resolvePrivacyName(authorProfile.full_name, privacyMapServer.get(discussion.author_id) || null)}
              </p>
              {authorProfile.bio && (
                <p className="text-xs text-fg-muted mt-0.5 truncate">
                  {authorProfile.bio}
                </p>
              )}
            </div>
            <div className="ml-auto shrink-0 flex gap-2">
              {discussion.is_pinned && (
                <span className="text-xs px-2 py-1 bg-amber-900/30 text-amber-400 border border-amber-700/50 rounded-full shrink-0">
                  📌 Pinned
                </span>
              )}
              {discussion.is_locked && (
                <span className="text-xs px-2 py-1 bg-danger-tint text-fg-danger border border-theme rounded-full shrink-0">
                  🔒 Locked
                </span>
              )}
            </div>
          </div>

          {/* Discussion body */}
          <div className="py-6 prose prose-invert max-w-none">
            <TranslatedContent
              text={discussion.body}
              contentType="forum_post_body"
              contentId={discussion.id}
              as="p"
              className="text-fg leading-relaxed whitespace-pre-wrap text-[15px]"
            />
          </div>

          {/* Tags */}
          {tags && tags.length > 0 && (
            <div className="flex gap-2 flex-wrap mb-6 pt-4 border-t border-theme">
              {tags.map((tag: Record<string, unknown>) => (
                <Link
                  key={tag.id as string}
                  href={`/social?tag=${tag.id}`}
                  className="text-xs text-fg-primary bg-pangea-900/20 px-3 py-1.5 rounded-full border border-pangea-800/30 hover:border-pangea-700/50 hover:text-fg-primary transition-colors"
                >
                  #{tag.name as string}
                </Link>
              ))}
            </div>
          )}

          {/* Stats and voting */}
          <div className="flex items-center justify-between pt-4 border-t border-theme">
            <div className="flex items-center gap-4 text-sm text-fg-muted">
              <span className="flex items-center gap-1">
                <MessageCircle className="w-4 h-4" />
                {discussion.replies_count || 0} replies
              </span>
              <span className="flex items-center gap-1">
                <Eye className="w-4 h-4" />
                {discussion.views_count || 0} views
              </span>
            </div>

            {/* Voting section */}
            <DiscussionThreadClient
              discussionId={params.id}
              initialUpvotes={discussion.upvotes_count || 0}
              initialDownvotes={discussion.downvotes_count || 0}
              initialUserVote={userVote?.vote_type || null}
              userId={user?.id}
              isLocked={discussion.is_locked}
            />
          </div>
        </div>

        {/* Replies section */}
        {discussion.is_locked ? (
          <div className="card p-8 text-center text-fg-muted">
            <p className="mb-2">🔒 This discussion is locked</p>
            <p className="text-sm">No new replies can be added</p>
          </div>
        ) : (
          <>
            {/* Reply form */}
            {user ? (
              <div className="card p-6 mb-8">
                <h3 className="text-lg font-semibold text-fg mb-4">
                  Join the Discussion
                </h3>
                <DiscussionThreadClient
                  discussionId={params.id}
                  userId={user.id}
                  isReplyForm={true}
                  replies={replies || []}
                  profilesMap={profilesMap}
                  userVotes={replyVotesMap}
                />
              </div>
            ) : (
              <div className="card p-8 text-center mb-8">
                <p className="text-fg-muted mb-4">
                  Sign in to reply to this discussion
                </p>
                <Link
                  href="/auth"
                  className="inline-block px-4 py-2 bg-pangea-600 hover:bg-pangea-700 text-fg rounded-lg transition-colors"
                >
                  Sign In
                </Link>
              </div>
            )}

            {/* Threaded replies heading */}
            {replies && replies.length > 0 && (
              <h3 className="text-lg font-semibold text-fg mb-4">
                Replies ({replies.length})
              </h3>
            )}
          </>
        )}
      </div>
    </AppShell>
  );
}

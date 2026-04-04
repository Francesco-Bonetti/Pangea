import { createClient } from "@/lib/supabase/server";
import AppShell from "@/components/AppShell";
import DiscussionThreadClient from "@/components/DiscussionThreadClient";
import { ArrowLeft, MessageCircle, Hash } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

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
  title: "Discussion Thread — Agora Pangea",
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

  // Fetch discussion with all related data
  const { data: discussion, error: discussionError } = await supabase
    .from("discussions")
    .select(
      `*,
       profiles(id, full_name, bio),
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

  // Fetch replies
  const { data: replies } = await supabase
    .from("discussion_replies")
    .select(
      `*,
       profiles(id, full_name, bio)`
    )
    .eq("discussion_id", params.id)
    .order("created_at", { ascending: true });

  // Fetch privacy settings for discussion author and reply authors
  const allAuthorIds = new Set<string>();
  if (discussion.author_id) allAuthorIds.add(discussion.author_id);
  if (replies) {
    for (const r of replies) {
      if (r.author_id) allAuthorIds.add(r.author_id as string);
    }
  }
  const { data: privacyData } = await supabase
    .from("privacy_settings")
    .select("user_id, show_full_name, display_name, profile_visibility")
    .in("user_id", Array.from(allAuthorIds));
  const privacyMap = new Map<string, { show_full_name?: boolean; display_name?: string | null; profile_visibility?: string }>();
  if (privacyData) {
    for (const p of privacyData) {
      privacyMap.set(p.user_id, p);
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
      .maybeSingle();
    userVote = vote;
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
          className="inline-flex items-center gap-2 text-pangea-400 hover:text-pangea-300 font-medium mb-6 transition-colors overflow-hidden"
        >
          <ArrowLeft className="w-4 h-4 shrink-0" />
          <span className="truncate">Back to Forum</span>
        </Link>

        {/* Discussion Header Card */}
        <div className="card p-8 mb-8 overflow-hidden">
          {/* Channel badge + metadata */}
          <div className="flex items-center gap-2 mb-4 flex-wrap">
            {discussion.discussion_channels && (
              <>
                <span className="inline-flex items-center gap-1.5 text-sm text-slate-300 bg-slate-700/40 px-3 py-1 rounded-full shrink-0">
                  <span className="text-base">
                    {discussion.discussion_channels.emoji}
                  </span>
                  <span className="truncate">{discussion.discussion_channels.name}</span>
                </span>
                <span className="text-slate-500 shrink-0">•</span>
              </>
            )}
            <span className="text-sm text-slate-500 shrink-0">
              {formatTimeAgo(discussion.created_at)}
            </span>
          </div>

          {/* Title */}
          <h1 className="text-3xl font-bold text-white mb-4 truncate">
            {discussion.title}
          </h1>

          {/* Author info */}
          <div className="flex items-center gap-3 py-4 border-b border-slate-700 overflow-hidden">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-200 truncate">
                {resolvePrivacyName(discussion.profiles?.full_name, privacyMap.get(discussion.author_id) || null)}
              </p>
              {discussion.profiles?.bio && (
                <p className="text-xs text-slate-400 mt-0.5 truncate">
                  {discussion.profiles.bio}
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
                <span className="text-xs px-2 py-1 bg-red-900/30 text-red-400 border border-red-700/50 rounded-full shrink-0">
                  🔒 Locked
                </span>
              )}
            </div>
          </div>

          {/* Discussion body */}
          <div className="py-6 prose prose-invert max-w-none">
            <p className="text-slate-200 leading-relaxed whitespace-pre-wrap text-[15px]">
              {discussion.body}
            </p>
          </div>

          {/* Tags */}
          {tags && tags.length > 0 && (
            <div className="flex gap-2 flex-wrap mb-6 pt-4 border-t border-slate-700">
              {tags.map((tag: Record<string, unknown>) => (
                <Link
                  key={tag.id as string}
                  href={`/social?tag=${tag.id}`}
                  className="text-xs text-pangea-400 bg-pangea-900/20 px-3 py-1.5 rounded-full border border-pangea-800/30 hover:border-pangea-700/50 hover:text-pangea-300 transition-colors"
                >
                  #{tag.name as string}
                </Link>
              ))}
            </div>
          )}

          {/* Stats and voting */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-700">
            <div className="flex items-center gap-4 text-sm text-slate-400">
              <span className="flex items-center gap-1">
                <MessageCircle className="w-4 h-4" />
                {discussion.replies_count || 0} replies
              </span>
              <span>{discussion.views_count || 0} views</span>
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
          <div className="card p-8 text-center text-slate-400">
            <p className="mb-2">🔒 This discussion is locked</p>
            <p className="text-sm">No new replies can be added</p>
          </div>
        ) : (
          <>
            {/* Reply form */}
            {user ? (
              <div className="card p-6 mb-8">
                <h3 className="text-lg font-semibold text-slate-200 mb-4">
                  Join the Discussion
                </h3>
                <DiscussionThreadClient
                  discussionId={params.id}
                  userId={user.id}
                  isReplyForm={true}
                />
              </div>
            ) : (
              <div className="card p-8 text-center mb-8">
                <p className="text-slate-400 mb-4">
                  Sign in to reply to this discussion
                </p>
                <a
                  href="/auth"
                  className="inline-block px-4 py-2 bg-pangea-600 hover:bg-pangea-700 text-white rounded-lg transition-colors"
                >
                  Sign In
                </a>
              </div>
            )}

            {/* Replies list */}
            {replies && replies.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-slate-200">
                  Replies ({replies.length})
                </h3>
                {replies.map((reply: Record<string, unknown>) => (
                  <div key={reply.id as string} className="card p-5 border-l-4 border-pangea-600">
                    {/* Reply header */}
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="font-medium text-slate-200">
                          {resolvePrivacyName(
                            (reply.profiles as { full_name: string } | null)?.full_name ?? null,
                            privacyMap.get(reply.author_id as string) || null
                          )}
                        </p>
                        <p className="text-xs text-slate-500">
                          {formatTimeAgo(reply.created_at as string)}
                        </p>
                      </div>
                    </div>

                    {/* Reply body */}
                    <p className="text-slate-300 text-sm leading-relaxed whitespace-pre-wrap mb-3">
                      {reply.body as string}
                    </p>

                    {/* Reply voting */}
                    <div className="flex items-center gap-3 text-xs">
                      {user && (
                        <>
                          <button className="text-slate-400 hover:text-slate-300 transition-colors">
                            👍
                          </button>
                          <span className="text-slate-500">
                            {(reply.upvotes_count as number) || 0}
                          </span>
                          <button className="text-slate-400 hover:text-slate-300 transition-colors">
                            👎
                          </button>
                          <span className="text-slate-500">
                            {(reply.downvotes_count as number) || 0}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </AppShell>
  );
}

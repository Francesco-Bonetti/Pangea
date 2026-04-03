import { createClient } from "@/lib/supabase/server";
import Navbar from "@/components/Navbar";
import GuestBanner from "@/components/GuestBanner";
import NewDiscussionForm from "@/components/NewDiscussionForm";
import NewChannelForm from "@/components/NewChannelForm";
import ForumClient from "@/components/ForumClient";
import ForumControls from "@/components/ForumControls";
import { MessageCircle, TrendingUp, ArrowLeft } from "lucide-react";
import Link from "next/link";
import type { DiscussionChannel, Discussion, Tag } from "@/lib/types";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Community Forum — Agora Pangea",
  description: "Join the community discussion forum",
};

export default async function SocialPage({
  searchParams,
}: {
  searchParams: { channel?: string; sort?: string; search?: string; tag?: string };
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

  // Fetch channels
  const { data: channels } = await supabase
    .from("discussion_channels")
    .select("*")
    .eq("is_active", true)
    .order("sort_order");

  // Fetch trending tags
  const { data: trendingTags } = await supabase
    .from("tags")
    .select("*")
    .order("usage_count", { ascending: false })
    .limit(15);

  // Build query for discussions
  let query = supabase
    .from("discussions")
    .select(
      `*,
       profiles(full_name),
       discussion_channels(id, name, slug, description, emoji, color, sort_order, is_active),
       discussion_tags(tags(id, name, slug, usage_count))`
    );

  // Apply channel filter
  if (searchParams.channel) {
    query = query.eq("channel_id", searchParams.channel);
  }

  // Apply tag filter
  if (searchParams.tag) {
    // For tag filtering, we need to join through discussion_tags
    const { data: taggedDiscussionIds } = await supabase
      .from("discussion_tags")
      .select("discussion_id")
      .eq("tag_id", searchParams.tag);

    if (taggedDiscussionIds && taggedDiscussionIds.length > 0) {
      const ids = taggedDiscussionIds.map((t: { discussion_id: string }) => t.discussion_id);
      query = query.in("id", ids);
    } else {
      query = query.eq("id", null); // Return empty results
    }
  }

  // Apply search filter
  if (searchParams.search) {
    const searchTerm = `%${searchParams.search}%`;
    query = query.or(`title.ilike.${searchTerm},body.ilike.${searchTerm}`);
  }

  // Apply sorting
  const sort = searchParams.sort || "newest";
  if (sort === "newest") {
    query = query.order("created_at", { ascending: false });
  } else if (sort === "most_upvoted") {
    query = query.order("upvotes_count", { ascending: false });
  } else if (sort === "most_discussed") {
    query = query.order("replies_count", { ascending: false });
  } else if (sort === "trending") {
    // Trending = recent + high engagement
    query = query.order("created_at", { ascending: false });
  }

  query = query.limit(50);

  const { data: discussions } = await query;

  // Transform discussions to include tags
  const discussionsWithTags = (discussions || []).map(
    (d: Record<string, unknown>) => ({
      ...d,
      tags: ((d.discussion_tags as Array<{ tags: Tag }>) || []).map(
        (dt) => dt.tags
      ),
      discussion_channels: d.discussion_channels,
      profiles: d.profiles,
    })
  ) as unknown as Discussion[];

  return (
    <div className="min-h-screen bg-[#0c1220]">
      <Navbar
        userEmail={user?.email}
        userName={profile?.full_name}
        userRole={profile?.role}
        isGuest={isGuest}
      />
      {isGuest && <GuestBanner />}

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link
            href="/dashboard"
            className="p-2 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-white flex items-center gap-2">
              <MessageCircle className="w-8 h-8 text-pangea-400" />
              Community Forum
            </h1>
            <p className="text-sm text-slate-400 mt-1">
              Join discussions with the community
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Left Sidebar: Channels & Tags */}
          <div className="lg:col-span-1 space-y-4">
            {/* New Discussion CTA */}
            <div>
              {user ? (
                <a
                  href="#new-discussion"
                  className="w-full block px-4 py-3 bg-pangea-600 hover:bg-pangea-700 text-white font-medium rounded-lg text-center transition-colors"
                >
                  + New Discussion
                </a>
              ) : (
                <a
                  href="/auth"
                  className="w-full block px-4 py-3 bg-slate-700 hover:bg-slate-600 text-white font-medium rounded-lg text-center transition-colors"
                >
                  Sign In
                </a>
              )}
            </div>

            {/* Channels */}
            {channels && channels.length > 0 && (
              <div className="card p-4">
                <h3 className="text-sm font-semibold text-slate-200 mb-3">
                  Channels
                </h3>
                <div className="space-y-2">
                  <a
                    href="/social"
                    className={`block px-3 py-2 rounded-lg text-sm transition-colors ${
                      !searchParams.channel
                        ? "bg-pangea-900/40 text-pangea-300 border border-pangea-700/50"
                        : "text-slate-400 hover:text-slate-300 hover:bg-slate-700/30"
                    }`}
                  >
                    All Channels
                  </a>
                  {(channels as DiscussionChannel[]).map((ch) => (
                    <a
                      key={ch.id}
                      href={`/social?channel=${ch.id}`}
                      className={`block px-3 py-2 rounded-lg text-sm transition-colors flex items-center gap-2 ${
                        searchParams.channel === ch.id
                          ? "bg-pangea-900/40 text-pangea-300 border border-pangea-700/50"
                          : "text-slate-400 hover:text-slate-300 hover:bg-slate-700/30"
                      }`}
                    >
                      <span className="text-base">{ch.emoji}</span>
                      <span className="truncate">{ch.name}</span>
                    </a>
                  ))}
                  {/* Create Channel */}
                  {user && (
                    <div className="mt-2 pt-2 border-t border-slate-700/50">
                      <NewChannelForm userId={user.id} />
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Tags */}
            {trendingTags && trendingTags.length > 0 && (
              <div className="card p-4">
                <h3 className="text-sm font-semibold text-slate-200 mb-3 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-pangea-400" />
                  Popular Tags
                </h3>
                <div className="flex flex-wrap gap-2">
                  {(trendingTags as Tag[]).map((tag) => (
                    <a
                      key={tag.id}
                      href={`/social?tag=${tag.id}`}
                      className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                        searchParams.tag === tag.id
                          ? "text-pangea-300 bg-pangea-900/40 border-pangea-700/50"
                          : "text-pangea-400 bg-pangea-900/20 border-pangea-800/30 hover:border-pangea-700/50"
                      }`}
                    >
                      #{tag.name}
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Main Content: Discussions */}
          <div className="lg:col-span-3 space-y-6">
            {/* New Discussion Form */}
            {user && (
              <div id="new-discussion">
                <h2 className="text-lg font-semibold text-slate-200 mb-4">
                  Start a Discussion
                </h2>
                <NewDiscussionForm userId={user.id} />
              </div>
            )}

            {/* Forum Controls */}
            <div>
              <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-slate-200">
                  {searchParams.channel
                    ? channels?.find((c: DiscussionChannel) => c.id === searchParams.channel)?.name ||
                      "Discussions"
                    : "All Discussions"}
                </h2>
                <ForumControls
                  currentSort={searchParams.sort || "newest"}
                  currentSearch={searchParams.search || ""}
                />
              </div>

              {/* Discussions List */}
              <ForumClient
                discussions={discussionsWithTags}
                userId={user?.id}
                channels={channels ? (channels as DiscussionChannel[]) : undefined}
              />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

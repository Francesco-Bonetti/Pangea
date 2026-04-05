import { createClient } from "@/lib/supabase/server";
import AppShell from "@/components/AppShell";
import NewChannelForm from "@/components/NewChannelForm";
import ForumClient from "@/components/ForumClient";
import ForumControls from "@/components/ForumControls";
import {
  SocialHeader,
  NewDiscussionCTA,
  ChannelsSidebar,
  TagsSidebar,
  DiscussionSectionHeader,
} from "@/components/SocialPageContent";
import type { DiscussionChannel, Discussion, Tag } from "@/lib/types";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Agora — Pangea",
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

  // Build query for discussions (no profiles join — FK goes to auth.users, not profiles)
  let query = supabase
    .from("discussions")
    .select(
      `*,
       discussion_channels(id, name, slug, description, emoji, color, sort_order, is_active),
       discussion_tags(tags(id, name, slug, usage_count))`
    );

  // Apply channel filter
  if (searchParams.channel) {
    query = query.eq("channel_id", searchParams.channel);
  }

  // Apply tag filter
  if (searchParams.tag) {
    const { data: taggedDiscussionIds } = await supabase
      .from("discussion_tags")
      .select("discussion_id")
      .eq("tag_id", searchParams.tag);

    if (taggedDiscussionIds && taggedDiscussionIds.length > 0) {
      const ids = taggedDiscussionIds.map((t: { discussion_id: string }) => t.discussion_id);
      query = query.in("id", ids);
    } else {
      query = query.eq("id", null);
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
    query = query.order("created_at", { ascending: false });
  }

  query = query.limit(50);

  const { data: discussions } = await query;

  // Get total count for load more button
  let countQuery = supabase
    .from("discussions")
    .select("*", { count: "exact", head: true });

  if (searchParams.channel) {
    countQuery = countQuery.eq("channel_id", searchParams.channel);
  }

  if (searchParams.tag) {
    const { data: taggedDiscussionIds } = await supabase
      .from("discussion_tags")
      .select("discussion_id")
      .eq("tag_id", searchParams.tag);

    if (taggedDiscussionIds && taggedDiscussionIds.length > 0) {
      const ids = taggedDiscussionIds.map((t: { discussion_id: string }) => t.discussion_id);
      countQuery = countQuery.in("id", ids);
    } else {
      countQuery = countQuery.eq("id", null);
    }
  }

  if (searchParams.search) {
    const searchTerm = `%${searchParams.search}%`;
    countQuery = countQuery.or(`title.ilike.${searchTerm},body.ilike.${searchTerm}`);
  }

  const { count: totalCount } = await countQuery;

  // Fetch author profiles separately
  const authorIds = Array.from(new Set((discussions || []).map((d: Record<string, unknown>) => d.author_id as string)));
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

  // Transform discussions to include tags and profiles
  const discussionsWithTags = (discussions || []).map(
    (d: Record<string, unknown>) => ({
      ...d,
      tags: ((d.discussion_tags as Array<{ tags: Tag }>) || []).map(
        (dt) => dt.tags
      ),
      discussion_channels: d.discussion_channels,
      profiles: profilesMap[d.author_id as string] || { full_name: null },
    })
  ) as unknown as Discussion[];

  // Get active channel name for header
  const activeChannelName = searchParams.channel
    ? channels?.find((c: DiscussionChannel) => c.id === searchParams.channel)?.name
    : undefined;

  return (
    <AppShell
      userEmail={user?.email}
      userName={profile?.full_name}
      userRole={profile?.role}
      isGuest={isGuest}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <SocialHeader />

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Left Sidebar: Channels & Tags */}
          <div className="lg:col-span-1 space-y-4">
            {/* New Discussion CTA */}
            <div>
              <NewDiscussionCTA isLoggedIn={!!user} />
            </div>

            {/* Channels */}
            {channels && channels.length > 0 && (
              <>
                <ChannelsSidebar
                  channels={channels as DiscussionChannel[]}
                  activeChannel={searchParams.channel}
                />
                {/* Create Channel (inside channels card) */}
                {user && (
                  <div className="card p-4 pt-2">
                    <NewChannelForm userId={user.id} />
                  </div>
                )}
              </>
            )}

            {/* Tags */}
            {trendingTags && trendingTags.length > 0 && (
              <TagsSidebar
                tags={trendingTags as Tag[]}
                activeTag={searchParams.tag}
              />
            )}
          </div>

          {/* Main Content: Discussions */}
          <div className="lg:col-span-3 space-y-6">
            {/* Forum Controls + Header */}
            <div>
              <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between mb-4">
                <DiscussionSectionHeader channelName={activeChannelName} />
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
                totalCount={totalCount || 0}
                showNewDiscussionForm={!!user}
                newDiscussionUserId={user?.id}
              />
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

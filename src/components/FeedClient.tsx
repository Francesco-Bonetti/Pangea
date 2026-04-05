"use client";

import { createClient } from "@/lib/supabase/client";
import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  FileText, MessageSquare, Vote, Users, Rss, RefreshCw,
  Loader2, Globe, Flag, ChevronRight, Heart
} from "lucide-react";
import PrivacyName from "@/components/PrivacyName";
import type { FeedEvent, FollowTargetType } from "@/lib/types";

interface FeedClientProps {
  userId: string;
}

const EVENT_ICONS: Record<string, React.ReactNode> = {
  proposal_created: <FileText className="w-4 h-4 text-fg-primary" />,
  discussion_created: <MessageSquare className="w-4 h-4 text-blue-400" />,
  party_vote: <Vote className="w-4 h-4 text-amber-400" />,
  vote_cast: <Vote className="w-4 h-4 text-fg-success" />,
  law_approved: <Globe className="w-4 h-4 text-emerald-400" />,
  member_joined: <Users className="w-4 h-4 text-purple-400" />,
};

const EVENT_COLORS: Record<string, string> = {
  proposal_created: "border-l-pangea-500",
  discussion_created: "border-l-blue-500",
  party_vote: "border-l-amber-500",
  vote_cast: "border-l-green-500",
  law_approved: "border-l-emerald-500",
  member_joined: "border-l-purple-500",
};

function timeAgo(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

interface FollowedEntity {
  target_type: FollowTargetType;
  target_id: string;
  name: string;
}

export default function FeedClient({ userId }: FeedClientProps) {
  const supabase = createClient();
  const [events, setEvents] = useState<FeedEvent[]>([]);
  const [following, setFollowing] = useState<FollowedEntity[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [tab, setTab] = useState<"feed" | "following">("feed");

  const loadFeed = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true);
    else setLoading(true);

    const { data, error } = await supabase
      .rpc("get_personalized_feed", { p_limit: 50, p_offset: 0 });

    if (!error && data) {
      setEvents(data as FeedEvent[]);
      setHasMore(data.length === 50);
    }

    if (refresh) setRefreshing(false);
    else setLoading(false);
  }, []);

  const loadFollowing = useCallback(async () => {
    const { data: follows } = await supabase
      .from("follows")
      .select("target_type, target_id")
      .eq("follower_id", userId)
      .order("created_at", { ascending: false })
      .limit(500);

    if (!follows) return;

    const entities: FollowedEntity[] = [];

    // Resolve names
    type FollowRow = { target_type: string; target_id: string };
    const citizenIds = follows.filter((f: FollowRow) => f.target_type === "citizen").map((f: FollowRow) => f.target_id);
    const groupIds = follows.filter((f: FollowRow) => f.target_type === "group").map((f: FollowRow) => f.target_id);

    if (citizenIds.length > 0) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", citizenIds);
      profiles?.forEach((p: { id: string; full_name: string | null }) => entities.push({
        target_type: "citizen",
        target_id: p.id,
        name: p.full_name || "Citizen"
      }));
    }

    if (groupIds.length > 0) {
      const { data: groups } = await supabase
        .from("groups")
        .select("id, name")
        .in("id", groupIds);
      groups?.forEach((g: { id: string; name: string }) => entities.push({
        target_type: "group",
        target_id: g.id,
        name: g.name
      }));
    }

    setFollowing(entities);
  }, [userId]);

  useEffect(() => {
    loadFeed();
    loadFollowing();
  }, [loadFeed, loadFollowing]);

  const entityLink = (type: FollowTargetType, id: string): string => {
    switch (type) {
      case "citizen": return `/citizens/${id}`;
      case "group":
      case "party":
      case "jurisdiction":
        return `/groups/${id}`;
      default: return `/groups/${id}`;
    }
  };

  const entityIcon = (type: FollowTargetType) => {
    switch (type) {
      case "citizen": return <Users className="w-4 h-4 text-fg-muted" />;
      case "group": return <Flag className="w-4 h-4 text-amber-400" />;
    }
  };

  return (
    <div>
      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-theme-card rounded-lg p-1">
        <button
          onClick={() => setTab("feed")}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-md text-sm font-medium transition-all ${
            tab === "feed"
              ? "bg-pangea-600 text-fg shadow-lg"
              : "text-fg-muted hover:text-fg"
          }`}
        >
          <Rss className="w-4 h-4" />
          Feed
        </button>
        <button
          onClick={() => setTab("following")}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-md text-sm font-medium transition-all ${
            tab === "following"
              ? "bg-pangea-600 text-fg shadow-lg"
              : "text-fg-muted hover:text-fg"
          }`}
        >
          <Heart className="w-4 h-4" />
          Following ({following.length})
        </button>
      </div>

      {/* Feed tab */}
      {tab === "feed" && (
        <div>
          {/* Refresh button */}
          <div className="flex justify-end mb-4">
            <button
              onClick={() => loadFeed(true)}
              disabled={refreshing}
              className="inline-flex items-center gap-1.5 text-xs text-fg-muted hover:text-fg-primary transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
              Refresh
            </button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-6 h-6 animate-spin text-fg-primary" />
            </div>
          ) : events.length === 0 ? (
            <div className="card p-12 text-center">
              <Rss className="w-12 h-12 text-fg-muted mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-fg mb-2">Your feed is empty</h3>
              <p className="text-fg-muted text-sm max-w-md mx-auto mb-6">
                Follow citizens and groups to see their activity here.
                Your personalized feed will show proposals, discussions, and votes from
                people and organizations you care about.
              </p>
              <div className="flex flex-wrap gap-3 justify-center">
                <Link href="/groups" className="btn-primary px-4 py-2 text-sm inline-flex items-center gap-2">
                  <Flag className="w-4 h-4" /> Browse Groups
                </Link>
                <Link href="/dashboard" className="btn-secondary px-4 py-2 text-sm inline-flex items-center gap-2">
                  <Globe className="w-4 h-4" /> Explore Pangea
                </Link>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {events.map((event) => (
                <div
                  key={event.id}
                  className={`card p-4 border-l-2 ${EVENT_COLORS[event.event_type] || "border-l-slate-600"} hover:bg-theme-card/30 transition-colors overflow-hidden`}
                >
                  <div className="flex items-start gap-3 overflow-hidden">
                    <div className="mt-0.5 flex-shrink-0">
                      {EVENT_ICONS[event.event_type] || <FileText className="w-4 h-4 text-fg-muted shrink-0" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-fg font-medium truncate">{event.title}</p>
                      {event.description && (
                        <p className="text-xs text-fg-muted mt-1 truncate">{event.description}</p>
                      )}
                      <p className="text-xs text-fg-muted mt-1.5">{timeAgo(event.created_at)}</p>
                    </div>
                    {event.link && (
                      <Link
                        href={event.link}
                        className="flex-shrink-0 text-fg-primary hover:text-fg-primary transition-colors shrink-0"
                      >
                        <ChevronRight className="w-4 h-4 shrink-0" />
                      </Link>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Following tab */}
      {tab === "following" && (
        <div>
          {following.length === 0 ? (
            <div className="card p-12 text-center">
              <Heart className="w-12 h-12 text-fg-muted mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-fg mb-2">Not following anyone yet</h3>
              <p className="text-fg-muted text-sm max-w-md mx-auto">
                Visit citizen profiles and groups and click the Follow button to start building your network.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {following.map((entity) => (
                <Link
                  key={`${entity.target_type}-${entity.target_id}`}
                  href={entityLink(entity.target_type, entity.target_id)}
                  className="card p-4 flex items-center gap-3 hover:bg-theme-card/30 transition-colors overflow-hidden"
                >
                  <div className="w-8 h-8 rounded-full bg-theme-card flex items-center justify-center shrink-0">
                    {entityIcon(entity.target_type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-fg font-medium truncate">{entity.name}</p>
                    <p className="text-xs text-fg-muted capitalize">{entity.target_type}</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-fg-muted shrink-0" />
                </Link>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

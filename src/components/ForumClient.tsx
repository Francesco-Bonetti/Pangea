"use client";

import React, { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Loader } from "lucide-react";
import DiscussionCard from "./DiscussionCard";
import ReportModal from "./ReportModal";
import type { Discussion, DiscussionChannel } from "@/lib/types";

interface ForumClientProps {
  discussions: Discussion[];
  userId?: string;
  channels?: DiscussionChannel[];
  totalCount?: number;
}

export default function ForumClient({
  discussions: initialDiscussions,
  userId,
  channels,
  totalCount = 0,
}: ForumClientProps) {
  const supabase = createClient();
  const [discussions, setDiscussions] = useState<Discussion[]>(initialDiscussions);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportTarget, setReportTarget] = useState<{
    discussionId?: string;
    replyId?: string;
  }>({});
  const [showSuccess, setShowSuccess] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const handleReport = (discussionId: string) => {
    setReportTarget({ discussionId });
    setReportOpen(true);
  };

  const handleReportSuccess = () => {
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 3000);
  };

  const handleLoadMore = async () => {
    setIsLoadingMore(true);
    try {
      // Fetch next page of discussions
      const { data: newDiscussions } = await supabase
        .from("discussions")
        .select(
          `*,
           discussion_channels(id, name, slug, description, emoji, color, sort_order, is_active),
           discussion_tags(tags(id, name, slug, usage_count))`
        )
        .order("created_at", { ascending: false })
        .range(discussions.length, discussions.length + 19);

      if (newDiscussions) {
        // Fetch author profiles for new discussions
        const authorIds = Array.from(
          new Set((newDiscussions || []).map((d: Record<string, unknown>) => d.author_id as string))
        );
        let profilesMap: Record<string, { full_name: string | null }> = {};
        if (authorIds.length > 0) {
          const { data: profilesData } = await supabase
            .from("profiles")
            .select("id, full_name")
            .in("id", authorIds);
          if (profilesData) {
            profilesMap = Object.fromEntries(
              profilesData.map((p: { id: string; full_name: string | null }) => [
                p.id,
                { full_name: p.full_name },
              ])
            );
          }
        }

        // Transform new discussions
        const discussionsWithTags = (newDiscussions || []).map(
          (d: Record<string, unknown>) => ({
            ...d,
            tags: ((d.discussion_tags as Array<{ tags: any }>) || []).map(
              (dt) => dt.tags
            ),
            discussion_channels: d.discussion_channels,
            profiles: profilesMap[d.author_id as string] || { full_name: null },
          })
        ) as unknown as Discussion[];

        setDiscussions((prev) => [...prev, ...discussionsWithTags]);
      }
    } catch (error) {
      console.error("Error loading more discussions:", error);
    } finally {
      setIsLoadingMore(false);
    }
  };

  if (discussions.length === 0) {
    return (
      <div className="card p-12 text-center">
        <p className="text-fg-muted text-lg">
          No discussions yet. Be the first to start one!
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-3">
        {discussions.map((discussion) => (
          <DiscussionCard
            key={discussion.id}
            discussion={discussion}
            userId={userId}
            onReport={handleReport}
          />
        ))}
      </div>

      {/* Load More Button */}
      {discussions.length < totalCount && (
        <div className="flex justify-center mt-8">
          <button
            onClick={handleLoadMore}
            disabled={isLoadingMore}
            className="px-6 py-3 bg-pangea-600 hover:bg-pangea-700 disabled:bg-pangea-600/50 text-fg font-medium rounded-lg transition-colors disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isLoadingMore && <Loader className="w-4 h-4 animate-spin" />}
            {isLoadingMore ? "Loading..." : "Load More Discussions"}
          </button>
        </div>
      )}

      {showSuccess && (
        <div className="fixed bottom-4 right-4 bg-green-600 text-fg px-4 py-3 rounded-lg shadow-lg">
          Thank you for your report. Our moderators will review it soon.
        </div>
      )}

      <ReportModal
        isOpen={reportOpen}
        onClose={() => setReportOpen(false)}
        discussionId={reportTarget.discussionId}
        replyId={reportTarget.replyId}
        userId={userId}
        onSuccess={handleReportSuccess}
      />
    </>
  );
}

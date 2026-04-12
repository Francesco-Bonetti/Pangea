"use client";

import React, { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Loader, PenSquare, ChevronUp } from "lucide-react";
import DiscussionCard from "@/components/social/DiscussionCard";
import ReportModal from "@/components/social/ReportModal";
import NewDiscussionForm from "@/components/social/NewDiscussionForm";
import { useLanguage } from "@/components/core/language-provider";
import type { Discussion, DiscussionChannel } from "@/lib/types";

interface ForumClientProps {
  discussions: Discussion[];
  userId?: string;
  channels?: DiscussionChannel[];
  totalCount?: number;
  showNewDiscussionForm?: boolean;
  newDiscussionUserId?: string;
}

export default function ForumClient({
  discussions: initialDiscussions,
  userId,
  channels,
  totalCount = 0,
  showNewDiscussionForm = false,
  newDiscussionUserId,
}: ForumClientProps) {
  const supabase = createClient();
  const { t } = useLanguage();
  const [discussions, setDiscussions] = useState<Discussion[]>(initialDiscussions);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportTarget, setReportTarget] = useState<{
    discussionId?: string;
    replyId?: string;
  }>({});
  const [showSuccess, setShowSuccess] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isFormExpanded, setIsFormExpanded] = useState(false);

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

  return (
    <>
      {/* Collapsible New Discussion Form */}
      {showNewDiscussionForm && newDiscussionUserId && (
        <div className="mb-4">
          {!isFormExpanded ? (
            <button
              onClick={() => setIsFormExpanded(true)}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-pangea-600 hover:bg-pangea-700 text-fg font-medium rounded-lg transition-all duration-200 shadow-sm hover:shadow-md"
            >
              <PenSquare className="w-4 h-4" />
              {t("forum.startDiscussion")}
            </button>
          ) : (
            <div className="card overflow-hidden transition-all duration-300">
              <button
                onClick={() => setIsFormExpanded(false)}
                className="w-full flex items-center justify-between px-4 py-2.5 bg-theme-muted/30 hover:bg-theme-muted/50 text-fg text-sm font-medium transition-colors border-b border-theme"
              >
                <span className="flex items-center gap-2">
                  <PenSquare className="w-4 h-4 text-fg-primary" />
                  {t("forum.startDiscussion")}
                </span>
                <ChevronUp className="w-4 h-4 text-fg-muted" />
              </button>
              <div className="p-0">
                <NewDiscussionForm
                  userId={newDiscussionUserId}
                  onSuccess={() => setIsFormExpanded(false)}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {discussions.length === 0 ? (
        <div className="card p-12 text-center">
          <p className="text-fg-muted text-lg">
            {t("forum.noDiscussions")}
          </p>
        </div>
      ) : (
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
      )}

      {/* Load More Button */}
      {discussions.length < totalCount && (
        <div className="flex justify-center mt-8">
          <button
            onClick={handleLoadMore}
            disabled={isLoadingMore}
            className="px-6 py-3 bg-pangea-600 hover:bg-pangea-700 disabled:bg-pangea-600/50 text-fg font-medium rounded-lg transition-colors disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isLoadingMore && <Loader className="w-4 h-4 animate-spin" />}
            {isLoadingMore ? t("forumExtra.loadMore") + "..." : t("forumExtra.loadMore")}
          </button>
        </div>
      )}

      {showSuccess && (
        <div className="fixed bottom-4 right-4 bg-green-600 text-fg px-4 py-3 rounded-lg shadow-lg">
          {t("forum.reportSuccess")}
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

"use client";

import React, { useState } from "react";
import DiscussionCard from "./DiscussionCard";
import ReportModal from "./ReportModal";
import type { Discussion, DiscussionChannel } from "@/lib/types";

interface ForumClientProps {
  discussions: Discussion[];
  userId?: string;
  channels?: DiscussionChannel[];
}

export default function ForumClient({
  discussions,
  userId,
  channels,
}: ForumClientProps) {
  const [reportOpen, setReportOpen] = useState(false);
  const [reportTarget, setReportTarget] = useState<{
    discussionId?: string;
    replyId?: string;
  }>({});
  const [showSuccess, setShowSuccess] = useState(false);

  const handleReport = (discussionId: string) => {
    setReportTarget({ discussionId });
    setReportOpen(true);
  };

  const handleReportSuccess = () => {
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 3000);
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

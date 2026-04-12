"use client";

import React, { useState } from "react";
import { Pin, Lock, Unlock, Trash2, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/components/core/language-provider";

interface DiscussionModToolsProps {
  discussionId: string;
  isPinned: boolean;
  isLocked: boolean;
}

export default function DiscussionModTools({
  discussionId,
  isPinned,
  isLocked,
}: DiscussionModToolsProps) {
  const { t } = useLanguage();
  const supabase = createClient();
  const router = useRouter();
  const [pinned, setPinned] = useState(isPinned);
  const [locked, setLocked] = useState(isLocked);
  const [loading, setLoading] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleTogglePin = async () => {
    setLoading("pin");
    try {
      const { error } = await supabase
        .from("discussions")
        .update({ is_pinned: !pinned })
        .eq("id", discussionId);
      if (!error) {
        setPinned(!pinned);
      }
    } catch (err) {
      console.error("Error toggling pin:", err);
    } finally {
      setLoading(null);
    }
  };

  const handleToggleLock = async () => {
    setLoading("lock");
    try {
      const { error } = await supabase
        .from("discussions")
        .update({ is_locked: !locked })
        .eq("id", discussionId);
      if (!error) {
        setLocked(!locked);
      }
    } catch (err) {
      console.error("Error toggling lock:", err);
    } finally {
      setLoading(null);
    }
  };

  const handleDelete = async () => {
    setLoading("delete");
    try {
      // Delete associated data first
      await supabase.from("discussion_votes").delete().eq("discussion_id", discussionId);
      await supabase.from("discussion_reports").delete().eq("discussion_id", discussionId);
      await supabase.from("discussion_tags").delete().eq("discussion_id", discussionId);

      // Delete replies and their votes
      const { data: replies } = await supabase
        .from("discussion_replies")
        .select("id")
        .eq("discussion_id", discussionId);
      if (replies && replies.length > 0) {
        const replyIds = replies.map((r: { id: string }) => r.id);
        await supabase.from("discussion_votes").delete().in("reply_id", replyIds);
        await supabase.from("discussion_reports").delete().in("reply_id", replyIds);
        await supabase.from("discussion_replies").delete().eq("discussion_id", discussionId);
      }

      // Delete the discussion itself
      const { error } = await supabase
        .from("discussions")
        .delete()
        .eq("id", discussionId);

      if (!error) {
        router.push("/social");
      }
    } catch (err) {
      console.error("Error deleting discussion:", err);
    } finally {
      setLoading(null);
      setShowDeleteConfirm(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      {/* Pin/Unpin */}
      <button
        onClick={handleTogglePin}
        disabled={loading !== null}
        className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
          pinned
            ? "bg-amber-900/30 text-amber-400 border border-amber-700/50 hover:bg-amber-900/50"
            : "bg-theme-muted/40 text-fg-muted hover:text-fg hover:bg-theme-muted/60"
        } disabled:opacity-50`}
        title={pinned ? "Unpin discussion" : "Pin discussion"}
      >
        {loading === "pin" ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
        ) : (
          <Pin className="w-3.5 h-3.5" />
        )}
        <span>{pinned ? "Unpin" : "Pin"}</span>
      </button>

      {/* Lock/Unlock */}
      <button
        onClick={handleToggleLock}
        disabled={loading !== null}
        className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
          locked
            ? "bg-danger-tint text-fg-danger border border-red-800/50 hover:bg-red-900/30"
            : "bg-theme-muted/40 text-fg-muted hover:text-fg hover:bg-theme-muted/60"
        } disabled:opacity-50`}
        title={locked ? "Unlock discussion" : "Lock discussion"}
      >
        {loading === "lock" ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
        ) : locked ? (
          <Unlock className="w-3.5 h-3.5" />
        ) : (
          <Lock className="w-3.5 h-3.5" />
        )}
        <span>{locked ? "Unlock" : "Lock"}</span>
      </button>

      {/* Delete */}
      {!showDeleteConfirm ? (
        <button
          onClick={() => setShowDeleteConfirm(true)}
          disabled={loading !== null}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-theme-muted/40 text-fg-muted hover:text-fg-danger hover:bg-danger-tint transition-colors disabled:opacity-50"
          title={t("forum.delete")}
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span>{t("forum.delete")}</span>
        </button>
      ) : (
        <div className="flex items-center gap-1">
          <button
            onClick={handleDelete}
            disabled={loading !== null}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-red-600 hover:bg-red-700 text-white transition-colors disabled:opacity-50"
          >
            {loading === "delete" ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Trash2 className="w-3.5 h-3.5" />
            )}
            <span>{t("common.confirm")}</span>
          </button>
          <button
            onClick={() => setShowDeleteConfirm(false)}
            className="px-2.5 py-1.5 rounded-lg text-xs font-medium text-fg-muted hover:text-fg transition-colors"
          >
            {t("common.cancel")}
          </button>
        </div>
      )}
    </div>
  );
}

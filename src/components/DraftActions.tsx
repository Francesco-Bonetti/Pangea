"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { Send, Trash2, Loader2, AlertTriangle } from "lucide-react";

interface DraftActionsProps {
  proposalId: string;
  authorId: string;
  userId: string;
  hasOptions: boolean;
}

export default function DraftActions({
  proposalId,
  authorId,
  userId,
  hasOptions,
}: DraftActionsProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();
  const router = useRouter();

  // Only the author can see draft actions
  if (authorId !== userId) return null;

  async function publishDraft() {
    if (!hasOptions) {
      setError("You need at least 2 deliberative options before publishing.");
      return;
    }

    setLoading(true);
    setError(null);

    const { error: updateError } = await supabase
      .from("proposals")
      .update({ status: "curation" })
      .eq("id", proposalId)
      .eq("author_id", userId);

    if (updateError) {
      setError(updateError.message);
      setLoading(false);
      return;
    }

    router.refresh();
  }

  async function deleteDraft() {
    if (!confirm("Are you sure you want to delete this draft? This action cannot be undone.")) return;

    setLoading(true);
    setError(null);

    // Delete options first
    await supabase
      .from("proposal_options")
      .delete()
      .eq("proposal_id", proposalId);

    const { error: deleteError } = await supabase
      .from("proposals")
      .delete()
      .eq("id", proposalId)
      .eq("author_id", userId);

    if (deleteError) {
      setError(deleteError.message);
      setLoading(false);
      return;
    }

    router.push("/dashboard");
  }

  return (
    <div className="card p-4 mb-6 bg-amber-900/10 border-amber-800/30">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2 text-amber-300 text-sm font-medium">
          <AlertTriangle className="w-4 h-4" />
          This is a draft — only you can see it
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={deleteDraft}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-red-400 bg-red-900/20 border border-red-800/30 hover:border-red-700/50 transition-colors disabled:opacity-50"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Delete
          </button>
          <button
            onClick={publishDraft}
            disabled={loading || !hasOptions}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-green-300 bg-green-900/20 border border-green-800/30 hover:border-green-700/50 transition-colors disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Send className="w-3.5 h-3.5" />
            )}
            Publish for Review
          </button>
        </div>
      </div>
      {error && (
        <p className="text-xs text-red-400 mt-2">{error}</p>
      )}
      {!hasOptions && (
        <p className="text-xs text-amber-400/70 mt-2">
          Add at least 2 deliberative options before publishing.
        </p>
      )}
    </div>
  );
}

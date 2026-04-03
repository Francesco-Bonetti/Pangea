"use client";

import { useState } from "react";
import { Clock, RotateCcw, ChevronDown, ChevronRight } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface HistoryEntry {
  id: string;
  law_id: string;
  version_number: number;
  title: string;
  content: string | null;
  simplified_content: string | null;
  summary: string | null;
  change_description: string;
  changed_by: string | null;
  changed_at: string;
}

interface Props {
  history: HistoryEntry[];
  lawId: string;
  isAdmin: boolean;
  currentTitle: string;
  currentContent: string | null;
}

export default function LawHistoryClient({
  history,
  lawId,
  isAdmin,
  currentTitle,
  currentContent,
}: Props) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [restoring, setRestoring] = useState(false);
  const [restoredVersion, setRestoredVersion] = useState<number | null>(null);

  const supabase = createClient();

  async function handleRestore(historyId: string, versionNumber: number) {
    if (!confirm(`Are you sure you want to restore version ${versionNumber}? The current version will be saved in the history.`)) {
      return;
    }

    setRestoring(true);
    try {
      const { error } = await supabase.rpc("restore_law_version", {
        p_law_id: lawId,
        p_history_id: historyId,
      });

      if (error) throw error;

      setRestoredVersion(versionNumber);
      // Reload page to show updated content
      setTimeout(() => window.location.reload(), 1500);
    } catch (err) {
      console.error("Restore failed:", err);
      alert("Failed to restore version. Only admins can perform this action.");
    } finally {
      setRestoring(false);
    }
  }

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium text-slate-400 mb-4">
        {history.length} previous {history.length === 1 ? "version" : "versions"}
      </h3>

      {restoredVersion !== null && (
        <div className="card border border-green-800/30 bg-green-900/10 p-4 mb-4">
          <p className="text-sm text-green-400">
            Successfully restored to version {restoredVersion}. Reloading...
          </p>
        </div>
      )}

      {history.map((entry) => {
        const isExpanded = expandedId === entry.id;
        const titleChanged = entry.title !== currentTitle;

        return (
          <div
            key={entry.id}
            className="card border border-slate-700/20 overflow-hidden"
          >
            {/* Header */}
            <div
              className="p-4 flex items-center gap-3 cursor-pointer hover:bg-slate-800/30 transition-colors"
              onClick={() => setExpandedId(isExpanded ? null : entry.id)}
            >
              <div className="shrink-0">
                {isExpanded ? (
                  <ChevronDown className="w-4 h-4 text-slate-400" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-blue-400 bg-blue-900/30 px-2 py-0.5 rounded">
                    v{entry.version_number}
                  </span>
                  <span className="text-sm text-slate-300 truncate">
                    {entry.change_description}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 mt-1">
                  <Clock className="w-3 h-3 text-slate-600" />
                  <span className="text-xs text-slate-600">
                    {new Date(entry.changed_at).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                  {titleChanged && (
                    <span className="text-xs text-amber-500 ml-2">
                      Title was: &quot;{entry.title}&quot;
                    </span>
                  )}
                </div>
              </div>

              {isAdmin && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRestore(entry.id, entry.version_number);
                  }}
                  disabled={restoring}
                  className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-blue-600/10 border border-blue-500/20 text-blue-400 hover:bg-blue-600/20 text-xs font-medium transition-colors disabled:opacity-50"
                >
                  <RotateCcw className="w-3 h-3" />
                  Restore
                </button>
              )}
            </div>

            {/* Expanded content */}
            {isExpanded && (
              <div className="border-t border-slate-700/20 p-4 bg-slate-900/30">
                {entry.content ? (
                  <div>
                    <p className="text-xs font-medium text-slate-500 mb-2">
                      Content at version {entry.version_number}:
                    </p>
                    <pre className="text-sm text-slate-400 whitespace-pre-wrap leading-relaxed bg-slate-900/50 p-3 rounded-md border border-slate-800/30 max-h-96 overflow-y-auto">
                      {entry.content}
                    </pre>
                  </div>
                ) : (
                  <p className="text-sm text-slate-500 italic">
                    No content was recorded for this version.
                  </p>
                )}

                {entry.simplified_content && (
                  <div className="mt-3">
                    <p className="text-xs font-medium text-amber-500 mb-2">
                      Simplified version at v{entry.version_number}:
                    </p>
                    <p className="text-sm text-amber-200/60 bg-amber-900/10 p-3 rounded-md border border-amber-800/20">
                      {entry.simplified_content}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

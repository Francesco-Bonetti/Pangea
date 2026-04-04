"use client";

import { useState, useEffect, useRef } from "react";
import { X, Search, User, Lock } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface NewConversationModalProps {
  userId: string;
  onClose: () => void;
  onSelect: (conversationId: string) => void;
}

interface SearchResult {
  id: string;
  full_name: string | null;
  user_code: string | null;
  bio: string | null;
}

export default function NewConversationModal({
  userId,
  onClose,
  onSelect,
}: NewConversationModalProps) {
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [starting, setStarting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Search citizens
  useEffect(() => {
    const query = search.trim();
    if (query.length < 2) {
      setResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      const { data } = await supabase
        .from("profiles")
        .select("id, full_name, user_code, bio")
        .neq("id", userId)
        .or(`full_name.ilike.%${query}%,user_code.ilike.%${query}%`)
        .limit(10);

      setResults(data || []);
      setLoading(false);
    }, 300);

    return () => clearTimeout(timer);
  }, [search, userId, supabase]);

  async function handleSelect(otherUserId: string) {
    setStarting(otherUserId);
    setError(null);

    try {
      // Check DM policy
      const { data: privacyData } = await supabase
        .from("privacy_settings")
        .select("dm_policy")
        .eq("user_id", otherUserId)
        .single();

      if (privacyData?.dm_policy === "nobody") {
        setError("This citizen has disabled direct messages.");
        setStarting(null);
        return;
      }

      // Get or create conversation
      const { data: convId, error: rpcError } = await supabase.rpc(
        "get_or_create_dm_conversation",
        { other_user_id: otherUserId }
      );

      if (rpcError) throw rpcError;
      if (!convId) throw new Error("Failed to create conversation.");

      onSelect(convId);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to start conversation."
      );
      setStarting(null);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-md bg-theme-base border border-theme rounded-xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-theme">
          <h2 className="text-lg font-bold text-fg">New Message</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-theme-card text-fg-muted hover:text-fg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search */}
        <div className="px-5 py-3 border-b border-theme">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-fg-muted" />
            <input
              ref={inputRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name or citizen code..."
              className="input-field pl-10 py-2.5 text-sm"
            />
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="px-5 py-2">
            <p className="text-sm text-fg-danger">{error}</p>
          </div>
        )}

        {/* Results */}
        <div className="max-h-80 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <span className="animate-spin w-5 h-5 border-2 border-blue-400 border-t-transparent rounded-full" />
            </div>
          ) : search.trim().length < 2 ? (
            <div className="text-center py-8 text-fg-muted text-sm">
              Type at least 2 characters to search
            </div>
          ) : results.length === 0 ? (
            <div className="text-center py-8 text-fg-muted text-sm">
              No citizens found
            </div>
          ) : (
            <div className="py-2">
              {results.map((citizen) => {
                const initials = citizen.full_name
                  ? citizen.full_name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")
                      .toUpperCase()
                      .slice(0, 2)
                  : "?";

                return (
                  <button
                    key={citizen.id}
                    onClick={() => handleSelect(citizen.id)}
                    disabled={starting === citizen.id}
                    className="w-full flex items-center gap-3 px-5 py-3 hover:bg-theme-card transition-colors text-left disabled:opacity-50"
                  >
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-slate-600 to-slate-700 border border-slate-500 flex items-center justify-center shrink-0">
                      <span className="text-xs font-bold text-fg">
                        {initials}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-fg truncate">
                        {citizen.full_name || "Anonymous Citizen"}
                      </p>
                      {citizen.user_code && (
                        <p className="text-xs text-fg-muted">
                          {citizen.user_code}
                        </p>
                      )}
                    </div>
                    {starting === citizen.id ? (
                      <span className="animate-spin w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full shrink-0" />
                    ) : (
                      <Lock className="w-4 h-4 text-fg-muted shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-theme bg-theme-card/30">
          <p className="text-xs text-fg-muted text-center">
            Messages are end-to-end encrypted
          </p>
        </div>
      </div>
    </div>
  );
}

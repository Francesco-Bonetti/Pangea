"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { MessageSquare, X, Search, Lock, ChevronRight, PenSquare } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useLanguage } from "@/components/core/language-provider";
import { useMessageBadge } from "@/components/core/MessageBadgeProvider";
import { useRouter } from "next/navigation";

interface QuickConversation {
  id: string;
  other_user_name: string | null;
  other_user_code: string | null;
  last_message_at: string;
  last_read_at: string;
  has_unread: boolean;
}

export default function FloatingMessageButton() {
  const { t } = useLanguage();
  const { unreadCount } = useMessageBadge();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [conversations, setConversations] = useState<QuickConversation[]>([]);
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const panelRef = useRef<HTMLDivElement>(null);

  // Check auth
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }: { data: { user: { id: string } | null } }) => {
      setUserId(data.user?.id || null);
    });
  }, []);

  // Close on click outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        if (open) setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [open]);

  // Close on Escape
  useEffect(() => {
    function handleEsc(e: KeyboardEvent) {
      if (e.key === "Escape" && open) setOpen(false);
    }
    document.addEventListener("keydown", handleEsc);
    return () => document.removeEventListener("keydown", handleEsc);
  }, [open]);

  // Fetch recent conversations when panel opens
  const fetchConversations = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const supabase = createClient();
      const { data } = await supabase
        .from("dm_participants")
        .select(`
          conversation_id,
          last_read_at,
          dm_conversations!inner(
            id,
            last_message_at
          )
        `)
        .eq("user_id", userId)
        .order("last_read_at", { ascending: false })
        .limit(10);

      if (!data) return;

      // Get the other participant names
      const convIds = data.map((d) => d.conversation_id);
      const { data: otherParticipants } = await supabase
        .from("dm_participants")
        .select("conversation_id, user_id, profiles:user_id(full_name)")
        .in("conversation_id", convIds)
        .neq("user_id", userId);

      const otherMap = new Map<string, { name: string | null; code: string | null }>();
      if (otherParticipants) {
        for (const p of otherParticipants) {
          const profile = p.profiles as unknown as { full_name: string } | null;
          otherMap.set(p.conversation_id, {
            name: profile?.full_name || null,
            code: null,
          });
        }
      }

      const convs: QuickConversation[] = data.map((row) => {
        const conv = row.dm_conversations as unknown as { id: string; last_message_at: string };
        const other = otherMap.get(row.conversation_id);
        return {
          id: conv.id,
          other_user_name: other?.name || "Unknown",
          other_user_code: other?.code || null,
          last_message_at: conv.last_message_at,
          last_read_at: row.last_read_at,
          has_unread: new Date(conv.last_message_at) > new Date(row.last_read_at),
        };
      });

      // Sort: unread first, then by last message time
      convs.sort((a, b) => {
        if (a.has_unread !== b.has_unread) return a.has_unread ? -1 : 1;
        return new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime();
      });

      setConversations(convs);
    } catch {
      // Non-critical
    } finally {
      setLoading(false);
    }
  }, [userId]);

  function handleOpen() {
    setOpen(true);
    fetchConversations();
  }

  function handleGoToConversation(convId: string) {
    setOpen(false);
    router.push(`/messages?c=${convId}`);
  }

  function handleOpenMessages() {
    setOpen(false);
    router.push("/messages");
  }

  // Don't render if not logged in
  if (!userId) return null;

  const filteredConvs = conversations.filter((c) =>
    !search || (c.other_user_name || "").toLowerCase().includes(search.toLowerCase())
  );

  function formatTime(dateStr: string) {
    const d = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    if (diff < 60000) return t("floatingMessages.justNow");
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h`;
    return `${Math.floor(diff / 86400000)}d`;
  }

  return (
    <div className={`fixed bottom-[8.5rem] right-6 ${open ? "z-[60]" : "z-50"}`} ref={panelRef}>
      {/* Quick-access panel */}
      {open && (
        <div
          className="absolute bottom-16 right-0 w-80 sm:w-96 rounded-xl shadow-2xl border overflow-hidden"
          style={{
            backgroundColor: "var(--card)",
            borderColor: "var(--border)",
          }}
        >
          {/* Header */}
          <div
            className="flex items-center justify-between px-4 py-3 border-b"
            style={{
              borderColor: "var(--border)",
              background: "linear-gradient(135deg, rgba(59,130,246,0.1), rgba(16,185,129,0.1))",
            }}
          >
            <div className="flex items-center gap-2">
              <Lock className="w-3.5 h-3.5" style={{ color: "var(--success)" }} />
              <h3 className="text-sm font-semibold" style={{ color: "var(--foreground)" }}>
                {t("floatingMessages.title")}
              </h3>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={handleOpenMessages}
                className="p-1.5 rounded-lg transition-colors hover:bg-[var(--border)]"
                style={{ color: "var(--muted-foreground)" }}
                title={t("floatingMessages.openFull")}
              >
                <PenSquare className="w-4 h-4" />
              </button>
              <button
                onClick={() => setOpen(false)}
                className="p-1.5 rounded-lg transition-colors hover:bg-[var(--border)]"
                style={{ color: "var(--muted-foreground)" }}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Search */}
          <div className="px-3 py-2 border-b" style={{ borderColor: "var(--border)" }}>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg" style={{ backgroundColor: "var(--muted)" }}>
              <Search className="w-3.5 h-3.5 shrink-0" style={{ color: "var(--muted-foreground)" }} />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t("floatingMessages.search")}
                className="flex-1 bg-transparent text-sm outline-none"
                style={{ color: "var(--foreground)" }}
              />
            </div>
          </div>

          {/* Conversation list */}
          <div className="max-h-[320px] overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : filteredConvs.length === 0 ? (
              <div className="py-8 text-center">
                <MessageSquare className="w-8 h-8 mx-auto mb-2" style={{ color: "var(--muted-foreground)" }} />
                <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>
                  {search ? t("floatingMessages.noResults") : t("floatingMessages.noConversations")}
                </p>
              </div>
            ) : (
              filteredConvs.map((conv) => (
                <button
                  key={conv.id}
                  onClick={() => handleGoToConversation(conv.id)}
                  className="w-full flex items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-[var(--muted)]"
                  style={{ borderBottom: "1px solid var(--border)" }}
                >
                  {/* Avatar */}
                  <div className="relative w-10 h-10 rounded-full bg-gradient-to-br from-blue-600 to-blue-800 border border-blue-500/30 flex items-center justify-center shrink-0">
                    <span className="text-xs font-bold text-white">
                      {(conv.other_user_name || "U").charAt(0).toUpperCase()}
                    </span>
                    {conv.has_unread && (
                      <span className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-blue-500 rounded-full border-2" style={{ borderColor: "var(--card)" }} />
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p
                      className={`text-sm truncate ${conv.has_unread ? "font-bold" : "font-medium"}`}
                      style={{ color: "var(--foreground)" }}
                    >
                      {conv.other_user_name || "Unknown"}
                    </p>
                    <p className="text-xs truncate" style={{ color: "var(--muted-foreground)" }}>
                      <Lock className="w-3 h-3 inline mr-0.5" />
                      {t("floatingMessages.encrypted")}
                    </p>
                  </div>

                  {/* Time + arrow */}
                  <div className="flex items-center gap-1 shrink-0">
                    <span className="text-[10px]" style={{ color: "var(--muted-foreground)" }}>
                      {formatTime(conv.last_message_at)}
                    </span>
                    <ChevronRight className="w-3.5 h-3.5" style={{ color: "var(--muted-foreground)" }} />
                  </div>
                </button>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="px-3 py-2 border-t" style={{ borderColor: "var(--border)" }}>
            <button
              onClick={handleOpenMessages}
              className="w-full text-center text-xs font-medium py-1.5 rounded-lg transition-colors hover:bg-[var(--muted)]"
              style={{ color: "var(--primary)" }}
            >
              {t("floatingMessages.viewAll")}
            </button>
          </div>
        </div>
      )}

      {/* Floating Button */}
      <button
        onClick={() => (open ? setOpen(false) : handleOpen())}
        className="w-12 h-12 rounded-full shadow-lg flex items-center justify-center transition-all duration-200 hover:scale-110 active:scale-95 relative bg-gradient-to-r from-blue-600 to-emerald-600 hover:from-blue-500 hover:to-emerald-500"
        style={{ color: "#fff" }}
        title={t("floatingMessages.tooltip")}
        aria-label={t("floatingMessages.tooltip")}
      >
        {open ? (
          <X className="w-5 h-5" />
        ) : (
          <>
            <MessageSquare className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[20px] h-5 px-1 bg-red-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-white shadow-sm">
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
          </>
        )}
      </button>
    </div>
  );
}

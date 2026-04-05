"use client";

import { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from "react";
import { createClient } from "@/lib/supabase/client";

interface MessageBadgeContextType {
  unreadCount: number;
  refresh: () => void;
}

const MessageBadgeContext = createContext<MessageBadgeContextType>({
  unreadCount: 0,
  refresh: () => {},
});

export function useMessageBadge() {
  return useContext(MessageBadgeContext);
}

interface Props {
  children: ReactNode;
}

export default function MessageBadgeProvider({ children }: Props) {
  const [unreadCount, setUnreadCount] = useState(0);
  const [userId, setUserId] = useState<string | null>(null);
  const supabaseRef = useRef(createClient());

  // Get user on mount
  useEffect(() => {
    supabaseRef.current.auth.getUser().then(({ data }: { data: { user: { id: string } | null } }) => {
      setUserId(data.user?.id || null);
    });
  }, []);

  const fetchUnread = useCallback(async () => {
    if (!userId) {
      setUnreadCount(0);
      return;
    }

    try {
      const { data, error } = await supabaseRef.current
        .from("dm_participants")
        .select("conversation_id, last_read_at, dm_conversations!inner(last_message_at)")
        .eq("user_id", userId);

      if (error || !data) return;

      let count = 0;
      for (const row of data) {
        const conv = row.dm_conversations as unknown as { last_message_at: string } | null;
        if (conv?.last_message_at && new Date(conv.last_message_at) > new Date(row.last_read_at)) {
          count++;
        }
      }
      setUnreadCount(count);
    } catch {
      // Silently fail — badge is non-critical
    }
  }, [userId]);

  // Fetch when userId is ready
  useEffect(() => {
    if (userId) fetchUnread();
  }, [userId, fetchUnread]);

  // Real-time subscription for new messages
  useEffect(() => {
    if (!userId) return;

    const channel = supabaseRef.current
      .channel(`msg-badge-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "dm_messages",
        },
        (payload: { new: Record<string, unknown> }) => {
          if (payload.new && (payload.new as { sender_id: string }).sender_id !== userId) {
            setUnreadCount((prev) => prev + 1);
          }
        }
      )
      .subscribe();

    return () => {
      supabaseRef.current.removeChannel(channel);
    };
  }, [userId]);

  const refresh = useCallback(() => {
    fetchUnread();
  }, [fetchUnread]);

  return (
    <MessageBadgeContext.Provider value={{ unreadCount, refresh }}>
      {children}
    </MessageBadgeContext.Provider>
  );
}

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
      // Use server-side RPC for accurate count (avoids PostgREST join issues)
      const { data, error } = await supabaseRef.current
        .rpc("get_unread_message_count", { p_user_id: userId });

      if (error) return;
      setUnreadCount(data ?? 0);
    } catch {
      // Silently fail — badge is non-critical
    }
  }, [userId]);

  // Fetch when userId is ready
  useEffect(() => {
    if (userId) fetchUnread();
  }, [userId, fetchUnread]);

  // Real-time: re-fetch actual count on new messages (instead of blindly incrementing)
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
          // Only re-fetch if message is from someone else
          if (payload.new && (payload.new as { sender_id: string }).sender_id !== userId) {
            fetchUnread();
          }
        }
      )
      .subscribe();

    return () => {
      supabaseRef.current.removeChannel(channel);
    };
  }, [userId, fetchUnread]);

  const refresh = useCallback(() => {
    fetchUnread();
  }, [fetchUnread]);

  return (
    <MessageBadgeContext.Provider value={{ unreadCount, refresh }}>
      {children}
    </MessageBadgeContext.Provider>
  );
}

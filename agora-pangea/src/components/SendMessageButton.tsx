"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MessageSquare, Lock } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface SendMessageButtonProps {
  currentUserId: string;
  targetUserId: string;
  dmPolicy: string;
}

export default function SendMessageButton({
  currentUserId,
  targetUserId,
  dmPolicy,
}: SendMessageButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const supabase = createClient();

  if (dmPolicy === "nobody") {
    return (
      <div className="flex items-center gap-2 text-xs text-fg-muted">
        <Lock className="w-3.5 h-3.5" />
        <span>This citizen has disabled direct messages.</span>
      </div>
    );
  }

  async function handleClick() {
    setLoading(true);
    try {
      const { data: convId, error } = await supabase.rpc(
        "get_or_create_dm_conversation",
        { other_user_id: targetUserId }
      );

      if (error) throw error;
      if (convId) {
        router.push(`/messages/${convId}`);
      }
    } catch {
      // fallback: go to messages
      router.push("/messages");
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className="inline-flex items-center gap-2 px-4 py-2 bg-theme-muted hover:bg-theme-muted text-fg text-sm font-medium rounded-lg transition-all duration-150 hover:scale-105 active:scale-95 disabled:opacity-50"
    >
      {loading ? (
        <span className="animate-spin w-4 h-4 border-2 border-slate-300 border-t-transparent rounded-full" />
      ) : (
        <MessageSquare className="w-4 h-4" />
      )}
      Send Message
    </button>
  );
}

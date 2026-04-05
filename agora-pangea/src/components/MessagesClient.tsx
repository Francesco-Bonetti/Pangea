"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  MessageSquare,
  Search,
  Lock,
  Clock,
  ChevronRight,
  PenSquare,
  ShieldCheck,
} from "lucide-react";
import KeySetup from "@/components/KeySetup";
import NewConversationModal from "@/components/NewConversationModal";
import { getLocalSecretKey, decryptMessage } from "@/lib/crypto";
import type { UserKeys } from "@/lib/types";

interface ConversationRow {
  id: string;
  last_message_at: string;
  other_user_id: string;
  other_user_name: string | null;
  other_user_code: string | null;
  other_user_public_key: string | null;
  last_read_at: string;
  is_muted: boolean;
  last_message: {
    id: string;
    sender_id: string;
    encrypted_content: string;
    nonce: string;
    created_at: string;
    message_type: string;
    deleted_at: string | null;
  } | null;
  unread_count: number;
}

interface MessagesClientProps {
  userId: string;
  userKeys: UserKeys | null;
  conversations: ConversationRow[];
}

export default function MessagesClient({
  userId,
  userKeys,
  conversations,
}: MessagesClientProps) {
  const router = useRouter();
  const [keysReady, setKeysReady] = useState(false);
  const [secretKey, setSecretKey] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [showNewConv, setShowNewConv] = useState(false);
  const [decryptedPreviews, setDecryptedPreviews] = useState<
    Record<string, string>
  >({});

  // Check if we already have the secret key in IndexedDB
  useEffect(() => {
    async function checkKey() {
      try {
        const sk = await getLocalSecretKey(userId);
        if (sk) {
          setSecretKey(sk);
          setKeysReady(true);
        }
      } catch {
        // IndexedDB not available or empty
      }
    }
    checkKey();
  }, [userId]);

  // Decrypt last message previews once we have the secret key
  useEffect(() => {
    if (!secretKey || conversations.length === 0) return;

    const previews: Record<string, string> = {};
    for (const conv of conversations) {
      if (conv.last_message && conv.other_user_public_key) {
        try {
          const senderPk =
            conv.last_message.sender_id === userId
              ? userKeys?.public_key || ""
              : conv.other_user_public_key;

          if (senderPk) {
            const decrypted = decryptMessage(
              conv.last_message.encrypted_content,
              conv.last_message.nonce,
              senderPk,
              secretKey
            );
            if (decrypted) {
              previews[conv.id] =
                decrypted.length > 60
                  ? decrypted.slice(0, 60) + "..."
                  : decrypted;
            } else {
              previews[conv.id] = "Unable to decrypt";
            }
          }
        } catch {
          previews[conv.id] = "Encrypted message";
        }
      }
    }
    setDecryptedPreviews(previews);
  }, [secretKey, conversations, userId, userKeys]);

  // If no keys at all, or keys exist but not unlocked yet
  if (!userKeys && !keysReady) {
    return (
      <KeySetup
        userId={userId}
        hasExistingKeys={false}
        onComplete={() => {
          setKeysReady(true);
          router.refresh();
        }}
      />
    );
  }

  if (userKeys && !keysReady) {
    return (
      <KeySetup
        userId={userId}
        hasExistingKeys={true}
        encryptedPrivateKey={userKeys.encrypted_private_key}
        keySalt={userKeys.key_salt}
        onComplete={() => {
          setKeysReady(true);
          router.refresh();
        }}
      />
    );
  }

  const filteredConversations = conversations.filter((conv) => {
    if (!search.trim()) return true;
    const name = conv.other_user_name || conv.other_user_code || "";
    return name.toLowerCase().includes(search.toLowerCase());
  });

  function formatTime(dateStr: string) {
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);

    if (diffHours < 24) {
      return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    }
    if (diffHours < 168) {
      return d.toLocaleDateString([], { weekday: "short" });
    }
    return d.toLocaleDateString([], { month: "short", day: "numeric" });
  }

  function isUnread(conv: ConversationRow) {
    if (!conv.last_message) return false;
    if (conv.last_message.sender_id === userId) return false;
    return new Date(conv.last_message.created_at) > new Date(conv.last_read_at);
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 overflow-hidden">
        <div className="flex items-center gap-3 min-w-0">
          <MessageSquare className="w-6 h-6 text-blue-400 shrink-0" />
          <h1 className="text-2xl font-bold text-fg truncate">Messages</h1>
        </div>
        <button
          onClick={() => setShowNewConv(true)}
          className="btn-primary flex items-center gap-2 text-sm px-4 py-2 shrink-0"
        >
          <PenSquare className="w-4 h-4 shrink-0" />
          New Message
        </button>
      </div>

      {/* E2E badge */}
      <div className="flex items-center gap-2 mb-6 text-xs text-fg-muted overflow-hidden flex-wrap">
        <ShieldCheck className="w-4 h-4 text-fg-success shrink-0" />
        <span>End-to-end encrypted. Only you and the recipient can read these messages.</span>
      </div>

      {/* Search */}
      {conversations.length > 0 && (
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-fg-muted" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search conversations..."
            className="input-field pl-10 py-2.5 text-sm"
          />
        </div>
      )}

      {/* Conversations list */}
      {filteredConversations.length === 0 ? (
        <div className="empty-state">
          <MessageSquare className="empty-state-icon" />
          <h3 className="empty-state-title">
            {conversations.length === 0
              ? "No messages yet"
              : "No matching conversations"}
          </h3>
          <p className="empty-state-text">
            {conversations.length === 0
              ? "Start a conversation by clicking \"New Message\" or visiting a citizen's profile."
              : "Try a different search term."}
          </p>
        </div>
      ) : (
        <div className="space-y-1">
          {filteredConversations.map((conv) => {
            const unread = isUnread(conv);
            const displayName =
              conv.other_user_name || conv.other_user_code || "Unknown Citizen";
            const initials = conv.other_user_name
              ? conv.other_user_name
                  .split(" ")
                  .map((n) => n[0])
                  .join("")
                  .toUpperCase()
                  .slice(0, 2)
              : "?";

            return (
              <Link
                key={conv.id}
                href={`/messages/${conv.id}`}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-150 hover:bg-theme-card group overflow-hidden ${
                  unread ? "bg-theme-card/40" : ""
                }`}
              >
                {/* Avatar */}
                <div
                  className={`w-11 h-11 rounded-full flex items-center justify-center shrink-0 ${
                    unread
                      ? "bg-gradient-to-br from-blue-500 to-blue-700 border-2 border-blue-400"
                      : "bg-gradient-to-br from-slate-600 to-slate-700 border border-slate-500"
                  }`}
                >
                  <span className="text-sm font-bold text-fg">
                    {initials}
                  </span>
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 overflow-hidden">
                    <span
                      className={`text-sm truncate ${
                        unread
                          ? "font-bold text-fg"
                          : "font-medium text-fg"
                      }`}
                    >
                      {displayName}
                    </span>
                    <span className="text-xs text-fg-muted shrink-0">
                      {conv.last_message
                        ? formatTime(conv.last_message.created_at)
                        : ""}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 mt-0.5 min-w-0">
                    <Lock className="w-3 h-3 text-fg-muted shrink-0" />
                    <p
                      className={`text-xs truncate ${
                        unread ? "text-fg font-medium" : "text-fg-muted"
                      }`}
                    >
                      {conv.last_message
                        ? conv.last_message.sender_id === userId
                          ? `You: ${decryptedPreviews[conv.id] || "Encrypted message"}`
                          : decryptedPreviews[conv.id] || "Encrypted message"
                        : "No messages yet"}
                    </p>
                  </div>
                </div>

                {/* Unread dot + chevron */}
                <div className="flex items-center gap-2 shrink-0">
                  {unread && (
                    <div className="w-2.5 h-2.5 rounded-full bg-blue-500 shrink-0" />
                  )}
                  <ChevronRight className="w-4 h-4 text-fg-muted group-hover:text-fg transition-colors shrink-0" />
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {/* New conversation modal */}
      {showNewConv && (
        <NewConversationModal
          userId={userId}
          onClose={() => setShowNewConv(false)}
          onSelect={(conversationId) => {
            router.push(`/messages/${conversationId}`);
          }}
        />
      )}
    </div>
  );
}

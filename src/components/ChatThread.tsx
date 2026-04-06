"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Send,
  Lock,
  ShieldCheck,
  User,
  CheckCheck,
  AlertTriangle,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import KeySetup from "@/components/KeySetup";
import { useLanguage } from "@/components/language-provider";
import {
  getLocalSecretKey,
  encryptMessage,
  decryptMessage,
} from "@/lib/crypto";
import type { DmMessage } from "@/lib/types";

interface ChatThreadProps {
  conversationId: string;
  userId: string;
  myPublicKey: string | null;
  myEncryptedPrivateKey: string | null;
  myKeySalt: string | null;
  otherUserId: string;
  otherUserName: string | null;
  otherUserCode: string | null;
  otherUserPublicKey: string | null;
  initialMessages: DmMessage[];
}

export default function ChatThread({
  conversationId,
  userId,
  myPublicKey,
  myEncryptedPrivateKey,
  myKeySalt,
  otherUserId,
  otherUserName,
  otherUserCode,
  otherUserPublicKey,
  initialMessages,
}: ChatThreadProps) {
  const router = useRouter();
  const supabase = createClient();
  const { t, translations } = useLanguage();
  const [keysReady, setKeysReady] = useState(false);
  const [secretKey, setSecretKey] = useState<string | null>(null);
  const [messages, setMessages] = useState<DmMessage[]>(initialMessages);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const displayName = otherUserName || otherUserCode || "Unknown Citizen";
  const initials = otherUserName
    ? otherUserName
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "?";

  // Check for local secret key
  useEffect(() => {
    async function checkKey() {
      try {
        const sk = await getLocalSecretKey(userId);
        if (sk) {
          setSecretKey(sk);
          setKeysReady(true);
        }
      } catch {
        // not available
      }
    }
    checkKey();
  }, [userId]);

  // Decrypt messages helper
  const decryptMessages = useCallback(
    (msgs: DmMessage[]): DmMessage[] => {
      if (!secretKey || !otherUserPublicKey) return msgs;

      return msgs.map((msg) => {
        if (msg.decrypted_content) return msg;
        try {
          // NaCl box: shared secret = (mySecretKey, otherPublicKey)
          // This is the same regardless of who sent the message
          const decrypted = decryptMessage(
            msg.encrypted_content,
            msg.nonce,
            otherUserPublicKey,
            secretKey
          );
          return { ...msg, decrypted_content: decrypted || "[Unable to decrypt]" };
        } catch {
          return { ...msg, decrypted_content: "[Encrypted message]" };
        }
      });
    },
    [secretKey, otherUserPublicKey]
  );

  // Decrypt initial messages once keys are ready
  useEffect(() => {
    if (keysReady && secretKey) {
      setMessages((prev) => decryptMessages(prev));
    }
  }, [keysReady, secretKey, decryptMessages]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Mark messages as read
  useEffect(() => {
    if (!keysReady) return;
    supabase
      .from("dm_participants")
      .update({ last_read_at: new Date().toISOString() })
      .eq("conversation_id", conversationId)
      .eq("user_id", userId)
      .then(() => {});
  }, [conversationId, userId, keysReady, supabase]);

  // Real-time subscription for new messages
  useEffect(() => {
    if (!keysReady) return;

    const channel = supabase
      .channel(`dm:${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "dm_messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (payload: any) => {
          const newMsg = payload.new as DmMessage;
          // Don't add if we already have it (sent by us)
          setMessages((prev) => {
            if (prev.some((m) => m.id === newMsg.id)) return prev;
            const decrypted = decryptMessages([newMsg]);
            // Mark as read if it's from the other user
            if (newMsg.sender_id !== userId) {
              supabase
                .from("dm_participants")
                .update({ last_read_at: new Date().toISOString() })
                .eq("conversation_id", conversationId)
                .eq("user_id", userId)
                .then(() => {});
            }
            return [...prev, ...decrypted];
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, keysReady, userId, supabase, decryptMessages]);

  async function handleSend() {
    const text = newMessage.trim();
    if (!text || !secretKey || !otherUserPublicKey || sending) return;

    setSending(true);
    setError(null);

    try {
      // Encrypt message
      const { encrypted, nonce } = encryptMessage(
        text,
        otherUserPublicKey,
        secretKey
      );

      // Send to DB
      const { data: sentMsg, error: sendError } = await supabase
        .from("dm_messages")
        .insert({
          conversation_id: conversationId,
          sender_id: userId,
          encrypted_content: encrypted,
          nonce: nonce,
          message_type: "text",
        })
        .select()
        .single();

      if (sendError) throw sendError;

      // Add to local state immediately with decrypted content
      if (sentMsg) {
        setMessages((prev) => [
          ...prev,
          { ...sentMsg, decrypted_content: text },
        ]);
      }

      setNewMessage("");
      inputRef.current?.focus();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : t("messages.sendError")
      );
    } finally {
      setSending(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  function formatTime(dateStr: string) {
    return new Date(dateStr).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function formatDateSeparator(dateStr: string) {
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    return d.toLocaleDateString([], {
      weekday: "long",
      month: "long",
      day: "numeric",
    });
  }

  // Group messages by date
  function getDateKey(dateStr: string) {
    return new Date(dateStr).toDateString();
  }

  // Show key setup if needed
  if (!myPublicKey && !keysReady) {
    return (
      <div className="flex-1">
        <KeySetup
          userId={userId}
          hasExistingKeys={false}
          onComplete={() => {
            setKeysReady(true);
            router.refresh();
          }}
        />
      </div>
    );
  }

  if (myPublicKey && !keysReady) {
    return (
      <div className="flex-1">
        <KeySetup
          userId={userId}
          hasExistingKeys={true}
          encryptedPrivateKey={myEncryptedPrivateKey || ""}
          keySalt={myKeySalt || ""}
          onComplete={async () => {
            const sk = await getLocalSecretKey(userId);
            if (sk) {
              setSecretKey(sk);
              setKeysReady(true);
            }
          }}
        />
      </div>
    );
  }

  // Check if other user has keys
  const otherHasKeys = !!otherUserPublicKey;

  let prevDateKey = "";

  return (
    <div className="flex-1 flex flex-col max-w-3xl mx-auto w-full">
      {/* Chat header */}
      <div className="sticky top-16 z-40 bg-theme-base/95 backdrop-blur-md border-b border-theme px-4 py-3">
        <div className="flex items-center gap-3">
          <Link
            href="/messages"
            className="p-2 -ml-2 rounded-lg hover:bg-theme-card text-fg-muted hover:text-fg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>

          <Link
            href={`/citizens/${otherUserId}`}
            className="flex items-center gap-3 hover:opacity-80 transition-opacity"
          >
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-600 to-blue-800 border border-blue-500 flex items-center justify-center">
              <span className="text-xs font-bold text-fg">{initials}</span>
            </div>
            <div>
              <p className="text-sm font-semibold text-fg">{displayName}</p>
              <div className="flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 text-fg-success" />
                <span className="text-xs text-fg-muted">
                  End-to-end encrypted
                </span>
              </div>
            </div>
          </Link>
        </div>
      </div>

      {/* Messages area */}
      <div
        ref={containerRef}
        className="flex-1 overflow-y-auto px-4 py-4 space-y-1"
        style={{ minHeight: 0 }}
      >
        {/* E2E notice at top */}
        <div className="flex justify-center mb-6">
          <div className="flex items-center gap-2 bg-theme-card/60 border border-theme rounded-full px-4 py-2">
            <Lock className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-xs text-fg-muted">
              Messages are end-to-end encrypted. Only you and {displayName} can
              read them.
            </span>
          </div>
        </div>

        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 rounded-full bg-theme-card flex items-center justify-center mb-4">
              <User className="w-8 h-8 text-fg-muted" />
            </div>
            <p className="text-fg font-medium mb-1">
              Start a conversation with {displayName}
            </p>
            <p className="text-sm text-fg-muted">
              Your messages will be encrypted end-to-end.
            </p>
          </div>
        ) : (
          messages.map((msg, i) => {
            const isMine = msg.sender_id === userId;
            const currentDateKey = getDateKey(msg.created_at);
            const showDateSep = currentDateKey !== prevDateKey;
            prevDateKey = currentDateKey;

            return (
              <div key={msg.id}>
                {showDateSep && (
                  <div className="flex justify-center my-4">
                    <span className="text-xs text-fg-muted bg-theme-card/80 px-3 py-1 rounded-full">
                      {formatDateSeparator(msg.created_at)}
                    </span>
                  </div>
                )}
                <div
                  className={`flex ${isMine ? "justify-end" : "justify-start"} mb-1`}
                >
                  <div
                    className={`max-w-[75%] px-3.5 py-2 rounded-2xl ${
                      isMine
                        ? "bg-blue-600 text-fg rounded-br-md"
                        : "bg-theme-card text-fg border border-theme rounded-bl-md"
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap break-words">
                      {msg.decrypted_content || (
                        <span className="italic text-fg-muted flex items-center gap-1">
                          <Lock className="w-3 h-3" />
                          Encrypted message
                        </span>
                      )}
                    </p>
                    <div
                      className={`flex items-center gap-1 mt-1 ${
                        isMine ? "justify-end" : "justify-start"
                      }`}
                    >
                      <span
                        className={`text-[10px] ${
                          isMine ? "text-blue-200/70" : "text-fg-muted"
                        }`}
                      >
                        {formatTime(msg.created_at)}
                      </span>
                      {isMine && (
                        <CheckCheck
                          className="w-3 h-3 text-blue-200/70"
                        />
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Error */}
      {error && (
        <div className="px-4 py-2 bg-danger-tint border-t border-theme">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-fg-danger shrink-0" />
            <p className="text-sm text-fg-danger">{error}</p>
          </div>
        </div>
      )}

      {/* Other user hasn't set up encryption */}
      {!otherHasKeys && (
        <div className="px-4 py-3 bg-warning-tint border-t border-theme">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
            <p className="text-sm text-amber-300">
              {displayName} hasn&apos;t set up encryption yet. You can send messages
              once they enable encrypted messaging.
            </p>
          </div>
        </div>
      )}

      {/* Message input */}
      <div className="border-t border-theme bg-theme-card/95 backdrop-blur-md px-4 py-3">
        <div className="flex items-end gap-2">
          <textarea
            ref={inputRef}
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              otherHasKeys
                ? "Type a message..."
                : "Waiting for recipient to set up encryption..."
            }
            disabled={!otherHasKeys || sending}
            rows={1}
            className="flex-1 bg-theme-muted border border-slate-500 rounded-xl px-4 py-2.5 text-sm text-fg placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/40 resize-none disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ maxHeight: "120px" }}
            onInput={(e) => {
              const target = e.target as HTMLTextAreaElement;
              target.style.height = "auto";
              target.style.height = Math.min(target.scrollHeight, 120) + "px";
            }}
          />
          <button
            onClick={handleSend}
            disabled={!newMessage.trim() || !otherHasKeys || sending}
            className="p-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-fg transition-all duration-150 disabled:opacity-30 disabled:cursor-not-allowed hover:scale-105 active:scale-95 shrink-0"
          >
            {sending ? (
              <span className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full block" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  MessageSquare,
  Search,
  Lock,
  ChevronRight,
  PenSquare,
  ShieldCheck,
  Send,
  User,
  CheckCheck,
  AlertTriangle,
  ArrowLeft,
  X,
  Maximize2,
  Minimize2,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import KeySetup from "@/components/ui/KeySetup";
import NewConversationModal from "@/components/social/NewConversationModal";
import { renderMentions } from "@/components/social/MentionInput";
import { getLocalSecretKey, encryptMessage, decryptMessage } from "@/lib/crypto";
import { useLanguage } from "@/components/core/language-provider";
import type { UserKeys, DmMessage } from "@/lib/types";

/* ── Types ── */
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

interface MessagingAppProps {
  userId: string;
  userKeys: UserKeys | null;
  conversations: ConversationRow[];
  initialConversationId?: string;
  // Pre-loaded chat data for initial conversation
  initialChatData?: {
    otherUserId: string;
    otherUserName: string | null;
    otherUserCode: string | null;
    otherUserPublicKey: string | null;
    messages: DmMessage[];
  } | null;
}

/* ── Helpers ── */
function getInitials(name: string | null): string {
  if (!name) return "?";
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function formatTime(dateStr: string): string {
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

function formatMsgTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDateSeparator(dateStr: string): string {
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

function getDateKey(dateStr: string): string {
  return new Date(dateStr).toDateString();
}

/* ══════════════════════════════════════════════════════════════════════ */
/*  MessagingApp — Split-pane standalone messaging                     */
/* ══════════════════════════════════════════════════════════════════════ */
export default function MessagingApp({
  userId,
  userKeys,
  conversations: initialConversations,
  initialConversationId,
  initialChatData,
}: MessagingAppProps) {
  const router = useRouter();
  const { t } = useLanguage();
  const supabase = createClient();

  // ─ Key management ─
  const [keysReady, setKeysReady] = useState(false);
  const [secretKey, setSecretKey] = useState<string | null>(null);

  // ─ Conversation list ─
  const [conversations, setConversations] = useState(initialConversations);
  const [search, setSearch] = useState("");
  const [showNewConv, setShowNewConv] = useState(false);

  // ─ Active chat ─
  const [activeConvId, setActiveConvId] = useState<string | null>(
    initialConversationId || null
  );
  const [chatData, setChatData] = useState<{
    otherUserId: string;
    otherUserName: string | null;
    otherUserCode: string | null;
    otherUserPublicKey: string | null;
  } | null>(initialChatData ? {
    otherUserId: initialChatData.otherUserId,
    otherUserName: initialChatData.otherUserName,
    otherUserCode: initialChatData.otherUserCode,
    otherUserPublicKey: initialChatData.otherUserPublicKey,
  } : null);
  const [messages, setMessages] = useState<DmMessage[]>(
    initialChatData?.messages || []
  );
  const [chatLoading, setChatLoading] = useState(false);
  const [decryptedPreviews, setDecryptedPreviews] = useState<Record<string, string>>({});

  // ─ Message input ─
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [msgError, setMsgError] = useState<string | null>(null);

  // ─ Mobile responsive ─
  const [showSidebar, setShowSidebar] = useState(!initialConversationId);

  // ─ Refs ─
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  /* ── Check encryption keys ── */
  useEffect(() => {
    async function checkKey() {
      try {
        const sk = await getLocalSecretKey(userId);
        if (sk) {
          setSecretKey(sk);
          setKeysReady(true);
        }
      } catch {
        // IndexedDB not available
      }
    }
    checkKey();
  }, [userId]);

  /* ── Decrypt conversation previews ── */
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
                decrypted.length > 50 ? decrypted.slice(0, 50) + "..." : decrypted;
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

  /* ── Decrypt chat messages ── */
  const decryptMessages = useCallback(
    (msgs: DmMessage[]): DmMessage[] => {
      if (!secretKey || !chatData?.otherUserPublicKey) return msgs;
      return msgs.map((msg) => {
        if (msg.decrypted_content) return msg;
        try {
          const decrypted = decryptMessage(
            msg.encrypted_content,
            msg.nonce,
            chatData.otherUserPublicKey!,
            secretKey
          );
          return { ...msg, decrypted_content: decrypted || "[Unable to decrypt]" };
        } catch {
          return { ...msg, decrypted_content: "[Encrypted message]" };
        }
      });
    },
    [secretKey, chatData?.otherUserPublicKey]
  );

  /* ── Decrypt messages when keys or chatData change ── */
  useEffect(() => {
    if (keysReady && secretKey && messages.length > 0) {
      setMessages((prev) => decryptMessages(prev));
    }
  }, [keysReady, secretKey, decryptMessages]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── Scroll to bottom on new messages ── */
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  /* ── Real-time subscription for active chat ── */
  useEffect(() => {
    if (!keysReady || !activeConvId) return;

    const channel = supabase
      .channel(`dm:${activeConvId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "dm_messages",
          filter: `conversation_id=eq.${activeConvId}`,
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (payload: any) => {
          const newMsg = payload.new as DmMessage;
          setMessages((prev) => {
            if (prev.some((m) => m.id === newMsg.id)) return prev;
            const decrypted = decryptMessages([newMsg]);
            return [...prev, ...decrypted];
          });
          // Mark as read
          if (newMsg.sender_id !== userId) {
            supabase
              .from("dm_participants")
              .update({ last_read_at: new Date().toISOString() })
              .eq("conversation_id", activeConvId)
              .eq("user_id", userId)
              .then(() => {});
          }
        }
      )
      .subscribe();

    // Mark as read on open
    supabase
      .from("dm_participants")
      .update({ last_read_at: new Date().toISOString() })
      .eq("conversation_id", activeConvId)
      .eq("user_id", userId)
      .then(() => {});

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeConvId, keysReady, userId, supabase, decryptMessages]);

  /* ── Load conversation when switching ── */
  async function openConversation(convId: string) {
    if (convId === activeConvId) {
      setShowSidebar(false);
      return;
    }

    setChatLoading(true);
    setMessages([]);
    setNewMessage("");
    setMsgError(null);
    setActiveConvId(convId);
    setShowSidebar(false);

    // Update URL without full page reload
    window.history.replaceState(null, "", `/messages?c=${convId}`);

    const conv = conversations.find((c) => c.id === convId);
    if (!conv) {
      setChatLoading(false);
      return;
    }

    setChatData({
      otherUserId: conv.other_user_id,
      otherUserName: conv.other_user_name,
      otherUserCode: conv.other_user_code,
      otherUserPublicKey: conv.other_user_public_key,
    });

    // Load messages
    const { data: msgs } = await supabase
      .from("dm_messages")
      .select("*")
      .eq("conversation_id", convId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(50);

    const loaded = (msgs || []).reverse();
    setMessages(decryptMessages(loaded));
    setChatLoading(false);
  }

  /* ── Send message ── */
  async function handleSend() {
    const text = newMessage.trim();
    if (!text || !secretKey || !chatData?.otherUserPublicKey || sending || !activeConvId) return;

    setSending(true);
    setMsgError(null);

    try {
      const { encrypted, nonce } = encryptMessage(text, chatData.otherUserPublicKey, secretKey);

      const { data: sentMsg, error: sendError } = await supabase
        .from("dm_messages")
        .insert({
          conversation_id: activeConvId,
          sender_id: userId,
          encrypted_content: encrypted,
          nonce: nonce,
          message_type: "text",
        })
        .select()
        .single();

      if (sendError) throw sendError;

      if (sentMsg) {
        setMessages((prev) => [...prev, { ...sentMsg, decrypted_content: text }]);
      }

      setNewMessage("");

      // Update conversation list order
      setConversations((prev) => {
        const updated = prev.map((c) =>
          c.id === activeConvId
            ? {
                ...c,
                last_message_at: new Date().toISOString(),
                last_message: sentMsg ? {
                  id: sentMsg.id,
                  sender_id: userId,
                  encrypted_content: sentMsg.encrypted_content,
                  nonce: sentMsg.nonce,
                  created_at: sentMsg.created_at,
                  message_type: "text",
                  deleted_at: null,
                } : c.last_message,
              }
            : c
        );
        return updated.sort(
          (a, b) => new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime()
        );
      });
    } catch (err) {
      setMsgError(err instanceof Error ? err.message : t("messages.failedToStart"));
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

  function isUnread(conv: ConversationRow): boolean {
    if (!conv.last_message) return false;
    if (conv.last_message.sender_id === userId) return false;
    return new Date(conv.last_message.created_at) > new Date(conv.last_read_at);
  }

  const filteredConversations = conversations.filter((conv) => {
    if (!search.trim()) return true;
    const name = conv.other_user_name || conv.other_user_code || "";
    return name.toLowerCase().includes(search.toLowerCase());
  });

  /* ── Key setup screen ── */
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

  const otherHasKeys = chatData ? !!chatData.otherUserPublicKey : false;
  const displayName = chatData
    ? chatData.otherUserName || chatData.otherUserCode || "Unknown Citizen"
    : "";

  /* ══════════════════════════════════════════════════════ */
  /*  RENDER                                               */
  /* ══════════════════════════════════════════════════════ */
  return (
    <div className="flex h-[calc(100vh-4rem)] overflow-hidden bg-theme-base rounded-xl border border-theme">
      {/* ── LEFT PANEL: Conversation List ── */}
      <div
        className={`${
          showSidebar ? "flex" : "hidden md:flex"
        } flex-col w-full md:w-80 lg:w-96 border-r border-theme bg-theme-base shrink-0`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-theme">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-blue-400" />
            <h2 className="text-lg font-bold text-fg">{t("messages.title")}</h2>
          </div>
          <button
            onClick={() => setShowNewConv(true)}
            className="p-2 rounded-lg hover:bg-theme-card text-fg-muted hover:text-fg transition-colors"
            title={t("messages.newMessage")}
          >
            <PenSquare className="w-5 h-5" />
          </button>
        </div>

        {/* E2E badge */}
        <div className="flex items-center gap-1.5 px-4 py-2 text-xs text-fg-muted border-b border-theme bg-theme-card/30">
          <ShieldCheck className="w-3.5 h-3.5 text-fg-success shrink-0" />
          <span>{t("messages.encrypted")}</span>
        </div>

        {/* Search */}
        {conversations.length > 0 && (
          <div className="px-3 py-2 border-b border-theme">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-fg-muted" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t("messages.searchConversations")}
                className="input-field pl-10 py-2 text-sm"
              />
            </div>
          </div>
        )}

        {/* Conversation list */}
        <div className="flex-1 overflow-y-auto">
          {filteredConversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
              <MessageSquare className="w-10 h-10 text-fg-muted mb-3 opacity-40" />
              <p className="text-sm text-fg-muted">
                {conversations.length === 0
                  ? t("messages.noMessages")
                  : t("messages.noMatchingConversations")}
              </p>
              {conversations.length === 0 && (
                <button
                  onClick={() => setShowNewConv(true)}
                  className="mt-3 text-sm text-blue-400 hover:text-blue-300 transition-colors"
                >
                  {t("messages.startFirstConversation")}
                </button>
              )}
            </div>
          ) : (
            <div className="py-1">
              {filteredConversations.map((conv) => {
                const unread = isUnread(conv);
                const name = conv.other_user_name || conv.other_user_code || t("messages.anonymousCitizen");
                const initials = getInitials(conv.other_user_name);
                const isActive = conv.id === activeConvId;

                return (
                  <button
                    key={conv.id}
                    onClick={() => openConversation(conv.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 transition-all duration-150 text-left hover:bg-theme-card/60 ${
                      isActive
                        ? "bg-blue-500/10 border-l-2 border-blue-500"
                        : unread
                        ? "bg-theme-card/30 border-l-2 border-transparent"
                        : "border-l-2 border-transparent"
                    }`}
                  >
                    {/* Avatar */}
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                        isActive
                          ? "bg-gradient-to-br from-blue-500 to-blue-700 border border-blue-400"
                          : unread
                          ? "bg-gradient-to-br from-blue-600 to-blue-800 border border-blue-500"
                          : "bg-gradient-to-br from-slate-600 to-slate-700 border border-slate-500"
                      }`}
                    >
                      <span className="text-xs font-bold text-fg">{initials}</span>
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span
                          className={`text-sm truncate ${
                            unread || isActive ? "font-bold text-fg" : "font-medium text-fg"
                          }`}
                        >
                          {name}
                        </span>
                        <span className="text-[11px] text-fg-muted shrink-0">
                          {conv.last_message ? formatTime(conv.last_message.created_at) : ""}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 mt-0.5">
                        <Lock className="w-3 h-3 text-fg-muted shrink-0" />
                        <p
                          className={`text-xs truncate ${
                            unread ? "text-fg font-medium" : "text-fg-muted"
                          }`}
                        >
                          {conv.last_message
                            ? conv.last_message.sender_id === userId
                              ? `You: ${decryptedPreviews[conv.id] || "Encrypted"}`
                              : decryptedPreviews[conv.id] || "Encrypted"
                            : t("messages.noMessages")}
                        </p>
                      </div>
                    </div>

                    {/* Unread dot */}
                    {unread && (
                      <div className="w-2.5 h-2.5 rounded-full bg-blue-500 shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── RIGHT PANEL: Chat Area ── */}
      <div
        className={`${
          showSidebar ? "hidden md:flex" : "flex"
        } flex-col flex-1 min-w-0`}
      >
        {!activeConvId ? (
          /* No conversation selected */
          <div className="flex-1 flex flex-col items-center justify-center text-center px-6">
            <div className="w-20 h-20 rounded-full bg-theme-card flex items-center justify-center mb-4">
              <MessageSquare className="w-10 h-10 text-fg-muted opacity-40" />
            </div>
            <h3 className="text-lg font-semibold text-fg mb-2">
              {t("messages.selectConversation")}
            </h3>
            <p className="text-sm text-fg-muted max-w-sm mb-4">
              {t("messages.selectConversationDesc")}
            </p>
            <button
              onClick={() => setShowNewConv(true)}
              className="btn-primary flex items-center gap-2 text-sm px-4 py-2"
            >
              <PenSquare className="w-4 h-4" />
              {t("messages.newMessage")}
            </button>
          </div>
        ) : chatLoading ? (
          /* Loading */
          <div className="flex-1 flex items-center justify-center">
            <span className="animate-spin w-8 h-8 border-3 border-blue-400 border-t-transparent rounded-full" />
          </div>
        ) : (
          /* Active chat */
          <>
            {/* Chat header */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-theme bg-theme-base/95 backdrop-blur-md shrink-0">
              {/* Back button (mobile) */}
              <button
                onClick={() => setShowSidebar(true)}
                className="p-2 -ml-2 rounded-lg hover:bg-theme-card text-fg-muted hover:text-fg transition-colors md:hidden"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>

              <Link
                href={`/citizens/${chatData?.otherUserId}`}
                className="flex items-center gap-3 hover:opacity-80 transition-opacity flex-1 min-w-0"
              >
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-600 to-blue-800 border border-blue-500 flex items-center justify-center shrink-0">
                  <span className="text-xs font-bold text-fg">
                    {getInitials(chatData?.otherUserName || null)}
                  </span>
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-fg truncate">{displayName}</p>
                  <div className="flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3 text-fg-success" />
                    <span className="text-[11px] text-fg-muted">{t("messages.e2eEncrypted")}</span>
                  </div>
                </div>
              </Link>
            </div>

            {/* Messages area */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-1" style={{ minHeight: 0 }}>
              {/* E2E notice */}
              <div className="flex justify-center mb-6">
                <div className="flex items-center gap-2 bg-theme-card/60 border border-theme rounded-full px-4 py-2">
                  <Lock className="w-3.5 h-3.5 text-amber-400" />
                  <span className="text-xs text-fg-muted">
                    {t("messages.e2eNotice").replace("{name}", displayName)}
                  </span>
                </div>
              </div>

              {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="w-16 h-16 rounded-full bg-theme-card flex items-center justify-center mb-4">
                    <User className="w-8 h-8 text-fg-muted" />
                  </div>
                  <p className="text-fg font-medium mb-1">
                    {t("messages.startConversationWith").replace("{name}", displayName)}
                  </p>
                  <p className="text-sm text-fg-muted">{t("messages.willBeEncrypted")}</p>
                </div>
              ) : (
                (() => {
                  let prevDateKey = "";
                  return messages.map((msg) => {
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
                        <div className={`flex ${isMine ? "justify-end" : "justify-start"} mb-1`}>
                          <div
                            className={`max-w-[75%] px-3.5 py-2 rounded-2xl ${
                              isMine
                                ? "bg-blue-600 text-fg rounded-br-md"
                                : "bg-theme-card text-fg border border-theme rounded-bl-md"
                            }`}
                          >
                            <div className="text-sm whitespace-pre-wrap break-words">
                              {msg.decrypted_content ? (
                                renderMentions(msg.decrypted_content)
                              ) : (
                                <span className="italic text-fg-muted flex items-center gap-1">
                                  <Lock className="w-3 h-3" />
                                  {t("messages.encryptedMessage")}
                                </span>
                              )}
                            </div>
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
                                {formatMsgTime(msg.created_at)}
                              </span>
                              {isMine && (
                                <CheckCheck className="w-3 h-3 text-blue-200/70" />
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  });
                })()
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Error */}
            {msgError && (
              <div className="px-4 py-2 bg-danger-tint border-t border-theme shrink-0">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-fg-danger shrink-0" />
                  <p className="text-sm text-fg-danger">{msgError}</p>
                  <button onClick={() => setMsgError(null)} className="ml-auto p-1">
                    <X className="w-3 h-3 text-fg-danger" />
                  </button>
                </div>
              </div>
            )}

            {/* No encryption warning */}
            {!otherHasKeys && activeConvId && (
              <div className="px-4 py-3 bg-warning-tint border-t border-theme shrink-0">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                  <p className="text-sm text-amber-300">
                    {t("messages.noEncryptionYet").replace("{name}", displayName)}
                  </p>
                </div>
              </div>
            )}

            {/* Message input */}
            <div className="border-t border-theme bg-theme-card/95 backdrop-blur-md px-4 py-3 shrink-0">
              <div className="flex items-end gap-2">
                <textarea
                  ref={inputRef}
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={
                    otherHasKeys
                      ? t("messages.typeMessage")
                      : t("messages.waitingEncryption")
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
          </>
        )}
      </div>

      {/* New conversation modal */}
      {showNewConv && (
        <NewConversationModal
          userId={userId}
          onClose={() => setShowNewConv(false)}
          onSelect={(conversationId) => {
            setShowNewConv(false);
            openConversation(conversationId);
          }}
        />
      )}
    </div>
  );
}

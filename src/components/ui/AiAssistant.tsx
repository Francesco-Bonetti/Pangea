"use client";

import { useState, useRef, useEffect } from "react";
import { Bot, Send, X, Loader2, Sparkles, MessageCircle } from "lucide-react";
import { useLanguage } from "@/components/core/language-provider";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

// Topic keywords for matching user queries (language-agnostic search terms)
const TOPIC_KEYWORDS: Record<string, string[]> = {
  proposals: ["proposal", "proposta", "propuesta", "proposition", "create", "creare", "submit", "draft", "how do i", "come faccio", "new proposal"],
  voting: ["vote", "voto", "voting", "votazione", "deliberation", "how to vote", "come votare"],
  delegations: ["delegation", "delega", "deleghe", "delegación", "delegate", "delegare", "trust"],
  groups: ["group", "groups", "gruppo", "groupo", "groupe", "jurisdiction", "party", "community"],
  platform: ["pangea", "platform", "piattaforma", "plataforma", "plateforme", "what is", "cos'è", "about", "how does"],
  parties: ["party", "partito", "partido", "parti", "political", "join", "create"],
};

function findAnswer(query: string, t: (key: string) => string): string {
  const q = query.toLowerCase();

  // Score each topic by keyword match
  let bestScore = 0;
  let bestTopic = "";

  for (const [topic, keywords] of Object.entries(TOPIC_KEYWORDS)) {
    let score = 0;
    for (const kw of keywords) {
      if (q.includes(kw.toLowerCase())) {
        score += kw.length; // longer keyword = more specific match
      }
    }
    if (score > bestScore) {
      bestScore = score;
      bestTopic = topic;
    }
  }

  if (bestScore > 0 && bestTopic) {
    return t(`ai.kb.${bestTopic}`) as string;
  }

  return t("ai.fallback") as string;
}

export default function AiAssistant() {
  const { t } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  function handleSend() {
    if (!input.trim() || thinking) return;

    const userMsg: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: input.trim(),
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setThinking(true);

    // Simulate AI thinking delay
    setTimeout(() => {
      const answer = findAnswer(userMsg.content, t);
      const aiMsg: Message = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: answer,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, aiMsg]);
      setThinking(false);
    }, 600 + Math.random() * 800);
  }

  const suggestions = t("ai.suggestions") as unknown as string[];

  return (
    <>
      {/* Floating button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-20 right-6 z-50 w-12 h-12 rounded-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white shadow-lg shadow-purple-600/30 hover:shadow-purple-500/40 flex items-center justify-center transition-all duration-200 hover:scale-105"
          aria-label="Open AI Assistant"
          title={t("ai.title")}
        >
          <Bot className="w-6 h-6" />
        </button>
      )}

      {/* Chat panel */}
      {isOpen && (
        <div
          className="fixed bottom-20 right-6 z-[60] w-[360px] max-w-[calc(100vw-2rem)] h-[500px] max-h-[calc(100vh-8rem)] rounded-2xl border shadow-2xl flex flex-col overflow-hidden"
          style={{
            backgroundColor: "var(--card)",
            borderColor: "var(--border)",
          }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b bg-gradient-to-r from-purple-600/10 to-blue-600/10" style={{ borderColor: "var(--border)" }}>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-gradient-to-r from-purple-600 to-blue-600 flex items-center justify-center">
                <Bot className="w-4 h-4 text-white" />
              </div>
              <div>
                <p className="text-sm font-semibold" style={{ color: "var(--foreground)" }}>{t("ai.title")}</p>
                <p className="text-[10px]" style={{ color: "var(--muted-foreground)" }}>
                  <Sparkles className="w-3 h-3 inline mr-0.5" />
                  {t("ai.disclaimer")}
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1.5 rounded-lg hover:bg-[var(--muted)] transition-colors"
              style={{ color: "var(--muted-foreground)" }}
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
            {messages.length === 0 && (
              <div className="space-y-3">
                {/* Welcome */}
                <div className="p-3 rounded-lg bg-gradient-to-r from-purple-600/10 to-blue-600/10 text-sm" style={{ color: "var(--foreground)" }}>
                  {t("ai.welcome")}
                </div>
                {/* Suggestions */}
                <div className="space-y-1.5">
                  {(Array.isArray(suggestions) ? suggestions : []).map((s, i) => (
                    <button
                      key={i}
                      onClick={() => setInput(s)}
                      className="w-full text-left text-xs px-3 py-2 rounded-lg border hover:bg-[var(--muted)] transition-colors"
                      style={{ borderColor: "var(--border)", color: "var(--muted-foreground)" }}
                    >
                      <MessageCircle className="w-3 h-3 inline mr-1.5" />
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((msg) => (
              <div key={msg.id} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[85%] px-3 py-2 rounded-xl text-sm whitespace-pre-line ${
                    msg.role === "user"
                      ? "bg-blue-600 text-white rounded-br-sm"
                      : "rounded-bl-sm"
                  }`}
                  style={msg.role === "assistant" ? {
                    backgroundColor: "var(--muted)",
                    color: "var(--foreground)",
                  } : undefined}
                >
                  {msg.content}
                </div>
              </div>
            ))}

            {thinking && (
              <div className="flex justify-start">
                <div className="px-3 py-2 rounded-xl rounded-bl-sm text-sm flex items-center gap-2" style={{ backgroundColor: "var(--muted)", color: "var(--muted-foreground)" }}>
                  <Loader2 className="w-3 h-3 animate-spin" />
                  {t("ai.thinking")}
                </div>
              </div>
            )}
          </div>

          {/* Input */}
          <div className="px-3 py-3 border-t" style={{ borderColor: "var(--border)" }}>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSend();
              }}
              className="flex items-center gap-2"
            >
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={t("ai.placeholder")}
                className="flex-1 bg-transparent text-sm outline-none px-3 py-2 rounded-lg"
                style={{
                  backgroundColor: "var(--muted)",
                  color: "var(--foreground)",
                  border: "1px solid var(--border)",
                }}
              />
              <button
                type="submit"
                disabled={!input.trim() || thinking}
                className="p-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-40 transition-colors"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

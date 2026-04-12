"use client";

import Link from "next/link";
import { ArrowLeft, AlertTriangle } from "lucide-react";
import { useLanguage } from "@/components/core/language-provider";

interface ConversationNotFoundClientProps {
  reason: "conversationNotFound" | "participantNotFound";
}

export default function ConversationNotFoundClient({
  reason,
}: ConversationNotFoundClientProps) {
  const { t } = useLanguage();

  const reasonMap = {
    conversationNotFound: t("messages.conversationNotFound"),
    participantNotFound: t("messages.participantNotFound"),
  };

  return (
    <div className="min-h-screen bg-[var(--background)] flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-theme-base/80 border border-theme rounded-xl p-8 text-center">
        <div className="w-14 h-14 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mx-auto mb-4">
          <AlertTriangle className="w-7 h-7 text-amber-400" />
        </div>
        <h2 className="text-xl font-bold text-fg mb-2">
          {t("messages.conversationUnavailable")}
        </h2>
        <p className="text-fg-muted text-sm mb-6">{reasonMap[reason]}</p>
        <Link
          href="/messages"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-fg text-sm font-medium rounded-lg transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          {t("messages.backToMessages")}
        </Link>
      </div>
    </div>
  );
}

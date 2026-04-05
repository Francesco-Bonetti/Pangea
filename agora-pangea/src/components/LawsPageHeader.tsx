"use client";

import { useLanguage } from "@/components/language-provider";
import Link from "next/link";
import { BookOpen } from "lucide-react";

export default function LawsPageHeader() {
  const { t } = useLanguage();

  return (
    <div className="mb-8">
      <Link
        href="/dashboard"
        className="text-sm text-fg-muted hover:text-fg transition-colors mb-4 inline-block"
      >
        &larr; {t("laws.backToDashboard")}
      </Link>
      <div className="flex items-center gap-3 mb-2 overflow-hidden">
        <BookOpen className="w-8 h-8 text-blue-400 shrink-0" strokeWidth={1.5} />
        <h1 className="text-3xl font-bold text-fg truncate">
          {t("laws.title")}
        </h1>
      </div>
      <p className="text-fg-muted">
        {t("laws.description")}
      </p>
    </div>
  );
}

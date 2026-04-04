"use client";

import { useLanguage } from "@/components/language-provider";
import { Rss } from "lucide-react";

export default function FeedPageHeader() {
  const { t } = useLanguage();

  return (
    <div className="flex items-center gap-3 mb-6">
      <Rss className="w-6 h-6 text-fg-primary" />
      <h1 className="text-2xl font-bold text-fg">{t("feedPage.title")}</h1>
    </div>
  );
}

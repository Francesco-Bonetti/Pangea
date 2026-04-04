"use client";

import { useState, useEffect } from "react";
import { Languages, RotateCcw } from "lucide-react";
import { useLanguage } from "@/components/language-provider";
import { createClient } from "@/lib/supabase/client";
import type { ContentType } from "@/lib/translate";

interface TranslatedContentProps {
  /** Original text */
  text: string;
  /** Content type for DB lookup */
  contentType: ContentType;
  /** Content UUID */
  contentId: string;
  /** Optional: className applied to the text wrapper */
  className?: string;
  /** Optional: render as a specific HTML element (default: span) */
  as?: "span" | "p" | "div" | "h1" | "h2" | "h3";
  /** Compact mode: just show translated text, no toggle button (for cards/lists) */
  compact?: boolean;
}

/**
 * Displays translated content automatically based on user's language.
 * Reads cached translations from Supabase `content_translations` table.
 * Falls back to original text if no translation is available.
 * Shows a small toggle to switch between translated and original.
 */
export default function TranslatedContent({
  text,
  contentType,
  contentId,
  className = "",
  as: Tag = "span",
  compact = false,
}: TranslatedContentProps) {
  const { locale, t } = useLanguage();
  const [translatedText, setTranslatedText] = useState<string | null>(null);
  const [showOriginal, setShowOriginal] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function fetchTranslation() {
      if (!contentId || !text) {
        setLoaded(true);
        return;
      }

      try {
        const supabase = createClient();
        const { data } = await supabase
          .from("content_translations")
          .select("translated_text, source_language")
          .eq("content_type", contentType)
          .eq("content_id", contentId)
          .eq("target_language", locale)
          .single();

        if (!cancelled && data?.translated_text) {
          // If the source language is the same as user locale, no need to show translation
          if (data.source_language === locale) {
            setTranslatedText(null);
          } else {
            setTranslatedText(data.translated_text);
          }
        }
      } catch {
        // No translation found — will show original
      } finally {
        if (!cancelled) setLoaded(true);
      }
    }

    setLoaded(false);
    setTranslatedText(null);
    setShowOriginal(false);
    fetchTranslation();

    return () => {
      cancelled = true;
    };
  }, [contentId, contentType, locale, text]);

  // Determine what to display
  const hasTranslation = translatedText !== null && translatedText !== text;
  const displayText = hasTranslation && !showOriginal ? translatedText : text;

  if (compact) {
    return <Tag className={className}>{displayText}</Tag>;
  }

  return (
    <>
      <Tag className={className}>{displayText}</Tag>
      {loaded && hasTranslation && (
        <span className="inline-flex items-center gap-1 ml-1">
          <button
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowOriginal(!showOriginal); }}
            className="inline-flex items-center gap-1 text-[10px] text-blue-400 hover:text-blue-300 transition-colors"
            title={showOriginal ? t("translate.showTranslation") : t("translate.showOriginal")}
          >
            {showOriginal ? (
              <Languages className="w-3 h-3" />
            ) : (
              <RotateCcw className="w-3 h-3" />
            )}
            <span className="italic text-gray-500">
              {showOriginal ? t("translate.autoTranslated") : t("translate.viewOriginal")}
            </span>
          </button>
        </span>
      )}
    </>
  );
}

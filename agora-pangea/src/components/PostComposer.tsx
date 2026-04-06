"use client";

import React, { useState } from "react";
import { Send, Globe2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import MentionInput, { extractMentions } from "@/components/MentionInput";
import { useLanguage } from "@/components/language-provider";
import { triggerTranslation } from "@/lib/translate";

interface PostComposerProps {
  userId: string;
  userName?: string | null;
  onPostCreated?: () => void;
  placeholder?: string;
}

export default function PostComposer({ userId, userName, onPostCreated, placeholder }: PostComposerProps) {
  const supabase = createClient();
  const { t, locale } = useLanguage();
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!body.trim()) return;
    setSubmitting(true);
    setError(null);

    try {
      const { data: post, error: insertErr } = await supabase
        .from("personal_posts")
        .insert({
          author_id: userId,
          body: body.trim(),
        })
        .select()
        .single();

      if (insertErr) throw insertErr;

      // Save mentions
      const mentions = extractMentions(body);
      if (mentions.length > 0 && post) {
        const mentionRows = mentions.map((m) => ({
          source_type: "post" as const,
          source_id: post.id,
          target_type: m.type,
          target_id: m.id,
          target_uid: m.uid || null,
          mentioned_by: userId,
        }));
        await supabase.from("entity_mentions").insert(mentionRows);
      }

      // Trigger translation
      if (post) {
        triggerTranslation(body.trim(), "post_body", post.id);
      }

      setBody("");
      onPostCreated?.();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t("common.failedToCreate"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="p-4 rounded-xl border"
      style={{ backgroundColor: "var(--card)", borderColor: "var(--border)" }}
    >
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-purple-600 to-purple-800 flex items-center justify-center text-xs font-bold text-white shrink-0 mt-1">
          {(userName || "?")[0].toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <MentionInput
            value={body}
            onChange={setBody}
            placeholder={placeholder || t("posts.composerPlaceholder")}
            rows={3}
          />
          {error && <p className="text-xs text-red-400 mt-1">{error}</p>}
          <div className="flex items-center justify-between mt-3">
            <div className="flex items-center gap-1 text-[10px]" style={{ color: "var(--muted-foreground)" }}>
              <Globe2 className="w-3 h-3" />
              {t("posts.visibleToAll")}
            </div>
            <button
              onClick={handleSubmit}
              disabled={submitting || !body.trim()}
              className="flex items-center gap-1.5 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
            >
              <Send className="w-3.5 h-3.5" />
              {submitting ? "..." : t("posts.publish")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

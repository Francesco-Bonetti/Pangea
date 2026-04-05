"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { X, Search } from "lucide-react";
import type { DiscussionChannel, Tag } from "@/lib/types";
import { useLanguage } from "@/components/language-provider";
import { triggerMultiFieldTranslation } from "@/lib/translate";

interface NewDiscussionFormProps {
  userId?: string;
  channelId?: string;
  onSuccess?: () => void;
}

// Simple markdown to HTML converter
function renderMarkdown(text: string): React.ReactNode[] {
  const lines = text.split("\n");
  const result: React.ReactNode[] = [];

  lines.forEach((line, idx) => {
    // Replace bold: **text** → <strong>
    let processed = line.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
    // Replace italic: *text* → <em>
    processed = processed.replace(/\*(.*?)\*/g, "<em>$1</em>");
    // Replace code: `text` → <code>
    processed = processed.replace(/`(.*?)`/g, "<code>$1</code>");

    result.push(
      <div
        key={idx}
        dangerouslySetInnerHTML={{ __html: processed }}
        className="text-fg"
      />
    );
    result.push("\n");
  });

  return result;
}

export default function NewDiscussionForm({
  userId,
  channelId,
  onSuccess,
}: NewDiscussionFormProps) {
  const supabase = createClient();
  const router = useRouter();
  const { t, locale } = useLanguage();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [selectedChannel, setSelectedChannel] = useState(channelId || "");
  const [channels, setChannels] = useState<DiscussionChannel[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [selectedTags, setSelectedTags] = useState<Tag[]>([]);
  const [tagSearch, setTagSearch] = useState("");
  const [filteredTags, setFilteredTags] = useState<Tag[]>([]);
  const [showTagDropdown, setShowTagDropdown] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const tagInputRef = useRef<HTMLInputElement>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Fetch channels on mount
  useEffect(() => {
    const fetchChannels = async () => {
      const { data } = await supabase
        .from("discussion_channels")
        .select("*")
        .eq("is_active", true)
        .order("sort_order");
      if (data) setChannels(data);
    };
    fetchChannels();
  }, [supabase]);

  // Fetch all tags on mount
  useEffect(() => {
    const fetchTags = async () => {
      const { data } = await supabase.from("tags").select("*").order("name");
      if (data) setTags(data);
    };
    fetchTags();
  }, [supabase]);

  // Filter tags based on search
  useEffect(() => {
    if (!tagSearch.trim()) {
      setFilteredTags([]);
      return;
    }

    const search = tagSearch.toLowerCase();
    const filtered = tags
      .filter(
        (tag) =>
          tag.name.toLowerCase().includes(search) &&
          !selectedTags.some((st) => st.id === tag.id)
      )
      .slice(0, 5);
    setFilteredTags(filtered);
  }, [tagSearch, tags, selectedTags]);

  const handleAddTag = (tag: Tag) => {
    setSelectedTags([...selectedTags, tag]);
    setTagSearch("");
    setFilteredTags([]);
    tagInputRef.current?.focus();
  };

  const handleRemoveTag = (tagId: string) => {
    setSelectedTags(selectedTags.filter((t) => t.id !== tagId));
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (!title.trim()) newErrors.title = t("forum.titleRequired");
    if (!body.trim()) newErrors.body = t("forum.contentRequired");
    if (!selectedChannel) newErrors.channel = t("forum.channelRequired");
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) {
      alert(t("forum.pleaseSignIn"));
      return;
    }

    if (!validateForm()) return;

    setIsLoading(true);
    try {
      // Insert discussion
      const { data: discussion, error: discussionError } = await supabase
        .from("discussions")
        .insert([
          {
            author_id: userId,
            channel_id: selectedChannel,
            title,
            body,
            is_pinned: false,
            is_locked: false,
            upvotes_count: 0,
            downvotes_count: 0,
            replies_count: 0,
            views_count: 0,
          },
        ])
        .select()
        .single();

      if (discussionError) throw discussionError;

      // Insert tags if any
      if (discussion && selectedTags.length > 0) {
        const tagInserts = selectedTags.map((tag) => ({
          discussion_id: discussion.id,
          tag_id: tag.id,
        }));

        const { error: tagError } = await supabase
          .from("discussion_tags")
          .insert(tagInserts);

        if (!tagError) {
          // Update tag usage counts
          const { error: updateError } = await supabase.rpc(
            "increment_tag_usage",
            { tag_ids: selectedTags.map((t) => t.id) }
          );
          if (updateError) console.error("Error updating tag counts:", updateError);
        }
      }

      // Trigger batch translations (fire & forget)
      if (discussion) {
        triggerMultiFieldTranslation([
          { text: title.trim(), contentType: "forum_post_title", contentId: discussion.id },
          { text: body.trim(), contentType: "forum_post_body", contentId: discussion.id },
        ], locale);
      }

      // Reset form
      setTitle("");
      setBody("");
      setSelectedChannel(channelId || "");
      setSelectedTags([]);
      setTagSearch("");

      // Refresh page to show new discussion
      router.refresh();
      onSuccess?.();
    } catch (error) {
      console.error("Error creating discussion:", error);
      alert(t("forum.failedToCreate"));
    } finally {
      setIsLoading(false);
    }
  };

  if (!userId) {
    return (
      <div className="card p-8 text-center">
        <p className="text-fg-muted mb-4">{t("forum.signInToCreate")}</p>
        <a
          href="/auth"
          className="inline-block px-4 py-2 bg-pangea-600 hover:bg-pangea-700 text-fg rounded-lg transition-colors"
        >
          {t("nav.signIn")}
        </a>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="card p-6 space-y-5">
      <div>
        <label className="block text-sm font-medium text-fg mb-2">
          {t("forum.discussionTitle")}
        </label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={t("forum.whatsOnYourMind")}
          className="w-full bg-theme-base border border-theme rounded-lg px-4 py-2.5 text-fg placeholder-slate-500 focus:outline-none focus:border-pangea-600 focus:ring-1 focus:ring-pangea-600 transition-colors"
        />
        {errors.title && (
          <p className="text-fg-danger text-xs mt-1">{errors.title}</p>
        )}
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="block text-sm font-medium text-fg">
            {t("forum.contentLabel")}
          </label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setShowPreview(false)}
              className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
                !showPreview
                  ? "bg-pangea-600 text-fg"
                  : "bg-theme-muted/30 text-fg-muted hover:text-fg"
              }`}
            >
              {t("forumExtra.write")}
            </button>
            <button
              type="button"
              onClick={() => setShowPreview(true)}
              className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
                showPreview
                  ? "bg-pangea-600 text-fg"
                  : "bg-theme-muted/30 text-fg-muted hover:text-fg"
              }`}
            >
              {t("forumExtra.preview")}
            </button>
          </div>
        </div>

        {!showPreview ? (
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder={t("forum.shareThoughts")}
            rows={6}
            className="w-full bg-theme-base border border-theme rounded-lg px-4 py-2.5 text-fg placeholder-slate-500 focus:outline-none focus:border-pangea-600 focus:ring-1 focus:ring-pangea-600 transition-colors resize-none"
          />
        ) : (
          <div className="w-full bg-theme-base border border-theme rounded-lg px-4 py-2.5 text-fg min-h-[180px] overflow-y-auto">
            {body.trim() ? (
              <div className="prose prose-invert max-w-none text-sm leading-relaxed">
                {renderMarkdown(body)}
              </div>
            ) : (
              <p className="text-fg-muted italic">{t("forum.shareThoughts")}</p>
            )}
          </div>
        )}
        {errors.body && (
          <p className="text-fg-danger text-xs mt-1">{errors.body}</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-fg mb-2">
          {t("forum.channel")}
        </label>
        <select
          value={selectedChannel}
          onChange={(e) => setSelectedChannel(e.target.value)}
          className="w-full bg-theme-base border border-theme rounded-lg px-4 py-2.5 text-fg focus:outline-none focus:border-pangea-600 focus:ring-1 focus:ring-pangea-600 transition-colors"
        >
          <option value="">{t("forum.selectChannel")}</option>
          {channels.map((ch) => (
            <option key={ch.id} value={ch.id}>
              {ch.emoji} {ch.name}
            </option>
          ))}
        </select>
        {errors.channel && (
          <p className="text-fg-danger text-xs mt-1">{errors.channel}</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-fg mb-2">
          {t("forum.tagsOptional")}
        </label>
        <div className="relative">
          <div className="w-full bg-theme-base border border-theme rounded-lg px-4 py-2.5 flex flex-wrap gap-2 items-center focus-within:border-pangea-600 focus-within:ring-1 focus-within:ring-pangea-600 transition-colors">
            {selectedTags.map((tag) => (
              <span
                key={tag.id}
                className="inline-flex items-center gap-1.5 bg-pangea-900/40 text-fg-primary px-2.5 py-1 rounded-full text-xs border border-pangea-700/50"
              >
                #{tag.name}
                <button
                  type="button"
                  onClick={() => handleRemoveTag(tag.id)}
                  className="hover:text-pangea-200 transition-colors"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
            <input
              ref={tagInputRef}
              type="text"
              value={tagSearch}
              onChange={(e) => setTagSearch(e.target.value)}
              onFocus={() => setShowTagDropdown(true)}
              onBlur={() => setTimeout(() => setShowTagDropdown(false), 200)}
              placeholder={selectedTags.length === 0 ? t("forum.searchOrCreateTags") : ""}
              className="flex-1 min-w-[120px] bg-transparent outline-none text-fg placeholder-slate-500"
            />
          </div>

          {showTagDropdown && filteredTags.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-theme-card border border-theme rounded-lg shadow-lg z-10">
              {filteredTags.map((tag) => (
                <button
                  key={tag.id}
                  type="button"
                  onClick={() => handleAddTag(tag)}
                  className="w-full text-left px-4 py-2 hover:bg-theme-muted text-fg text-sm transition-colors flex items-center gap-2"
                >
                  <Search className="w-3 h-3 text-fg-muted" />
                  #{tag.name}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={isLoading}
          className="flex-1 px-4 py-2.5 bg-pangea-600 hover:bg-pangea-700 disabled:bg-pangea-600/50 text-fg font-medium rounded-lg transition-colors disabled:cursor-not-allowed"
        >
          {isLoading ? t("forum.creating") : t("forum.createDiscussion")}
        </button>
      </div>
    </form>
  );
}

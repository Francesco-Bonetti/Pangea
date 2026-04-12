"use client";

import React, { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { MessageSquare, Plus, X, Send } from "lucide-react";
import type { GroupForumPost } from "@/lib/types";
import GroupDiscussionCard from "@/components/social/GroupDiscussionCard";
import MentionInput, { extractMentions } from "@/components/social/MentionInput";
import { useLanguage } from "@/components/core/language-provider";
import { triggerMultiFieldTranslation, type ContentType } from "@/lib/translate";

interface GroupDiscussionsProps {
  groupId: string;
  userId?: string;
  isMember: boolean;
  isAdmin?: boolean;
  groupName: string;
}

export default function GroupDiscussions({ groupId, userId, isMember, isAdmin, groupName }: GroupDiscussionsProps) {
  const supabase = createClient();
  const { t, locale } = useLanguage();

  const [posts, setPosts] = useState<GroupForumPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  // Form state
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sort
  const [sortBy, setSortBy] = useState<"newest" | "most_upvoted" | "most_discussed">("newest");

  const loadPosts = useCallback(async () => {
    setLoading(true);

    let query = supabase
      .from("group_forum_posts")
      .select("*")
      .eq("group_id", groupId)
      .is("parent_id", null);

    // Sort — pinned always first
    if (sortBy === "newest") query = query.order("is_pinned", { ascending: false }).order("created_at", { ascending: false });
    else if (sortBy === "most_upvoted") query = query.order("is_pinned", { ascending: false }).order("upvotes_count", { ascending: false });
    else query = query.order("is_pinned", { ascending: false }).order("replies_count", { ascending: false });

    query = query.limit(50);

    const { data, error: err } = await query;
    if (err) {
      console.error("Error loading group discussions:", err);
    } else if (data) {
      // Fetch author profiles separately
      const authorIds = Array.from(new Set(data.map((d: GroupForumPost) => d.author_id)));
      if (authorIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, full_name")
          .in("id", authorIds);
        const profileMap: Record<string, { full_name: string | null }> = {};
        (profiles || []).forEach((p: { id: string; full_name: string | null }) => {
          profileMap[p.id] = { full_name: p.full_name };
        });

        setPosts(data.map((d: GroupForumPost) => ({
          ...d,
          profiles: profileMap[d.author_id] || { full_name: null },
        })));
      } else {
        setPosts([]);
      }
    }
    setLoading(false);
  }, [groupId, sortBy, supabase]);

  useEffect(() => { loadPosts(); }, [loadPosts]);

  const handleSubmit = async () => {
    if (!userId || !body.trim()) return;
    setSubmitting(true);
    setError(null);

    try {
      const { data: post, error: insertErr } = await supabase
        .from("group_forum_posts")
        .insert({
          group_id: groupId,
          author_id: userId,
          title: title.trim() || null,
          body: body.trim(),
        })
        .select()
        .single();

      if (insertErr) throw insertErr;

      // Save mentions
      if (post) {
        const mentions = extractMentions(body);
        if (mentions.length > 0) {
          await supabase.from("entity_mentions").insert(
            mentions.map((m) => ({
              source_type: "group_forum_post",
              source_id: post.id,
              target_type: m.type,
              target_id: m.id,
              target_uid: m.uid || null,
              mentioned_by: userId,
            }))
          );
        }

        // Trigger translation
        const fields: { text: string; contentType: ContentType; contentId: string }[] = [
          { text: body.trim(), contentType: "group_post_body", contentId: post.id },
        ];
        if (title.trim()) {
          fields.unshift({ text: title.trim(), contentType: "group_post_title", contentId: post.id });
        }
        triggerMultiFieldTranslation(fields, locale);

        // Feed event
        await supabase.from("feed_events").insert({
          user_id: userId,
          event_type: "new_group_discussion",
          entity_type: "group_forum_post",
          entity_id: post.id,
          metadata: {
            title: title.trim() || "(untitled)",
            group_id: groupId,
            group_name: groupName,
            uid: post.uid,
          },
        });
      }

      setTitle("");
      setBody("");
      setShowForm(false);
      loadPosts();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t("groupDiscussions.failedToCreate"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-6 space-y-5">
      {/* Header + New Discussion CTA */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <MessageSquare className="w-5 h-5 text-purple-400" />
          <h3 className="text-sm font-semibold" style={{ color: "var(--foreground)" }}>
            {t("groupDiscussions.title")}
          </h3>
          <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: "var(--muted)", color: "var(--muted-foreground)" }}>
            {posts.length}
          </span>
        </div>
        {isMember && (
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-purple-600 hover:bg-purple-500 text-white transition-colors"
          >
            {showForm ? <X className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
            {showForm ? t("groupDiscussions.cancel") : t("groupDiscussions.new")}
          </button>
        )}
      </div>

      {/* Sort controls */}
      <div className="flex gap-2">
        {(["newest", "most_upvoted", "most_discussed"] as const).map((s) => (
          <button
            key={s}
            onClick={() => setSortBy(s)}
            className={`px-3 py-1.5 text-xs rounded-lg transition-colors ${
              sortBy === s ? "bg-purple-600 text-white" : ""
            }`}
            style={sortBy !== s ? { backgroundColor: "var(--muted)", color: "var(--muted-foreground)" } : undefined}
          >
            {t(`groupDiscussions.sort.${s}`)}
          </button>
        ))}
      </div>

      {/* New Discussion Form */}
      {showForm && (
        <div className="space-y-3 p-4 rounded-lg border" style={{ backgroundColor: "var(--muted)", borderColor: "var(--border)" }}>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={t("groupDiscussions.titlePlaceholder")}
            className="w-full px-4 py-2.5 rounded-lg border text-sm"
            style={{ backgroundColor: "var(--input-bg)", borderColor: "var(--border)", color: "var(--foreground)" }}
          />
          <MentionInput
            value={body}
            onChange={setBody}
            placeholder={t("groupDiscussions.bodyPlaceholder")}
            rows={4}
          />
          {error && <p className="text-xs text-red-400">{error}</p>}
          <div className="flex justify-end">
            <button
              onClick={handleSubmit}
              disabled={submitting || !body.trim()}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
            >
              <Send className="w-3.5 h-3.5" />
              {submitting ? "..." : t("groupDiscussions.post")}
            </button>
          </div>
        </div>
      )}

      {/* Discussions List */}
      {loading ? (
        <div className="flex justify-center py-8">
          <div className="w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : posts.length > 0 ? (
        <div className="space-y-3">
          {posts.map((p) => (
            <GroupDiscussionCard key={p.id} post={p} groupId={groupId} userId={userId} />
          ))}
        </div>
      ) : (
        <div className="text-center py-12 text-sm" style={{ color: "var(--muted-foreground)" }}>
          <MessageSquare className="w-8 h-8 mx-auto mb-3 opacity-40" />
          <p>{t("groupDiscussions.empty")}</p>
          {isMember && <p className="mt-1 text-xs">{t("groupDiscussions.startFirst")}</p>}
        </div>
      )}
    </div>
  );
}

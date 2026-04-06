"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Plus, X } from "lucide-react";
import { useLanguage } from "@/components/language-provider";

const EMOJI_OPTIONS = [
  "💬", "📢", "🌍", "⚖️", "💡", "🔬", "🏛️", "📊",
  "🤝", "🛡️", "🌱", "📚", "🎯", "🔧", "❤️", "🚀",
];

interface NewChannelFormProps {
  userId?: string;
  channels?: { id: string; name: string; emoji: string; depth: number }[];
}

export default function NewChannelForm({ userId, channels = [] }: NewChannelFormProps) {
  const { t } = useLanguage();
  const supabase = createClient();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [emoji, setEmoji] = useState("💬");
  const [parentId, setParentId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  if (!userId) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!name.trim()) {
      setError("Channel name is required");
      return;
    }

    if (name.trim().length < 2 || name.trim().length > 40) {
      setError("Name must be between 2 and 40 characters");
      return;
    }

    setIsLoading(true);
    try {
      const slug = name
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, "")
        .replace(/\s+/g, "-")
        .replace(/-+/g, "-");

      // Check if slug already exists
      const { data: existing } = await supabase
        .from("discussion_channels")
        .select("id")
        .eq("slug", slug)
        .single();

      if (existing) {
        setError("A channel with this name already exists");
        setIsLoading(false);
        return;
      }

      // Get max sort_order
      const { data: maxSort } = await supabase
        .from("discussion_channels")
        .select("sort_order")
        .order("sort_order", { ascending: false })
        .limit(1)
        .single();

      const nextSort = (maxSort?.sort_order ?? 0) + 1;

      // Calculate depth based on parent
      let parentDepth = 0;
      if (parentId) {
        const parent = channels.find((c) => c.id === parentId);
        if (parent) parentDepth = parent.depth + 1;
      }

      const { error: insertError } = await supabase
        .from("discussion_channels")
        .insert([
          {
            name: name.trim(),
            slug,
            description: description.trim() || null,
            emoji,
            color: "blue",
            sort_order: nextSort,
            is_active: true,
            parent_id: parentId,
            depth: parentDepth,
          },
        ]);

      if (insertError) throw insertError;

      // Reset form and close
      setName("");
      setDescription("");
      setEmoji("💬");
      setParentId(null);
      setIsOpen(false);
      router.refresh();
    } catch (err) {
      console.error("Error creating channel:", err);
      setError(t("forum.failedToCreateChannel"));
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="w-full flex items-center gap-2 px-3 py-2 text-xs text-fg-muted hover:text-fg-primary hover:bg-theme-muted/30 rounded-lg transition-colors"
      >
        <Plus className="w-3.5 h-3.5" />
        {t("forum.createChannel")}
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-fg">{t("forum.newChannelTitle")}</h4>
        <button
          type="button"
          onClick={() => {
            setIsOpen(false);
            setError("");
          }}
          className="text-fg-muted hover:text-fg transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Emoji picker */}
      <div>
        <label className="block text-xs text-fg-muted mb-1.5">Icon</label>
        <div className="flex flex-wrap gap-1.5">
          {EMOJI_OPTIONS.map((e) => (
            <button
              key={e}
              type="button"
              onClick={() => setEmoji(e)}
              className={`w-8 h-8 rounded-md text-base flex items-center justify-center transition-all ${
                emoji === e
                  ? "bg-pangea-900/60 border border-pangea-600 scale-110"
                  : "bg-theme-card border border-theme hover:border-theme"
              }`}
            >
              {e}
            </button>
          ))}
        </div>
      </div>

      {/* Name */}
      <div>
        <label className="block text-xs text-fg-muted mb-1.5">Name</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Climate Action"
          maxLength={40}
          className="w-full bg-theme-base border border-theme rounded-lg px-3 py-2 text-sm text-fg placeholder-slate-500 focus:outline-none focus:border-pangea-600 focus:ring-1 focus:ring-pangea-600 transition-colors"
        />
      </div>

      {/* Parent channel (optional) */}
      {channels.length > 0 && (
        <div>
          <label className="block text-xs text-fg-muted mb-1.5">
            Parent topic <span className="text-fg-muted">(optional)</span>
          </label>
          <select
            value={parentId || ""}
            onChange={(e) => setParentId(e.target.value || null)}
            className="w-full bg-theme-base border border-theme rounded-lg px-3 py-2 text-sm text-fg focus:outline-none focus:border-pangea-600 focus:ring-1 focus:ring-pangea-600 transition-colors"
          >
            <option value="">None (top-level)</option>
            {channels.map((ch) => (
              <option key={ch.id} value={ch.id}>
                {"  ".repeat(ch.depth)}{ch.emoji} {ch.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Description */}
      <div>
        <label className="block text-xs text-fg-muted mb-1.5">
          Description <span className="text-fg-muted">(optional)</span>
        </label>
        <input
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="What is this channel about?"
          maxLength={120}
          className="w-full bg-theme-base border border-theme rounded-lg px-3 py-2 text-sm text-fg placeholder-slate-500 focus:outline-none focus:border-pangea-600 focus:ring-1 focus:ring-pangea-600 transition-colors"
        />
      </div>

      {error && <p className="text-fg-danger text-xs">{error}</p>}

      <button
        type="submit"
        disabled={isLoading}
        className="w-full px-3 py-2 bg-pangea-600 hover:bg-pangea-700 disabled:bg-pangea-600/50 text-fg text-sm font-medium rounded-lg transition-colors disabled:cursor-not-allowed"
      >
        {isLoading ? t("common.creating") : t("forum.createChannel")}
      </button>
    </form>
  );
}

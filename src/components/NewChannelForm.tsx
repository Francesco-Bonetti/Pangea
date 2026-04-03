"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Plus, X } from "lucide-react";

const EMOJI_OPTIONS = [
  "💬", "📢", "🌍", "⚖️", "💡", "🔬", "🏛️", "📊",
  "🤝", "🛡️", "🌱", "📚", "🎯", "🔧", "❤️", "🚀",
];

interface NewChannelFormProps {
  userId?: string;
}

export default function NewChannelForm({ userId }: NewChannelFormProps) {
  const supabase = createClient();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [emoji, setEmoji] = useState("💬");
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
          },
        ]);

      if (insertError) throw insertError;

      // Reset form and close
      setName("");
      setDescription("");
      setEmoji("💬");
      setIsOpen(false);
      router.refresh();
    } catch (err) {
      console.error("Error creating channel:", err);
      setError("Failed to create channel. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="w-full flex items-center gap-2 px-3 py-2 text-xs text-slate-500 hover:text-pangea-400 hover:bg-slate-700/30 rounded-lg transition-colors"
      >
        <Plus className="w-3.5 h-3.5" />
        Create Channel
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-slate-200">New Channel</h4>
        <button
          type="button"
          onClick={() => {
            setIsOpen(false);
            setError("");
          }}
          className="text-slate-500 hover:text-slate-300 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Emoji picker */}
      <div>
        <label className="block text-xs text-slate-400 mb-1.5">Icon</label>
        <div className="flex flex-wrap gap-1.5">
          {EMOJI_OPTIONS.map((e) => (
            <button
              key={e}
              type="button"
              onClick={() => setEmoji(e)}
              className={`w-8 h-8 rounded-md text-base flex items-center justify-center transition-all ${
                emoji === e
                  ? "bg-pangea-900/60 border border-pangea-600 scale-110"
                  : "bg-slate-800 border border-slate-700 hover:border-slate-600"
              }`}
            >
              {e}
            </button>
          ))}
        </div>
      </div>

      {/* Name */}
      <div>
        <label className="block text-xs text-slate-400 mb-1.5">Name</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Climate Action"
          maxLength={40}
          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-pangea-600 focus:ring-1 focus:ring-pangea-600 transition-colors"
        />
      </div>

      {/* Description */}
      <div>
        <label className="block text-xs text-slate-400 mb-1.5">
          Description <span className="text-slate-600">(optional)</span>
        </label>
        <input
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="What is this channel about?"
          maxLength={120}
          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-pangea-600 focus:ring-1 focus:ring-pangea-600 transition-colors"
        />
      </div>

      {error && <p className="text-red-400 text-xs">{error}</p>}

      <button
        type="submit"
        disabled={isLoading}
        className="w-full px-3 py-2 bg-pangea-600 hover:bg-pangea-700 disabled:bg-pangea-600/50 text-white text-sm font-medium rounded-lg transition-colors disabled:cursor-not-allowed"
      >
        {isLoading ? "Creating..." : "Create Channel"}
      </button>
    </form>
  );
}

"use client";

import { useState, useEffect } from "react";
import { Hash, X, Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface Tag {
  id: string;
  name: string;
  slug: string;
  usage_count: number;
  created_at: string;
}

interface TagInputProps {
  selectedTags: string[];
  onTagsChange: (tags: string[]) => void;
  maxTags?: number;
}

export default function TagInput({
  selectedTags,
  onTagsChange,
  maxTags = 5,
}: TagInputProps) {
  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [filteredTags, setFilteredTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTagObjects, setSelectedTagObjects] = useState<Tag[]>([]);

  const supabase = createClient();

  // Fetch all tags on mount
  useEffect(() => {
    const fetchTags = async () => {
      try {
        const { data, error } = await supabase
          .from("tags")
          .select("*")
          .order("usage_count", { ascending: false });

        if (error) {
          console.error("Error fetching tags:", error);
          setAllTags([]);
        } else {
          setAllTags(data || []);
        }
      } catch (err) {
        console.error("Error fetching tags:", err);
        setAllTags([]);
      } finally {
        setLoading(false);
      }
    };

    fetchTags();
  }, []);

  // Update selected tag objects when selectedTags prop changes
  useEffect(() => {
    const selected = selectedTags
      .map((tagId) => allTags.find((tag) => tag.id === tagId))
      .filter(Boolean) as Tag[];
    setSelectedTagObjects(selected);
  }, [selectedTags, allTags]);

  // Filter tags based on input
  useEffect(() => {
    if (!inputValue.trim()) {
      setFilteredTags([]);
      return;
    }

    const searchTerm = inputValue.toLowerCase();
    const filtered = allTags.filter(
      (tag) =>
        tag.name.toLowerCase().includes(searchTerm) &&
        !selectedTags.includes(tag.id)
    );
    setFilteredTags(filtered);
  }, [inputValue, allTags, selectedTags]);

  const handleSelectTag = (tag: Tag) => {
    if (selectedTags.length < maxTags) {
      onTagsChange([...selectedTags, tag.id]);
      setInputValue("");
    }
  };

  const handleRemoveTag = (tagId: string) => {
    onTagsChange(selectedTags.filter((id) => id !== tagId));
  };

  const handleCreateTag = async () => {
    const tagName = inputValue.trim();

    if (!tagName) return;
    if (selectedTags.length >= maxTags) return;

    // Check if tag already exists (case-insensitive)
    const existingTag = allTags.find(
      (tag) => tag.name.toLowerCase() === tagName.toLowerCase()
    );

    if (existingTag) {
      handleSelectTag(existingTag);
      return;
    }

    // Create new tag
    try {
      const slug = tagName.toLowerCase().replace(/\s+/g, "-");

      const { data, error } = await supabase
        .from("tags")
        .insert({
          name: tagName,
          slug: slug,
          usage_count: 0,
        })
        .select()
        .single();

      if (error) {
        console.error("Error creating tag:", error);
        return;
      }

      if (data) {
        const newTag: Tag = data;
        setAllTags([newTag, ...allTags]);
        onTagsChange([...selectedTags, newTag.id]);
        setInputValue("");
      }
    } catch (err) {
      console.error("Error creating tag:", err);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleCreateTag();
    }
  };

  return (
    <div className="space-y-3">
      {/* Selected Tags */}
      {selectedTagObjects.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-3">
          {selectedTagObjects.map((tag) => (
            <div
              key={tag.id}
              className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gradient-to-r from-pangea-400/20 to-pangea-500/20 border border-pangea-400/50 text-fg-primary"
            >
              <Hash size={14} />
              <span className="text-sm font-medium">{tag.name}</span>
              <button
                onClick={() => handleRemoveTag(tag.id)}
                className="ml-1 hover:text-pangea-200 transition-colors"
                aria-label={`Remove ${tag.name} tag`}
              >
                <X size={16} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Input Field */}
      <div className="relative">
        <div className="relative">
          <Hash className="absolute left-3 top-1/2 transform -translate-y-1/2 text-fg-muted pointer-events-none" size={18} />
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={selectedTags.length < maxTags ? "Type tag name or press Enter to create..." : "Tag limit reached"}
            disabled={selectedTags.length >= maxTags}
            className="input-field pl-10 pr-10 w-full"
          />
          {inputValue && (
            <button
              onClick={handleCreateTag}
              disabled={selectedTags.length >= maxTags}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-fg-muted hover:text-fg-primary disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              aria-label="Create new tag"
            >
              <Plus size={18} />
            </button>
          )}
        </div>

        {/* Filtered Tags Dropdown */}
        {inputValue && filteredTags.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-2 card border border-theme bg-theme-card rounded-lg shadow-lg z-50">
            <div className="max-h-64 overflow-y-auto">
              {filteredTags.map((tag) => (
                <button
                  key={tag.id}
                  onClick={() => handleSelectTag(tag)}
                  className="w-full text-left px-4 py-2 hover:bg-theme-muted transition-colors border-b border-theme/30 last:border-b-0 flex items-center justify-between group"
                >
                  <div className="flex items-center gap-2">
                    <Hash size={14} className="text-fg-muted" />
                    <div>
                      <p className="text-fg text-sm font-medium">{tag.name}</p>
                      <p className="text-fg-muted text-xs">
                        {tag.usage_count} {tag.usage_count === 1 ? "use" : "uses"}
                      </p>
                    </div>
                  </div>
                  <Plus size={16} className="text-fg-muted group-hover:text-fg-primary transition-colors" />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* No results message */}
        {inputValue &&
          filteredTags.length === 0 &&
          !allTags.some(
            (tag) =>
              tag.name.toLowerCase() === inputValue.toLowerCase()
          ) && (
            <div className="absolute top-full left-0 right-0 mt-2 card border border-theme bg-theme-card rounded-lg shadow-lg z-50 p-3">
              <p className="text-fg-muted text-sm">
                No tags found. Press{" "}
                <kbd className="px-2 py-1 bg-theme-muted rounded text-xs font-mono">
                  Enter
                </kbd>{" "}
                to create "{inputValue}"
              </p>
            </div>
          )}
      </div>

      {/* Tag count indicator */}
      <div className="text-xs text-fg-muted">
        {selectedTags.length} / {maxTags} tags selected
      </div>
    </div>
  );
}

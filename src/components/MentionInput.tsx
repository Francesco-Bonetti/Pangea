"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useLanguage } from "@/components/language-provider";

/** Types for entity search results */
export type EntityResult = {
  entity_type: string;
  entity_id: string;
  entity_uid: string | null;
  entity_name: string;
  entity_emoji: string;
};

/** Mention stored in text as [@Name](uid:CIT-xxx) or [#Name](uid:LAW-xxx) */
export type MentionData = {
  type: string; // citizen, group, law, proposal, discussion, election
  id: string;
  uid: string | null;
  name: string;
};

/** Entity type → color mapping for chips */
const TYPE_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  citizen: { bg: "bg-blue-500/15", text: "text-blue-400", border: "border-blue-500/30" },
  group: { bg: "bg-purple-500/15", text: "text-purple-400", border: "border-purple-500/30" },
  law: { bg: "bg-orange-500/15", text: "text-orange-400", border: "border-orange-500/30" },
  proposal: { bg: "bg-amber-500/15", text: "text-amber-400", border: "border-amber-500/30" },
  discussion: { bg: "bg-cyan-500/15", text: "text-cyan-400", border: "border-cyan-500/30" },
  election: { bg: "bg-emerald-500/15", text: "text-emerald-400", border: "border-emerald-500/30" },
};

/** Entity type → URL path */
function entityUrl(type: string, id: string): string {
  switch (type) {
    case "citizen": return `/citizens/${id}`;
    case "group": return `/groups/${id}`;
    case "law": return `/laws/${id}`;
    case "proposal": return `/proposals/${id}`;
    case "discussion": return `/social/${id}`;
    case "election": return `/elections/${id}`;
    default: return "#";
  }
}

/** Parse mentions from text: [@Name](uid:CIT-xxx) → rendered chips */
export function renderMentions(text: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  // Pattern: [@DisplayName](entity:TYPE:ID:UID)
  const regex = /\[(@|#)([^\]]+)\]\(entity:(\w+):([^:]+):([^)]*)\)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    // Text before the mention
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }

    const [, prefix, name, type, id, uid] = match;
    const colors = TYPE_COLORS[type] || TYPE_COLORS.citizen;

    parts.push(
      <a
        key={`mention-${match.index}`}
        href={entityUrl(type, id)}
        className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium border transition-opacity hover:opacity-80 ${colors.bg} ${colors.text} ${colors.border}`}
      >
        {prefix}{name}
        {uid && <span className="opacity-60 text-[10px]">{uid}</span>}
      </a>
    );

    lastIndex = match.index + match[0].length;
  }

  // Remaining text
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts.length > 0 ? parts : [text];
}

/** Extract raw text from mention-annotated text (for display without chips) */
export function stripMentions(text: string): string {
  return text.replace(/\[(@|#)([^\]]+)\]\(entity:\w+:[^)]+\)/g, "$1$2");
}

/** Extract mentions data from text */
export function extractMentions(text: string): MentionData[] {
  const mentions: MentionData[] = [];
  const regex = /\[(@|#)([^\]]+)\]\(entity:(\w+):([^:]+):([^)]*)\)/g;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    mentions.push({
      type: match[3],
      id: match[4],
      uid: match[5] || null,
      name: match[2],
    });
  }

  return mentions;
}

/** Props for MentionInput */
interface MentionInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
  className?: string;
  disabled?: boolean;
}

/**
 * MentionInput — A textarea with @ and # autocomplete for Pangea entities.
 * Type @ to search people, # to search entities (laws, groups, proposals, etc.)
 */
export default function MentionInput({
  value,
  onChange,
  placeholder,
  rows = 3,
  className = "",
  disabled = false,
}: MentionInputProps) {
  const { t } = useLanguage();
  const supabase = createClient();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [showDropdown, setShowDropdown] = useState(false);
  const [results, setResults] = useState<EntityResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [triggerChar, setTriggerChar] = useState<"@" | "#" | null>(null);
  const [triggerStartPos, setTriggerStartPos] = useState<number>(0);
  const [searchQuery, setSearchQuery] = useState("");

  // Debounced search
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const doSearch = useCallback(async (query: string) => {
    if (query.length < 1) {
      setResults([]);
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.rpc("search_entities", {
        p_query: query,
        p_limit: 8,
      });

      if (error) {
        console.error("Entity search error:", error);
        setResults([]);
      } else {
        // If trigger is @, filter to citizens only; if #, show all others
        let filtered = data || [];
        if (triggerChar === "@") {
          filtered = filtered.filter((r: EntityResult) => r.entity_type === "citizen");
        } else if (triggerChar === "#") {
          filtered = filtered.filter((r: EntityResult) => r.entity_type !== "citizen");
        }
        setResults(filtered);
      }
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, [supabase, triggerChar]);

  // Detect trigger characters
  function handleInput(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const newValue = e.target.value;
    onChange(newValue);

    const cursorPos = e.target.selectionStart || 0;

    // Look backward from cursor to find @ or #
    const textBeforeCursor = newValue.slice(0, cursorPos);
    const atIndex = textBeforeCursor.lastIndexOf("@");
    const hashIndex = textBeforeCursor.lastIndexOf("#");

    // Determine which trigger is closest and valid
    const triggerIndex = Math.max(atIndex, hashIndex);
    const char = atIndex > hashIndex ? "@" : "#";

    if (triggerIndex >= 0) {
      const textAfterTrigger = textBeforeCursor.slice(triggerIndex + 1);
      // Valid trigger: no spaces at start, alphanumeric query
      const match = textAfterTrigger.match(/^([a-zA-Z0-9À-ÿ_-]*)$/);

      if (match) {
        const query = match[1];
        setTriggerChar(char as "@" | "#");
        setTriggerStartPos(triggerIndex);
        setSearchQuery(query);
        setShowDropdown(true);
        setSelectedIndex(0);

        // Debounced search
        if (searchTimeout.current) clearTimeout(searchTimeout.current);
        searchTimeout.current = setTimeout(() => doSearch(query), 200);
        return;
      }
    }

    // No valid trigger found
    setShowDropdown(false);
    setTriggerChar(null);
  }

  // Select a result from the dropdown
  function selectResult(result: EntityResult) {
    if (!textareaRef.current) return;

    const prefix = triggerChar || "#";
    const mentionText = `[${prefix}${result.entity_name}](entity:${result.entity_type}:${result.entity_id}:${result.entity_uid || ""})`;

    // Replace the trigger + query with the mention
    const before = value.slice(0, triggerStartPos);
    const cursorPos = textareaRef.current.selectionStart || value.length;
    const after = value.slice(cursorPos);

    const newValue = before + mentionText + " " + after;
    onChange(newValue);

    setShowDropdown(false);
    setTriggerChar(null);

    // Refocus textarea
    setTimeout(() => {
      if (textareaRef.current) {
        const newCursorPos = before.length + mentionText.length + 1;
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(newCursorPos, newCursorPos);
      }
    }, 10);
  }

  // Keyboard navigation
  function handleKeyDown(e: React.KeyboardEvent) {
    if (!showDropdown || results.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => Math.min(prev + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => Math.max(prev - 1, 0));
    } else if (e.key === "Enter" && results[selectedIndex]) {
      e.preventDefault();
      selectResult(results[selectedIndex]);
    } else if (e.key === "Escape") {
      setShowDropdown(false);
    }
  }

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative">
      <textarea
        ref={textareaRef}
        value={value}
        onChange={handleInput}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        rows={rows}
        disabled={disabled}
        className={className}
      />

      {/* Hint */}
      <div className="flex items-center gap-3 mt-1 text-[10px]" style={{ color: "var(--muted-foreground)" }}>
        <span>@ {t("forum.mentionPeople") || "mention people"}</span>
        <span># {t("forum.mentionEntities") || "mention entities"}</span>
      </div>

      {/* Autocomplete dropdown */}
      {showDropdown && (results.length > 0 || loading) && (
        <div
          ref={dropdownRef}
          className="absolute z-50 w-full max-h-56 overflow-y-auto rounded-lg border shadow-xl mt-1"
          style={{ backgroundColor: "var(--card)", borderColor: "var(--border)" }}
        >
          {loading && results.length === 0 && (
            <div className="px-3 py-2 text-xs" style={{ color: "var(--muted-foreground)" }}>
              {t("forum.searching") || "Searching..."}
            </div>
          )}
          {results.map((r, i) => {
            const colors = TYPE_COLORS[r.entity_type] || TYPE_COLORS.citizen;
            return (
              <button
                key={`${r.entity_type}-${r.entity_id}`}
                onClick={() => selectResult(r)}
                className={`w-full flex items-center gap-2.5 px-3 py-2 text-left text-sm transition-colors ${
                  i === selectedIndex ? "bg-[var(--muted)]" : "hover:bg-[var(--muted)]"
                }`}
                style={{ color: "var(--foreground)" }}
              >
                <span className="text-base shrink-0">{r.entity_emoji}</span>
                <span className="flex-1 min-w-0 truncate">{r.entity_name}</span>
                <span className={`px-1.5 py-0.5 text-[10px] font-semibold rounded ${colors.bg} ${colors.text} uppercase`}>
                  {r.entity_type}
                </span>
                {r.entity_uid && (
                  <span className="text-[10px] font-mono" style={{ color: "var(--muted-foreground)" }}>
                    {r.entity_uid}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

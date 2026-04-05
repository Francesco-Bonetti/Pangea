"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useCallback } from "react";
import { Search } from "lucide-react";
import { useLanguage } from "@/components/language-provider";

interface ForumControlsProps {
  currentSort: string;
  currentSearch: string;
}

const SORT_KEYS = [
  { value: "newest", key: "forumExtra.newest" },
  { value: "most_upvoted", key: "forumExtra.mostUpvoted" },
  { value: "most_discussed", key: "forumExtra.mostDiscussed" },
  { value: "trending", key: "forumExtra.trending" },
] as const;

export default function ForumControls({ currentSort, currentSearch }: ForumControlsProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useLanguage();
  const [searchValue, setSearchValue] = useState(currentSearch);

  const updateParams = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
      router.push(`/social?${params.toString()}`);
    },
    [router, searchParams]
  );

  const handleSortChange = (value: string) => {
    updateParams("sort", value);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateParams("search", searchValue);
  };

  return (
    <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
      {/* Sort pills */}
      <div className="flex gap-2 flex-wrap">
        {SORT_KEYS.map((option) => (
          <button
            key={option.value}
            onClick={() => handleSortChange(option.value)}
            className={`px-3 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
              currentSort === option.value
                ? "bg-pangea-600 text-fg border border-pangea-600"
                : "bg-theme-muted/30 text-fg-muted border border-theme hover:text-fg hover:border-pangea-600/50"
            }`}
          >
            {t(option.key)}
          </button>
        ))}
      </div>

      {/* Search */}
      <form onSubmit={handleSearchSubmit} className="flex-1 relative">
        <input
          type="text"
          placeholder={t("forum.searchPlaceholder")}
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value)}
          className="w-full px-3 py-2 pl-9 bg-theme-base border border-theme rounded-lg text-fg placeholder-slate-400 text-sm focus:outline-none focus:border-pangea-600"
        />
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-fg-muted" />
      </form>
    </div>
  );
}

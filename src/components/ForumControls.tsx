"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useCallback } from "react";
import { Search } from "lucide-react";

interface ForumControlsProps {
  currentSort: string;
  currentSearch: string;
}

export default function ForumControls({ currentSort, currentSearch }: ForumControlsProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
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

  const handleSortChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    updateParams("sort", e.target.value);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateParams("search", searchValue);
  };

  return (
    <div className="flex gap-2 w-full sm:w-auto">
      <select
        value={currentSort}
        onChange={handleSortChange}
        className="px-3 py-2 bg-theme-base border border-theme rounded-lg text-fg text-sm focus:outline-none focus:border-pangea-600"
      >
        <option value="newest">Newest</option>
        <option value="most_upvoted">Most Upvoted</option>
        <option value="most_discussed">Most Discussed</option>
      </select>
      <form onSubmit={handleSearchSubmit} className="flex-1 relative">
        <input
          type="text"
          placeholder="Search discussions..."
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value)}
          className="w-full px-3 py-2 pl-9 bg-theme-base border border-theme rounded-lg text-fg placeholder-slate-400 text-sm focus:outline-none focus:border-pangea-600"
        />
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-fg-muted" />
      </form>
    </div>
  );
}

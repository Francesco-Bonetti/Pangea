"use client";

import { Menu, Search } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { useSidebar } from "@/components/sidebar-provider";
import { useLanguage } from "@/components/language-provider";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";

interface TopHeaderProps {
  userName?: string | null;
  userEmail?: string | null;
  isGuest?: boolean;
}

export default function TopHeader({ userName, isGuest = false }: TopHeaderProps) {
  const { toggle, isMobile } = useSidebar();
  const { t } = useLanguage();
  const [searchQuery, setSearchQuery] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);
  const router = useRouter();

  const initials = userName
    ? userName
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "U";

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (searchQuery.trim().length >= 2) {
      router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
      setSearchQuery("");
    }
  }

  return (
    <header
      className="sticky top-0 z-30 flex items-center gap-3 h-14 px-4 border-b backdrop-blur-md shrink-0"
      style={{
        borderColor: "var(--border)",
        backgroundColor: "color-mix(in srgb, var(--background) 92%, transparent)",
      }}
    >
      {/* Hamburger / Sidebar toggle */}
      <button
        onClick={toggle}
        className="p-2 rounded-lg transition-colors duration-150 hover:bg-[var(--muted)] min-w-[44px] min-h-[44px] flex items-center justify-center"
        style={{ color: "var(--muted-foreground)" }}
        aria-label={isMobile ? "Open menu" : "Toggle sidebar"}
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Search bar — centered, responsive width */}
      <form
        onSubmit={handleSearch}
        className={`
          flex-1 max-w-md mx-auto flex items-center gap-2 px-3 py-1.5 rounded-lg
          transition-all duration-200
          ${searchFocused ? "ring-2 ring-blue-500/40" : ""}
        `}
        style={{
          backgroundColor: "var(--muted)",
          border: "1px solid var(--border)",
        }}
      >
        <Search className="w-4 h-4 shrink-0" style={{ color: "var(--muted-foreground)" }} />
        <input
          type="text"
          placeholder={t("nav.search")}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onFocus={() => setSearchFocused(true)}
          onBlur={() => setSearchFocused(false)}
          className="flex-1 bg-transparent text-sm outline-none placeholder:text-[var(--muted-foreground)]"
          style={{ color: "var(--foreground)" }}
        />
      </form>

      {/* Right actions */}
      <div className="flex items-center gap-1">
        <LanguageSwitcher />
        <ThemeToggle />

        {/* Profile avatar (compact, links to settings or profile) */}
        {!isGuest && (
          <Link
            href="/settings"
            className="relative w-8 h-8 rounded-full bg-gradient-to-br from-blue-600 to-blue-800 border border-blue-500/50 flex items-center justify-center hover:border-blue-400 hover:shadow-lg hover:shadow-blue-500/30 transition-all duration-150 shrink-0"
            title="Settings"
          >
            <span className="text-[10px] font-bold text-fg">{initials}</span>
          </Link>
        )}
      </div>
    </header>
  );
}

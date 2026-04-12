"use client";

import Link from "next/link";
import { useState } from "react";
import { Search, Users, ChevronRight, Globe, MapPin } from "lucide-react";
import { useLanguage } from "@/components/core/language-provider";

export interface GeoArea {
  id: string;
  name: string;
  level: string;
  emoji_flag: string | null;
  iso_alpha2: string | null;
  description: string | null;
  child_count?: number;
  group_count?: number;
}

export interface LinkedGroup {
  id: string;
  uid: string;
  name: string;
  logo_emoji: string | null;
  group_type: string;
}

interface GeographyDirectoryProps {
  areas: GeoArea[];
  linkedGroups?: LinkedGroup[];
  currentArea?: GeoArea | null;
  parentArea?: GeoArea | null;
  /** If true, shows the search bar */
  searchable?: boolean;
}

const LEVEL_LABEL_MAP: Record<string, string> = {
  world: "🌍",
  continent: "🌐",
  sub_region: "🗺️",
  country: "🏳️",
  territory: "📍",
  region: "📌",
  city: "🏙️",
};

const GROUP_TYPE_COLORS: Record<string, string> = {
  jurisdiction: "#2563eb",
  party: "#ef4444",
  community: "#8b5cf6",
  working_group: "#14b8a6",
  igo: "#06b6d4",
  ngo: "#f43f5e",
  religion: "#06b6d4",
  custom: "#a855f7",
};

export default function GeographyDirectory({
  areas,
  linkedGroups = [],
  currentArea = null,
  parentArea = null,
  searchable = true,
}: GeographyDirectoryProps) {
  const { t } = useLanguage();
  const [query, setQuery] = useState("");

  const filtered = query.trim()
    ? areas.filter((a) =>
        a.name.toLowerCase().includes(query.toLowerCase()) ||
        (a.iso_alpha2 ?? "").toLowerCase().includes(query.toLowerCase())
      )
    : areas;

  return (
    <div className="space-y-6">
      {/* Back breadcrumb */}
      {currentArea && (
        <div className="flex items-center gap-2 text-sm">
          <Link
            href="/explore/geography"
            className="text-blue-500 hover:underline"
          >
            {t("geography.title")}
          </Link>
          {parentArea && (
            <>
              <ChevronRight className="w-3 h-3 text-fg opacity-40" />
              <Link
                href={`/explore/geography?area=${parentArea.id}`}
                className="text-blue-500 hover:underline"
              >
                {parentArea.emoji_flag && `${parentArea.emoji_flag} `}{parentArea.name}
              </Link>
            </>
          )}
          <ChevronRight className="w-3 h-3 text-fg opacity-40" />
          <span className="text-fg opacity-70">
            {currentArea.emoji_flag && `${currentArea.emoji_flag} `}{currentArea.name}
          </span>
        </div>
      )}

      {/* Search */}
      {searchable && areas.length > 8 && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 opacity-40" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("geography.searchPlaceholder")}
            className="w-full pl-9 pr-4 py-2.5 rounded-lg text-sm border outline-none focus:ring-2 focus:ring-blue-500/30"
            style={{ backgroundColor: "var(--card)", borderColor: "var(--border)", color: "var(--fg)" }}
          />
        </div>
      )}

      {/* Area cards grid */}
      {filtered.length === 0 ? (
        <p className="text-center text-sm opacity-50 py-8">{t("geography.noResults")}</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map((area) => (
            <Link
              key={area.id}
              href={`/explore/geography?area=${area.id}`}
              className="group rounded-xl p-4 border flex flex-col gap-2 hover:shadow-md transition-all duration-200"
              style={{ backgroundColor: "var(--card)", borderColor: "var(--border)" }}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-2xl shrink-0" aria-hidden>
                    {area.emoji_flag ?? LEVEL_LABEL_MAP[area.level] ?? "🌐"}
                  </span>
                  <div className="min-w-0">
                    <p className="font-semibold text-sm text-fg truncate group-hover:text-blue-500 transition-colors">
                      {area.name}
                    </p>
                    {area.iso_alpha2 && (
                      <p className="text-xs opacity-50 uppercase">{area.iso_alpha2}</p>
                    )}
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 shrink-0 opacity-30 group-hover:opacity-70 group-hover:translate-x-0.5 transition-all" />
              </div>

              {/* Stats row */}
              <div className="flex items-center gap-3 text-xs opacity-60 mt-auto">
                {(area.child_count ?? 0) > 0 && (
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    {area.child_count} sub-areas
                  </span>
                )}
                {(area.group_count ?? 0) > 0 && (
                  <span className="flex items-center gap-1">
                    <Users className="w-3 h-3" />
                    {area.group_count === 1
                      ? t("geography.groups").replace("{count}", String(area.group_count))
                      : t("geography.groups_plural").replace("{count}", String(area.group_count))}
                  </span>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Linked groups section */}
      {linkedGroups.length > 0 && (
        <section className="mt-8">
          <h2 className="text-base font-semibold text-fg mb-3 flex items-center gap-2">
            <Users className="w-4 h-4 opacity-60" />
            {t("geography.linkedGroups")}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {linkedGroups.map((group) => (
              <Link
                key={group.id}
                href={`/groups/${group.uid}`}
                className="flex items-center gap-3 rounded-lg px-4 py-3 border hover:shadow-sm transition-all duration-150"
                style={{ backgroundColor: "var(--card)", borderColor: "var(--border)" }}
              >
                <span className="text-xl shrink-0">{group.logo_emoji ?? "🏛️"}</span>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-fg truncate">{group.name}</p>
                  <p
                    className="text-xs capitalize"
                    style={{ color: GROUP_TYPE_COLORS[group.group_type] ?? "#64748b" }}
                  >
                    {group.group_type.replace("_", " ")}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {linkedGroups.length === 0 && currentArea && (
        <p className="text-sm opacity-50 mt-4">{t("geography.noLinkedGroups")}</p>
      )}
    </div>
  );
}

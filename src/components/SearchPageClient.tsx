"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useSearchParams, useRouter } from "next/navigation";
import AppShell from "@/components/AppShell";
import { useLanguage } from "@/components/language-provider";
import {
  Search,
  FileText,
  BookOpen,
  Users,
  Globe,
  Flag,
  Loader2,
  ArrowLeft,
  Vote,
} from "lucide-react";
import Link from "next/link";

type ResultCategory = "all" | "proposals" | "laws" | "citizens" | "groups" | "elections";

interface SearchResult {
  id: string;
  type: "proposal" | "law" | "citizen" | "group" | "election";
  title: string;
  subtitle?: string;
  status?: string;
  href: string;
}

export default function SearchPageClient() {
  const { t } = useLanguage();
  const searchParams = useSearchParams();
  const router = useRouter();
  const initialQuery = searchParams.get("q") ?? "";

  const [query, setQuery] = useState(initialQuery);
  const [activeFilter, setActiveFilter] = useState<ResultCategory>("all");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [user, setUser] = useState<{ id: string; email?: string } | null>(null);
  const [userName, setUserName] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string>("citizen");

  const supabase = createClient();

  // Load user info
  useEffect(() => {
    async function loadUser() {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (authUser) {
        setUser(authUser);
        const { data: prof } = await supabase
          .from("profiles")
          .select("full_name, role")
          .eq("id", authUser.id)
          .single();
        setUserName(prof?.full_name ?? null);
        setUserRole(prof?.role ?? "citizen");
      }
    }
    loadUser();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const performSearch = useCallback(async (q: string) => {
    if (q.trim().length < 2) {
      setResults([]);
      setSearched(false);
      return;
    }

    setLoading(true);
    setSearched(true);
    const term = `%${q.trim()}%`;
    const allResults: SearchResult[] = [];

    try {
      // Search proposals
      const { data: proposals } = await supabase
        .from("proposals")
        .select("id, title, status")
        .or(`title.ilike.${term},content.ilike.${term}`)
        .neq("status", "draft")
        .limit(20);

      if (proposals) {
        allResults.push(
          ...proposals.map((p: { id: string; title: string; status: string }) => ({
            id: p.id,
            type: "proposal" as const,
            title: p.title,
            subtitle: p.status === "curation" ? "Community Review" : p.status === "active" ? "Voting" : p.status,
            status: p.status,
            href: `/proposals/${p.id}`,
          }))
        );
      }

      // Search laws
      const { data: laws } = await supabase
        .from("laws")
        .select("id, title, code, law_type, is_active")
        .or(`title.ilike.${term},content.ilike.${term},simplified_content.ilike.${term}`)
        .eq("status", "active")
        .limit(20);

      if (laws) {
        allResults.push(
          ...laws.map((l: { id: string; title: string; code: string | null; law_type: string; is_active: boolean }) => ({
            id: l.id,
            type: "law" as const,
            title: l.title,
            subtitle: [l.code, l.law_type === "code" ? "Code" : "Article", l.is_active ? "Active" : "Inactive"].filter(Boolean).join(" · "),
            status: l.is_active ? "active" : "inactive",
            href: `/laws/${l.id}`,
          }))
        );
      }

      // Search citizens (profiles)
      const { data: citizens } = await supabase
        .from("profiles")
        .select("id, full_name, role")
        .ilike("full_name", term)
        .limit(20);

      if (citizens) {
        allResults.push(
          ...citizens.map((c: { id: string; full_name: string | null; role: string }) => ({
            id: c.id,
            type: "citizen" as const,
            title: c.full_name ?? "Citizen",
            subtitle: c.role === "admin" ? "Admin" : c.role === "moderator" ? "Moderator" : "Citizen",
            href: `/citizens/${c.id}`,
          }))
        );
      }

      // Search groups
      const { data: groups } = await supabase
        .from("groups")
        .select("id, name, description, logo_emoji, group_type")
        .or(`name.ilike.${term},description.ilike.${term}`)
        .eq("is_active", true)
        .limit(20);

      if (groups) {
        allResults.push(
          ...groups.map((g: { id: string; name: string; description: string | null; logo_emoji: string | null; group_type: string }) => ({
            id: g.id,
            type: "group" as const,
            title: `${g.logo_emoji ?? "\u{1F3DB}"} ${g.name}`,
            subtitle: g.group_type === "jurisdiction" ? "Jurisdiction" : g.group_type === "party" ? "Party" : g.group_type,
            href: `/groups/${g.id}`,
          }))
        );
      }

      // Search elections
      const { data: elections } = await supabase
        .from("elections")
        .select("id, title, status")
        .ilike("title", term)
        .limit(20);

      if (elections) {
        allResults.push(
          ...elections.map((e: { id: string; title: string; status: string }) => ({
            id: e.id,
            type: "election" as const,
            title: e.title,
            subtitle: e.status,
            status: e.status,
            href: `/elections/${e.id}`,
          }))
        );
      }

      setResults(allResults);
    } catch (err) {
      console.error("Search error:", err);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  // Auto-search on mount if query param exists
  useEffect(() => {
    if (initialQuery.trim().length >= 2) {
      performSearch(initialQuery);
    }
  }, [initialQuery, performSearch]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (query.trim().length >= 2) {
      router.replace(`/search?q=${encodeURIComponent(query.trim())}`);
      performSearch(query);
    }
  }

  const getFiltered = () => {
    if (activeFilter === "all") return results;
    const typeMap: Record<ResultCategory, string> = {
      all: "",
      proposals: "proposal",
      laws: "law",
      citizens: "citizen",
      groups: "group",
      elections: "election",
    };
    return results.filter((r) => r.type === typeMap[activeFilter]);
  };

  const displayResults = getFiltered();

  const counts: Record<string, number> = {
    all: results.length,
    proposals: results.filter((r) => r.type === "proposal").length,
    laws: results.filter((r) => r.type === "law").length,
    citizens: results.filter((r) => r.type === "citizen").length,
    groups: results.filter((r) => r.type === "group").length,
    elections: results.filter((r) => r.type === "election").length,
  };

  const typeIcon = (type: string) => {
    switch (type) {
      case "proposal": return <FileText className="w-4 h-4 text-blue-400" />;
      case "law": return <BookOpen className="w-4 h-4 text-emerald-400" />;
      case "citizen": return <Users className="w-4 h-4 text-purple-400" />;
      case "group": return <Flag className="w-4 h-4 text-amber-400" />;
      case "election": return <Vote className="w-4 h-4 text-rose-400" />;
      default: return <Search className="w-4 h-4 text-fg-muted" />;
    }
  };

  const filters: { key: ResultCategory; label: string }[] = [
    { key: "all", label: "All" },
    { key: "proposals", label: "Proposals" },
    { key: "laws", label: "Laws" },
    { key: "citizens", label: "Citizens" },
    { key: "groups", label: "Groups" },
    { key: "elections", label: "Elections" },
  ];

  return (
    <AppShell userEmail={user?.email} userName={userName} userRole={userRole}>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Link
            href="/dashboard"
            className="shrink-0 p-2 rounded-lg text-fg-muted hover:text-fg hover:bg-theme-card transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-2xl font-bold text-fg flex items-center gap-2">
            <Search className="w-6 h-6 text-fg-primary" />
            Search
          </h1>
        </div>

        {/* Search input */}
        <form onSubmit={handleSubmit} className="mb-6">
          <div className="relative">
            <Search className="w-5 h-5 text-fg-muted absolute left-4 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder={t("search.placeholder")}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="input-field pl-12 pr-4 py-3 text-base"
              autoFocus
            />
            {loading && (
              <Loader2 className="w-5 h-5 text-fg-primary absolute right-4 top-1/2 -translate-y-1/2 animate-spin" />
            )}
          </div>
          <p className="text-xs text-fg-muted mt-2">
            Type at least 2 characters to search across the entire platform
          </p>
        </form>

        {/* Filter tabs */}
        {searched && results.length > 0 && (
          <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
            {filters
              .filter((f) => f.key === "all" || counts[f.key] > 0)
              .map((f) => (
                <button
                  key={f.key}
                  onClick={() => setActiveFilter(f.key)}
                  className={`shrink-0 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                    activeFilter === f.key
                      ? "bg-fg-primary/20 text-fg-primary border border-fg-primary/30"
                      : "text-fg-muted hover:text-fg hover:bg-theme-card border border-transparent"
                  }`}
                >
                  {f.label}
                  {counts[f.key] > 0 && (
                    <span className="ml-1.5 text-xs opacity-70">{counts[f.key]}</span>
                  )}
                </button>
              ))}
          </div>
        )}

        {/* Results */}
        {loading && !results.length ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 text-fg-primary animate-spin" />
          </div>
        ) : searched && displayResults.length === 0 ? (
          <div className="card p-8 text-center">
            <Search className="w-12 h-12 text-fg-muted mx-auto mb-3" />
            <p className="text-fg-muted">
              No results found for &quot;{query}&quot;
            </p>
            <p className="text-xs text-fg-muted mt-1">
              Try different keywords or check the spelling
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {displayResults.map((r) => (
              <Link
                key={`${r.type}-${r.id}`}
                href={r.href}
                className="card p-4 flex items-center gap-3 hover:border-fg-primary/30 transition-all group overflow-hidden"
              >
                <div className="shrink-0 w-10 h-10 rounded-lg bg-theme-card flex items-center justify-center border border-theme">
                  {typeIcon(r.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-fg group-hover:text-fg-primary transition-colors truncate">
                    {r.title}
                  </p>
                  {r.subtitle && (
                    <p className="text-xs text-fg-muted mt-0.5 truncate">
                      {r.subtitle}
                    </p>
                  )}
                </div>
                <span className="shrink-0 text-[10px] uppercase tracking-wider text-fg-muted bg-theme-card px-2 py-1 rounded-full">
                  {r.type}
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}

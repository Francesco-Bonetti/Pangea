"use client";

import { createClient } from "@/lib/supabase/client";
import { useEffect, useState, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import AppShell from "@/components/core/AppShell";
import GroupTree from "@/components/governance/GroupTree";
import {
  FolderTree,
  Plus,
  Search,
  X,
  AlertCircle,
  Map,
  Flag,
  Globe,
  Briefcase,
  Layers,
  List,
  TreePine,
} from "lucide-react";
import type { Profile, GroupTreeNode, GroupType } from "@/lib/types";
import { useLanguage } from "@/components/core/language-provider";
import { triggerTranslation } from "@/lib/translate";

const PANGEA_ROOT_ID = "00000000-0000-0000-0000-000000000001";

/* Wrapper with Suspense for useSearchParams */
export default function GroupsPageWrapper() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center py-16"><div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" /></div>}>
      <GroupsPageInner />
    </Suspense>
  );
}

const GROUP_TYPES: { value: GroupType; emoji: string; labelKey: string }[] = [
  { value: "jurisdiction", emoji: "🏛️", labelKey: "groups.type.jurisdiction" },
  { value: "party", emoji: "🗳️", labelKey: "groups.type.party" },
  { value: "community", emoji: "🌍", labelKey: "groups.type.community" },
  { value: "working_group", emoji: "💼", labelKey: "groups.type.working_group" },
  { value: "religion", emoji: "🕊️", labelKey: "groups.type.religion" },
  { value: "custom", emoji: "✨", labelKey: "groups.type.custom" },
  { value: "igo", emoji: "🌐", labelKey: "groups.type.igo" },
  { value: "ngo", emoji: "🤝", labelKey: "groups.type.ngo" },
];

const EMOJI_OPTIONS = [
  "🏛️", "⚖️", "🌍", "🔥", "🕊️", "🌱", "💡", "🛡️", "🎯", "⭐",
  "🦁", "🌊", "🏔️", "🔱", "🎪", "🗽", "🌿", "🔍", "💎", "🏙️",
];

function GroupsPageInner() {
  const supabase = createClient();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t, locale } = useLanguage();

  // Read URL params for pre-filtering
  const urlType = searchParams.get("type") as GroupType | null;
  const urlCreate = searchParams.get("create") === "1";

  // Auth state
  const [user, setUser] = useState<{ id: string; email?: string } | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isGuest, setIsGuest] = useState(false);

  // Tree data
  const [treeNodes, setTreeNodes] = useState<GroupTreeNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"tree" | "list">("tree");
  const [filterType, setFilterType] = useState<GroupType | "all">(
    urlType && ["jurisdiction", "party", "community", "working_group", "custom", "religion", "igo", "ngo"].includes(urlType)
      ? urlType
      : "all"
  );

  // Sync filterType with URL ?type= param on navigation
  useEffect(() => {
    const newType = urlType && ["jurisdiction", "party", "community", "working_group", "custom", "religion", "igo", "ngo"].includes(urlType)
      ? urlType
      : "all";
    setFilterType(newType);
  }, [urlType]);

  // Create group modal
  const [showCreate, setShowCreate] = useState(false);
  const [newGroup, setNewGroup] = useState({
    name: "",
    description: "",
    group_type: "community" as GroupType,
    logo_emoji: "🌍",
    manifesto: "",
    jurisdiction_type: "virtual" as "virtual" | "geographic",
    location_name: "",
    parent_group_id: PANGEA_ROOT_ID,
  });
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Navbar
  const [pendingDelegations, setPendingDelegations] = useState(0);

  const loadData = useCallback(async () => {
    const { data: { user: u } } = await supabase.auth.getUser();
    setUser(u);
    setIsGuest(!u);

    if (u) {
      const { data: prof } = await supabase.from("profiles").select("*").eq("id", u.id).single();
      setProfile(prof);

      const { count } = await supabase
        .from("delegations")
        .select("*", { count: "exact", head: true })
        .eq("delegate_id", u.id)
        .eq("status", "pending");
      setPendingDelegations(count || 0);
    }

    // Load full tree via RPC
    const { data: tree, error: treeErr } = await supabase.rpc("get_group_tree", { p_root_id: null });

    if (treeErr) {
      console.error("Error loading group tree:", treeErr);
      setError(treeErr.message);
    } else if (tree) {
      setTreeNodes(tree as GroupTreeNode[]);
    }

    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // Auto-open create modal if ?create=1 and user is logged in
  useEffect(() => {
    if (urlCreate && !isGuest && !loading) {
      setShowCreate(true);
      // Pre-select the type from URL if provided
      if (urlType && ["jurisdiction", "party", "community", "working_group", "custom", "religion", "igo", "ngo"].includes(urlType)) {
        setNewGroup((p) => ({ ...p, group_type: urlType }));
      }
    }
  }, [urlCreate, isGuest, loading, urlType]);

  // Filtered nodes
  const filteredNodes = treeNodes.filter((n) => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (!n.name.toLowerCase().includes(q) && !(n.description || "").toLowerCase().includes(q) && !(n.uid || "").toLowerCase().includes(q)) {
        return false;
      }
    }
    if (filterType !== "all" && n.group_type !== filterType) return false;
    return true;
  });

  // Create group handler
  async function handleCreate() {
    if (!newGroup.name.trim()) {
      setError(t("groups.errors.nameRequired"));
      return;
    }
    setCreating(true);
    setError(null);

    try {
      const { data, error: rpcErr } = await supabase.rpc("create_group", {
        p_name: newGroup.name.trim(),
        p_description: newGroup.description.trim() || null,
        p_group_type: newGroup.group_type,
        p_logo_emoji: newGroup.logo_emoji,
        p_parent_group_id: newGroup.parent_group_id || PANGEA_ROOT_ID,
        p_manifesto: newGroup.group_type === "party" ? newGroup.manifesto.trim() || null : null,
        p_jurisdiction_type: newGroup.group_type === "jurisdiction" ? newGroup.jurisdiction_type : null,
        p_location_name: newGroup.group_type === "jurisdiction" && newGroup.jurisdiction_type === "geographic" ? newGroup.location_name.trim() || null : null,
      });

      if (rpcErr) throw rpcErr;

      // Trigger translation
      if (newGroup.description.trim()) {
        triggerTranslation(newGroup.description.trim(), "party_description", data);
      }

      setShowCreate(false);
      setNewGroup({
        name: "", description: "", group_type: "community", logo_emoji: "🌍",
        manifesto: "", jurisdiction_type: "virtual", location_name: "", parent_group_id: PANGEA_ROOT_ID,
      });
      router.push(`/groups/${data}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t("groups.errors.failedToCreate"));
    } finally {
      setCreating(false);
    }
  }

  // Parent group options (for create modal)
  const parentOptions = treeNodes.filter((n) => n.id !== PANGEA_ROOT_ID || n.depth === 0);

  return (
    <AppShell
      userEmail={user?.email}
      userName={profile?.full_name}
      userRole={profile?.role}
      isGuest={isGuest}
      pendingDelegations={pendingDelegations}
    >
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        {/* ── Header ── */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-3" style={{ color: "var(--foreground)" }}>
              <FolderTree className="w-7 h-7 text-purple-400" />
              {t("groups.title")}
            </h1>
            <p className="mt-1 text-sm" style={{ color: "var(--muted-foreground)" }}>
              {t("groups.subtitle")}
            </p>
          </div>

          {!isGuest && (
            <button
              onClick={() => setShowCreate(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-500 hover:to-purple-600 text-white text-sm font-medium rounded-lg transition-all duration-150 hover:shadow-lg hover:shadow-purple-600/20 active:scale-[0.98] shrink-0"
            >
              <Plus className="w-4 h-4" />
              {t("groups.createNew")}
            </button>
          )}
        </div>

        {/* ── Search + filters ── */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "var(--muted-foreground)" }} />
            <input
              type="text"
              placeholder={t("groups.searchPlaceholder")}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-10 py-2.5 rounded-lg border text-sm transition-colors"
              style={{
                backgroundColor: "var(--input-bg)",
                borderColor: "var(--border)",
                color: "var(--foreground)",
              }}
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2">
                <X className="w-4 h-4" style={{ color: "var(--muted-foreground)" }} />
              </button>
            )}
          </div>

          {/* Type filter */}
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as GroupType | "all")}
            className="px-3 py-2.5 rounded-lg border text-sm"
            style={{
              backgroundColor: "var(--card)",
              borderColor: "var(--border)",
              color: "var(--foreground)",
              colorScheme: "dark",
            }}
          >
            <option value="all">{t("groups.filter.allTypes")}</option>
            {GROUP_TYPES.map((gt) => (
              <option key={gt.value} value={gt.value}>
                {gt.emoji} {t(gt.labelKey)}
              </option>
            ))}
          </select>

          {/* View mode toggle */}
          <div className="flex rounded-lg border overflow-hidden shrink-0" style={{ borderColor: "var(--border)" }}>
            <button
              onClick={() => setViewMode("tree")}
              className={`p-2.5 transition-colors ${viewMode === "tree" ? "bg-purple-600 text-white" : ""}`}
              style={viewMode !== "tree" ? { backgroundColor: "var(--input-bg)", color: "var(--muted-foreground)" } : undefined}
              title={t("groups.view.tree")}
            >
              <TreePine className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`p-2.5 transition-colors ${viewMode === "list" ? "bg-purple-600 text-white" : ""}`}
              style={viewMode !== "list" ? { backgroundColor: "var(--input-bg)", color: "var(--muted-foreground)" } : undefined}
              title={t("groups.view.list")}
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ── Tree / List view ── */}
        <div
          className="rounded-xl border overflow-hidden"
          style={{ backgroundColor: "var(--card)", borderColor: "var(--border)" }}
        >
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : viewMode === "tree" ? (
            <div className="py-2">
              <GroupTree nodes={filteredNodes} defaultExpanded />
            </div>
          ) : (
            /* List view */
            <div className="divide-y" style={{ borderColor: "var(--border)" }}>
              {filteredNodes
                .filter((n) => n.id !== PANGEA_ROOT_ID)
                .map((node) => {
                  const typeConfig: Record<string, { icon: typeof Globe; color: string; bg: string }> = {
                    jurisdiction: { icon: Map, color: "text-emerald-400", bg: "bg-emerald-500/15" },
                    party: { icon: Flag, color: "text-purple-400", bg: "bg-purple-500/15" },
                    community: { icon: Globe, color: "text-blue-400", bg: "bg-blue-500/15" },
                    working_group: { icon: Briefcase, color: "text-amber-400", bg: "bg-amber-500/15" },
                    custom: { icon: Layers, color: "text-slate-400", bg: "bg-slate-500/15" },
                    igo: { icon: Globe, color: "text-cyan-400", bg: "bg-cyan-500/15" },
                    ngo: { icon: Globe, color: "text-rose-400", bg: "bg-rose-500/15" },
                  };
                  const cfg = typeConfig[node.group_type] || typeConfig.custom;

                  return (
                    <a
                      key={node.id}
                      href={`/groups/${node.id}`}
                      className="flex items-center gap-4 px-5 py-4 transition-colors hover:bg-[var(--muted)]"
                    >
                      <span className="text-2xl shrink-0">{node.logo_emoji}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate" style={{ color: "var(--foreground)" }}>
                          {node.name}
                        </p>
                        {node.description && (
                          <p className="text-xs truncate mt-0.5" style={{ color: "var(--muted-foreground)" }}>
                            {node.description}
                          </p>
                        )}
                      </div>
                      <span className={`px-2 py-0.5 text-[10px] font-semibold rounded-full ${cfg.bg} ${cfg.color} uppercase tracking-wider shrink-0`}>
                        {t(`groups.type.${node.group_type}`)}
                      </span>
                      <span className="text-xs" style={{ color: "var(--muted-foreground)" }}>
                        {node.member_count} {t("groups.members")}
                      </span>
                    </a>
                  );
                })}
            </div>
          )}
        </div>

        {/* ── Create Group Modal ── */}
        {showCreate && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div
              className="w-full max-w-lg rounded-xl border shadow-2xl max-h-[90vh] overflow-y-auto"
              style={{ backgroundColor: "var(--card)", borderColor: "var(--border)" }}
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-lg font-bold" style={{ color: "var(--foreground)" }}>
                    {t("groups.createNew")}
                  </h2>
                  <button onClick={() => setShowCreate(false)} className="p-1 rounded-lg hover:bg-[var(--muted)]">
                    <X className="w-5 h-5" style={{ color: "var(--muted-foreground)" }} />
                  </button>
                </div>

                {error && (
                  <div className="flex items-center gap-2 px-4 py-3 mb-4 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
                    <AlertCircle className="w-4 h-4 shrink-0" /> {error}
                  </div>
                )}

                {/* Group type selection */}
                <label className="block text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--muted-foreground)" }}>
                  {t("groups.form.type")}
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-5">
                  {GROUP_TYPES.map((gt) => (
                    <button
                      key={gt.value}
                      onClick={() => setNewGroup((p) => ({ ...p, group_type: gt.value }))}
                      className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border text-sm font-medium transition-all ${
                        newGroup.group_type === gt.value
                          ? "border-purple-500 bg-purple-500/10 text-purple-300"
                          : "hover:bg-[var(--muted)]"
                      }`}
                      style={
                        newGroup.group_type !== gt.value
                          ? { borderColor: "var(--border)", color: "var(--foreground)" }
                          : undefined
                      }
                    >
                      <span>{gt.emoji}</span>
                      {t(gt.labelKey)}
                    </button>
                  ))}
                </div>

                {/* Emoji picker */}
                <label className="block text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--muted-foreground)" }}>
                  {t("groups.form.icon")}
                </label>
                <div className="flex flex-wrap gap-2 mb-5">
                  {EMOJI_OPTIONS.map((e) => (
                    <button
                      key={e}
                      onClick={() => setNewGroup((p) => ({ ...p, logo_emoji: e }))}
                      className={`w-10 h-10 rounded-lg border text-lg flex items-center justify-center transition-all ${
                        newGroup.logo_emoji === e ? "border-purple-500 bg-purple-500/10 scale-110" : "hover:bg-[var(--muted)]"
                      }`}
                      style={newGroup.logo_emoji !== e ? { borderColor: "var(--border)" } : undefined}
                    >
                      {e}
                    </button>
                  ))}
                </div>

                {/* Name */}
                <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: "var(--muted-foreground)" }}>
                  {t("groups.form.name")} *
                </label>
                <input
                  type="text"
                  value={newGroup.name}
                  onChange={(e) => setNewGroup((p) => ({ ...p, name: e.target.value }))}
                  placeholder={t("groups.form.namePlaceholder")}
                  className="w-full px-4 py-2.5 rounded-lg border text-sm mb-4"
                  style={{ backgroundColor: "var(--input-bg)", borderColor: "var(--border)", color: "var(--foreground)" }}
                />

                {/* Description */}
                <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: "var(--muted-foreground)" }}>
                  {t("groups.form.description")}
                </label>
                <textarea
                  value={newGroup.description}
                  onChange={(e) => setNewGroup((p) => ({ ...p, description: e.target.value }))}
                  placeholder={t("groups.form.descriptionPlaceholder")}
                  rows={3}
                  className="w-full px-4 py-2.5 rounded-lg border text-sm mb-4 resize-none"
                  style={{ backgroundColor: "var(--input-bg)", borderColor: "var(--border)", color: "var(--foreground)" }}
                />

                {/* Parent group */}
                <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: "var(--muted-foreground)" }}>
                  {t("groups.form.parentGroup")}
                </label>
                <select
                  value={newGroup.parent_group_id}
                  onChange={(e) => setNewGroup((p) => ({ ...p, parent_group_id: e.target.value }))}
                  className="w-full px-4 py-2.5 rounded-lg border text-sm mb-4"
                  style={{ backgroundColor: "var(--input-bg)", borderColor: "var(--border)", color: "var(--foreground)" }}
                >
                  <option value={PANGEA_ROOT_ID}>🌍 Pangea ({t("groups.root")})</option>
                  {treeNodes
                    .filter((n) => n.id !== PANGEA_ROOT_ID)
                    .map((n) => (
                      <option key={n.id} value={n.id}>
                        {"  ".repeat(n.depth)} {n.logo_emoji} {n.name}
                      </option>
                    ))}
                </select>

                {/* Party-specific: Manifesto */}
                {newGroup.group_type === "party" && (
                  <>
                    <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: "var(--muted-foreground)" }}>
                      {t("groups.form.manifesto")}
                    </label>
                    <textarea
                      value={newGroup.manifesto}
                      onChange={(e) => setNewGroup((p) => ({ ...p, manifesto: e.target.value }))}
                      placeholder={t("groups.form.manifestoPlaceholder")}
                      rows={4}
                      className="w-full px-4 py-2.5 rounded-lg border text-sm mb-4 resize-none"
                      style={{ backgroundColor: "var(--input-bg)", borderColor: "var(--border)", color: "var(--foreground)" }}
                    />
                  </>
                )}

                {/* Jurisdiction-specific */}
                {newGroup.group_type === "jurisdiction" && (
                  <>
                    <label className="block text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--muted-foreground)" }}>
                      {t("groups.form.jurisdictionType")}
                    </label>
                    <div className="flex gap-3 mb-4">
                      {(["virtual", "geographic"] as const).map((jt) => (
                        <button
                          key={jt}
                          onClick={() => setNewGroup((p) => ({ ...p, jurisdiction_type: jt }))}
                          className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg border text-sm font-medium transition-all ${
                            newGroup.jurisdiction_type === jt
                              ? "border-emerald-500 bg-emerald-500/10 text-emerald-300"
                              : "hover:bg-[var(--muted)]"
                          }`}
                          style={
                            newGroup.jurisdiction_type !== jt
                              ? { borderColor: "var(--border)", color: "var(--foreground)" }
                              : undefined
                          }
                        >
                          {jt === "virtual" ? <Globe className="w-4 h-4" /> : <Map className="w-4 h-4" />}
                          {t(`groups.form.jurisdictionType.${jt}`)}
                        </button>
                      ))}
                    </div>

                    {newGroup.jurisdiction_type === "geographic" && (
                      <>
                        <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: "var(--muted-foreground)" }}>
                          {t("groups.form.location")}
                        </label>
                        <input
                          type="text"
                          value={newGroup.location_name}
                          onChange={(e) => setNewGroup((p) => ({ ...p, location_name: e.target.value }))}
                          placeholder={t("groups.form.locationPlaceholder")}
                          className="w-full px-4 py-2.5 rounded-lg border text-sm mb-4"
                          style={{ backgroundColor: "var(--input-bg)", borderColor: "var(--border)", color: "var(--foreground)" }}
                        />
                      </>
                    )}
                  </>
                )}

                {/* Submit */}
                <button
                  onClick={handleCreate}
                  disabled={creating || !newGroup.name.trim()}
                  className="w-full py-3 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-500 hover:to-purple-600 text-white text-sm font-semibold rounded-lg transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {creating ? t("groups.creating") : t("groups.createNew")}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}

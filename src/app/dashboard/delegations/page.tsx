"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import AppShell from "@/components/core/AppShell";
import { useLanguage } from "@/components/core/language-provider";
import type { Category, Profile } from "@/lib/types";
import PrivacyName from "@/components/ui/PrivacyName";
import {
  ArrowLeft,
  Users,
  Search,
  Plus,
  X,
  ChevronRight,
  AlertTriangle,
  Loader2,
  Globe,
  Tag,
  Trash2,
  CheckCircle2,
  XCircle,
  Clock,
  BarChart3,
  GitBranch,
  ArrowRightLeft,
  Shield,
  Star,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

// ── RPC row types ──────────────────────────────────────────────────────────────

type MyDelegationRow = {
  delegation_id: string;
  delegate_id: string | null;
  delegate_username: string | null;
  delegate_display_name: string | null;
  delegate_group_id: string | null;
  delegate_group_name: string | null;
  category_id: string | null;
  category_name: string | null;
  is_transitive: boolean;
  status: string;
  created_at: string;
  confirmed_at: string | null;
};

type ReceivedDelegationRow = {
  delegation_id: string;
  delegator_id: string;
  delegator_username: string | null;
  delegator_display_name: string | null;
  via_group_id: string | null;
  via_group_name: string | null;
  category_id: string | null;
  category_name: string | null;
  is_transitive: boolean;
  status: string;
  created_at: string;
  confirmed_at: string | null;
  voting_weight: number;
};

type Tab = "given" | "received" | "stats";

// ── Component ──────────────────────────────────────────────────────────────────

export default function DelegationsPage() {
  const { t } = useLanguage();
  const [user, setUser] = useState<{ id: string; email?: string } | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [myDelegations, setMyDelegations] = useState<MyDelegationRow[]>([]);
  const [receivedDelegations, setReceivedDelegations] = useState<ReceivedDelegationRow[]>([]);
  const [totalWeight, setTotalWeight] = useState<number>(1);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>("given");

  // Form state
  const [showForm, setShowForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Pick<Profile, "id" | "full_name">[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedDelegate, setSelectedDelegate] = useState<Pick<Profile, "id" | "full_name"> | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [isTransitive, setIsTransitive] = useState<boolean>(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const supabase = createClient();
  const router = useRouter();

  // ── Load data ────────────────────────────────────────────────────────────────

  const loadData = useCallback(async () => {
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) { router.push("/auth"); return; }
    setUser(authUser);

    const [profileRes, catRes, givenRes, receivedRes, weightRes] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", authUser.id).single(),
      supabase.from("categories").select("*").order("name").limit(100),
      supabase.rpc("get_my_delegations"),
      supabase.rpc("get_delegations_to_me"),
      supabase.rpc("resolve_voting_weight", {
        p_voter_id: authUser.id,
        p_proposal_id: null,
        p_category_id: null,
      }),
    ]);

    setProfile(profileRes.data);
    setCategories(catRes.data ?? []);
    setMyDelegations((givenRes.data as MyDelegationRow[]) ?? []);
    setReceivedDelegations((receivedRes.data as ReceivedDelegationRow[]) ?? []);
    setTotalWeight((weightRes.data as number) ?? 1);
    setLoading(false);
  }, [supabase, router]);

  useEffect(() => { loadData(); }, [loadData]);

  // ── Search citizens ──────────────────────────────────────────────────────────

  async function searchCitizens(query: string) {
    setSearchQuery(query);
    if (query.trim().length < 2) { setSearchResults([]); return; }
    setSearching(true);
    const { data } = await supabase
      .from("profiles")
      .select("id, full_name")
      .ilike("full_name", `%${query.trim()}%`)
      .neq("id", user?.id ?? "")
      .eq("allow_delegations", true)
      .limit(10);
    setSearchResults(data ?? []);
    setSearching(false);
  }

  // ── Create delegation (via RPC) ──────────────────────────────────────────────

  async function createDelegation() {
    if (!selectedDelegate || !user) return;
    setSaving(true);
    setError(null);
    try {
      const { error: rpcError } = await supabase.rpc("create_delegation", {
        p_delegate_id: selectedDelegate.id,
        p_delegate_group_id: null,
        p_category_id: selectedCategory || null,
        p_is_transitive: isTransitive,
      });
      if (rpcError) {
        const msg = rpcError.message ?? "";
        if (msg.includes("cycle_detected")) setError(t("delegations.cycleError"));
        else if (msg.includes("delegation_already_exists")) setError(t("delegations.duplicateError"));
        else if (msg.includes("delegate_not_accepting")) setError(t("delegations.delegateNotAccepting"));
        else if (msg.includes("no_self_delegation")) setError(t("delegations.noSelfDelegation"));
        else setError(msg || t("delegations.errorCreating"));
        return;
      }
      setShowForm(false);
      setSelectedDelegate(null);
      setSelectedCategory("");
      setIsTransitive(true);
      setSearchQuery("");
      setSearchResults([]);
      await loadData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t("delegations.errorCreating"));
    } finally {
      setSaving(false);
    }
  }

  // ── Accept / Reject / Revoke (via RPCs) ──────────────────────────────────────

  async function acceptDelegation(delegationId: string) {
    setError(null);
    setProcessingId(delegationId);
    const { error: err } = await supabase.rpc("accept_delegation", { p_delegation_id: delegationId });
    if (err) {
      const msg = err.message ?? "";
      if (msg.includes("cycle_detected")) setError(t("delegations.cycleError"));
      else setError(t("delegations.failedAccept") + ": " + msg);
    } else {
      await loadData();
    }
    setProcessingId(null);
  }

  async function rejectDelegation(delegationId: string) {
    setError(null);
    setProcessingId(delegationId);
    const { error: err } = await supabase.rpc("reject_delegation", { p_delegation_id: delegationId });
    if (err) setError(t("delegations.failedReject") + ": " + err.message);
    else await loadData();
    setProcessingId(null);
  }

  async function revokeDelegation(delegationId: string) {
    setError(null);
    setProcessingId(delegationId);
    const { error: err } = await supabase.rpc("revoke_delegation", { p_delegation_id: delegationId });
    if (err) setError(t("delegations.failedRevoke") + ": " + err.message);
    else await loadData();
    setProcessingId(null);
  }

  // ── Status badge ─────────────────────────────────────────────────────────────

  function StatusBadge({ status }: { status: string }) {
    if (status === "accepted") {
      return (
        <span className="shrink-0 text-xs px-2 py-1 rounded-full font-medium whitespace-nowrap text-fg-success bg-success-tint border border-theme">
          {t("delegations.statusAccepted")}
        </span>
      );
    }
    if (status === "rejected") {
      return (
        <span className="shrink-0 text-xs px-2 py-1 rounded-full font-medium whitespace-nowrap text-fg-danger bg-danger-tint border border-theme">
          {t("delegations.statusRejected")}
        </span>
      );
    }
    // pending
    return (
      <span className="shrink-0 text-xs px-2 py-1 rounded-full font-medium whitespace-nowrap text-amber-300 bg-warning-tint border border-theme flex items-center gap-1">
        <Clock className="w-3 h-3" />
        {t("delegations.statusPending")}
      </span>
    );
  }

  // ── Helpers ───────────────────────────────────────────────────────────────────

  function delegateName(d: MyDelegationRow): string {
    if (d.delegate_group_id) return d.delegate_group_name ?? t("common.group");
    return d.delegate_display_name ?? d.delegate_username ?? t("common.citizen");
  }

  function delegatorName(d: ReceivedDelegationRow): string {
    return d.delegator_display_name ?? d.delegator_username ?? t("common.citizen");
  }

  // ── Stats helpers ─────────────────────────────────────────────────────────────

  const pendingReceived = receivedDelegations.filter(d => d.status === "pending");
  const acceptedReceived = receivedDelegations.filter(d => d.status === "accepted");

  // Group accepted received by category for breakdown
  const categoryBreakdown = acceptedReceived.reduce<Record<string, { name: string | null; count: number; weight: number }>>((acc, d) => {
    const key = d.category_id ?? "__global__";
    if (!acc[key]) acc[key] = { name: d.category_name, count: 0, weight: d.voting_weight };
    acc[key].count += 1;
    acc[key].weight = d.voting_weight; // weight is per category, same for all same-category rows
    return acc;
  }, {});

  // ── Loading ──────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <AppShell section="core" sectionName="delegations" userEmail={user?.email} userName={profile?.full_name} userRole={profile?.role}>
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="w-8 h-8 text-fg-primary animate-spin" />
        </div>
      </AppShell>
    );
  }

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <AppShell section="core" sectionName="delegations" userEmail={user?.email} userName={profile?.full_name} userRole={profile?.role}>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Header */}
        <div className="flex items-center gap-3 mb-6 overflow-hidden">
          <Link href="/dashboard" className="shrink-0 p-2 rounded-lg text-fg-muted hover:text-fg hover:bg-theme-card transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold text-fg flex items-center gap-2">
              <Users className="w-5 h-5 sm:w-6 sm:h-6 text-fg-primary shrink-0" />
              <span className="truncate">{t("delegations.infoTitle")}</span>
            </h1>
            <p className="text-xs sm:text-sm text-fg-muted mt-0.5 truncate">
              {t("delegations.subtitle")}
            </p>
          </div>
          {activeTab === "given" && (
            <button
              onClick={() => setShowForm(!showForm)}
              className="shrink-0 btn-primary flex items-center gap-2 text-sm py-2"
            >
              {showForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
              <span className="hidden sm:inline">{showForm ? t("common.cancel") : t("delegations.newDelegation")}</span>
            </button>
          )}
        </div>

        {/* Weight badge (shown when carrying votes) */}
        {totalWeight > 1 && (
          <div className="card p-4 mb-6 bg-pangea-900/20 border-pangea-700/40 flex items-center gap-3">
            <Star className="w-5 h-5 text-amber-400 shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-fg">
                {t("delegations.proxyTitle")}
              </p>
              <p className="text-xs text-fg-muted">
                {totalWeight - 1} {t("delegations.proxyDescSuffix")}
              </p>
            </div>
            <span className="shrink-0 text-2xl font-bold text-amber-400">
              ×{totalWeight}
            </span>
          </div>
        )}

        {/* Info card */}
        <div className="card p-4 mb-6 bg-pangea-900/10 border-pangea-800/30 flex gap-3">
          <Globe className="w-5 h-5 text-fg-primary shrink-0 mt-0.5" />
          <div className="text-sm text-fg-muted space-y-1.5">
            <p>
              <strong className="text-fg">{t("delegations.infoTitle")}</strong>{" "}
              {t("delegations.infoDescription")}{" "}
              <strong className="text-fg">{t("delegations.infoRevocable")}</strong>{" "}
              {t("common.and")}{" "}
              <strong className="text-fg">{t("delegations.infoDirectVote")}</strong>{" "}
              {t("delegations.infoPrecedence")}
            </p>
            <p className="text-xs">
              <strong className="text-fg">{t("common.example")}:</strong>{" "}
              {t("delegations.infoExample")}
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 p-1 bg-theme-card rounded-xl border border-theme">
          {(["given", "received", "stats"] as Tab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-1.5 ${
                activeTab === tab
                  ? "bg-pangea-700/40 text-fg border border-pangea-600/30"
                  : "text-fg-muted hover:text-fg hover:bg-theme-muted"
              }`}
            >
              {tab === "given" && <GitBranch className="w-3.5 h-3.5 shrink-0" />}
              {tab === "received" && (
                <>
                  <ArrowRightLeft className="w-3.5 h-3.5 shrink-0" />
                  {pendingReceived.length > 0 && (
                    <span className="bg-amber-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center font-bold shrink-0">
                      {pendingReceived.length}
                    </span>
                  )}
                </>
              )}
              {tab === "stats" && <BarChart3 className="w-3.5 h-3.5 shrink-0" />}
              <span className="hidden sm:inline">
                {tab === "given" && t("delegations.tabGiven")}
                {tab === "received" && t("delegations.tabReceived")}
                {tab === "stats" && t("delegations.tabStats")}
              </span>
            </button>
          ))}
        </div>

        {/* Global error */}
        {error && (
          <div className="mb-6 p-3 bg-danger-tint border border-theme rounded-lg text-fg-danger text-sm flex gap-2 items-start">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <span className="flex-1">{error}</span>
            <button onClick={() => setError(null)}><X className="w-4 h-4" /></button>
          </div>
        )}

        {/* ── TAB: MY DELEGATES ─────────────────────────────────────────────── */}
        {activeTab === "given" && (
          <div>
            {/* New delegation form */}
            {showForm && (
              <div className="card p-6 mb-6">
                <h2 className="text-lg font-semibold text-fg mb-4">{t("delegations.createNew")}</h2>

                {/* Citizen search */}
                <div className="mb-4">
                  <label className="label">{t("delegations.searchCitizen")}</label>
                  <div className="relative">
                    <Search className="w-4 h-4 text-fg-muted absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      className="input-field pl-10"
                      placeholder={t("delegations.searchByName")}
                      value={searchQuery}
                      onChange={(e) => searchCitizens(e.target.value)}
                    />
                    {searching && <Loader2 className="w-4 h-4 text-fg-muted absolute right-3 top-1/2 -translate-y-1/2 animate-spin" />}
                  </div>
                  {searchResults.length > 0 && !selectedDelegate && (
                    <div className="mt-2 border border-theme rounded-lg overflow-hidden">
                      {searchResults.map((p) => (
                        <button
                          key={p.id}
                          onClick={() => { setSelectedDelegate(p); setSearchQuery(p.full_name ?? ""); setSearchResults([]); }}
                          className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-theme-card transition-colors border-b border-theme last:border-b-0"
                        >
                          <div className="w-8 h-8 rounded-full bg-pangea-800 border border-pangea-600 flex items-center justify-center text-xs text-fg-primary font-bold">
                            {(p.full_name ?? "?")[0].toUpperCase()}
                          </div>
                          <span className="text-sm text-fg">{p.full_name ?? t("common.citizen")}</span>
                          <ChevronRight className="w-4 h-4 text-fg-muted ml-auto" />
                        </button>
                      ))}
                    </div>
                  )}
                  {selectedDelegate && (
                    <div className="mt-2 flex items-center gap-3 bg-pangea-900/20 border border-pangea-700/30 rounded-lg px-4 py-3">
                      <div className="w-8 h-8 rounded-full bg-pangea-800 border border-pangea-600 flex items-center justify-center text-xs text-fg-primary font-bold">
                        {(selectedDelegate.full_name ?? "?")[0].toUpperCase()}
                      </div>
                      <span className="text-sm text-fg font-medium">{selectedDelegate.full_name}</span>
                      <button onClick={() => { setSelectedDelegate(null); setSearchQuery(""); }} className="ml-auto text-fg-muted hover:text-fg-danger">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>

                {/* Category */}
                <div className="mb-4">
                  <label className="label flex items-center gap-1.5">
                    <Tag className="w-3.5 h-3.5" />
                    {t("delegations.categoryOptional")}
                  </label>
                  <select className="input-field" value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)}>
                    <option value="">{t("delegations.globalDelegation")}</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                  <p className="text-xs text-fg-muted mt-1.5">{t("delegations.categoryPriority")}</p>
                </div>

                {/* is_transitive toggle */}
                <div className="mb-5">
                  <label className="flex items-start gap-3 cursor-pointer">
                    <div
                      onClick={() => setIsTransitive(!isTransitive)}
                      className={`relative shrink-0 mt-0.5 w-10 h-6 rounded-full transition-colors cursor-pointer ${isTransitive ? "bg-pangea-600" : "bg-theme-muted"}`}
                    >
                      <span className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${isTransitive ? "translate-x-4" : "translate-x-0"}`} />
                    </div>
                    <div>
                      <p className="text-sm text-fg font-medium flex items-center gap-1.5">
                        <GitBranch className="w-3.5 h-3.5 text-fg-primary" />
                        {t("delegations.transitiveLabel")}
                      </p>
                      <p className="text-xs text-fg-muted mt-0.5">{t("delegations.transitiveDesc")}</p>
                    </div>
                  </label>
                </div>

                {error && showForm && (
                  <div className="mb-4 p-3 bg-danger-tint border border-theme rounded-lg text-fg-danger text-xs flex gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{error}</span>
                  </div>
                )}

                <button
                  onClick={createDelegation}
                  disabled={!selectedDelegate || saving}
                  className="btn-primary w-full flex items-center justify-center gap-2"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Users className="w-4 h-4" />}
                  {saving ? t("common.creating") : t("delegations.confirmDelegation")}
                </button>
              </div>
            )}

            {/* List */}
            <h2 className="text-base font-semibold text-fg mb-3 flex items-center gap-2">
              <GitBranch className="w-4 h-4 text-fg-primary" />
              {t("delegations.yourDelegations")}
              <span className="text-xs text-fg-muted font-normal">({myDelegations.length})</span>
            </h2>

            {myDelegations.length === 0 ? (
              <div className="card p-8 text-center">
                <Users className="w-12 h-12 text-fg-muted mx-auto mb-3" />
                <p className="text-fg-muted text-sm">{t("delegations.noDelegationsYet")}</p>
              </div>
            ) : (
              <div className="space-y-3">
                {myDelegations.map((d) => (
                  <div key={d.delegation_id} className="card p-4 flex items-center gap-3 overflow-hidden">
                    <div className="w-10 h-10 shrink-0 rounded-full bg-pangea-800 border border-pangea-600 flex items-center justify-center text-xs text-fg-primary font-bold">
                      {delegateName(d)[0]?.toUpperCase() ?? "?"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-fg font-medium truncate">
                        {d.delegate_id
                          ? <PrivacyName userId={d.delegate_id} fullName={d.delegate_display_name ?? d.delegate_username ?? null} currentUserId={user?.id} />
                          : delegateName(d)
                        }
                      </p>
                      <p className="text-xs text-fg-muted flex items-center gap-1 truncate">
                        {d.category_id
                          ? <><Tag className="w-3 h-3 shrink-0" /><span className="truncate">{d.category_name}</span></>
                          : <><Globe className="w-3 h-3 shrink-0" />{t("delegations.globalDelegation")}</>
                        }
                        {!d.is_transitive && (
                          <span className="ml-1 text-xs text-fg-muted border border-theme rounded px-1 shrink-0">
                            {t("delegations.notTransitive")}
                          </span>
                        )}
                      </p>
                    </div>
                    <StatusBadge status={d.status} />
                    <button
                      onClick={() => revokeDelegation(d.delegation_id)}
                      disabled={processingId === d.delegation_id}
                      className="shrink-0 text-fg-muted hover:text-fg-danger transition-colors p-2"
                      title={t("delegations.revokeDelegation")}
                    >
                      {processingId === d.delegation_id
                        ? <Loader2 className="w-4 h-4 animate-spin" />
                        : <Trash2 className="w-4 h-4" />
                      }
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── TAB: RECEIVED ─────────────────────────────────────────────────── */}
        {activeTab === "received" && (
          <div>
            <h2 className="text-base font-semibold text-fg mb-3 flex items-center gap-2">
              <ArrowRightLeft className="w-4 h-4 text-amber-400" />
              {t("delegations.receivedDelegations")}
              <span className="text-xs text-fg-muted font-normal">({receivedDelegations.length})</span>
            </h2>

            {receivedDelegations.length === 0 ? (
              <div className="card p-8 text-center">
                <Users className="w-12 h-12 text-fg-muted mx-auto mb-3" />
                <p className="text-fg-muted text-sm">{t("delegations.noReceivedYet")}</p>
              </div>
            ) : (
              <div className="space-y-3">
                {receivedDelegations.map((d) => (
                  <div key={d.delegation_id} className="card p-4 flex items-center gap-3 overflow-hidden">
                    <div className="w-10 h-10 shrink-0 rounded-full bg-amber-900/30 border border-amber-700/50 flex items-center justify-center text-xs text-amber-300 font-bold">
                      {delegatorName(d)[0]?.toUpperCase() ?? "?"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-fg font-medium truncate">
                        <PrivacyName userId={d.delegator_id} fullName={d.delegator_display_name ?? d.delegator_username ?? null} currentUserId={user?.id} />
                      </p>
                      <p className="text-xs text-fg-muted flex items-center gap-1 truncate">
                        {d.category_id
                          ? <><Tag className="w-3 h-3 shrink-0" /><span className="truncate">{d.category_name}</span></>
                          : <><Globe className="w-3 h-3 shrink-0" />{t("delegations.globalDelegation")}</>
                        }
                        {!d.is_transitive && (
                          <span className="ml-1 text-xs text-fg-muted border border-theme rounded px-1 shrink-0">
                            {t("delegations.notTransitive")}
                          </span>
                        )}
                      </p>
                    </div>

                    {d.status === "pending" ? (
                      <div className="shrink-0 flex items-center gap-1.5">
                        <button
                          onClick={() => acceptDelegation(d.delegation_id)}
                          disabled={processingId === d.delegation_id}
                          className="p-1.5 rounded-lg text-fg-success hover:bg-green-900/30 transition-colors"
                          title={t("delegations.acceptDelegation")}
                        >
                          {processingId === d.delegation_id
                            ? <Loader2 className="w-4 h-4 animate-spin" />
                            : <CheckCircle2 className="w-4 h-4" />
                          }
                        </button>
                        <button
                          onClick={() => rejectDelegation(d.delegation_id)}
                          disabled={processingId === d.delegation_id}
                          className="p-1.5 rounded-lg text-fg-danger hover:bg-danger-tint transition-colors"
                          title={t("delegations.rejectDelegation")}
                        >
                          <XCircle className="w-4 h-4" />
                        </button>
                        <span className="text-xs text-amber-500/80 bg-warning-tint px-2 py-1 rounded-full flex items-center gap-1 whitespace-nowrap">
                          <Clock className="w-3 h-3" /> {t("delegations.statusPending")}
                        </span>
                      </div>
                    ) : (
                      <StatusBadge status={d.status} />
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── TAB: STATS ────────────────────────────────────────────────────── */}
        {activeTab === "stats" && (
          <div className="space-y-4">
            {/* Total weight */}
            <div className="card p-6 text-center">
              <p className="text-xs text-fg-muted uppercase tracking-wider mb-2">{t("delegations.statsTotalWeight")}</p>
              <p className="text-5xl font-bold text-fg-primary mb-1">×{totalWeight}</p>
              <p className="text-sm text-fg-muted">
                {totalWeight === 1
                  ? t("delegations.statsNoProxy")
                  : <>{totalWeight - 1} {t("delegations.statsProxyingSuffix")}</>}
              </p>
              <p className="text-xs text-fg-muted mt-2 italic">{t("delegations.statsWeightDesc")}</p>
            </div>

            {/* Summary cards */}
            <div className="grid grid-cols-2 gap-3">
              <div className="card p-4 text-center">
                <p className="text-2xl font-bold text-fg">{myDelegations.filter(d => d.status === "accepted").length}</p>
                <p className="text-xs text-fg-muted mt-1">{t("delegations.statsGivenActive")}</p>
              </div>
              <div className="card p-4 text-center">
                <p className="text-2xl font-bold text-amber-400">{acceptedReceived.length}</p>
                <p className="text-xs text-fg-muted mt-1">{t("delegations.statsReceivedActive")}</p>
              </div>
            </div>

            {/* By category */}
            {acceptedReceived.length > 0 && (
              <div className="card p-4">
                <h3 className="text-sm font-semibold text-fg mb-3 flex items-center gap-2">
                  <Shield className="w-4 h-4 text-fg-primary" />
                  {t("delegations.statsByCategory")}
                </h3>
                <div className="space-y-2">
                  {Object.entries(categoryBreakdown).map(([key, { name, count, weight }]) => (
                    <div key={key} className="flex items-center gap-3">
                      <div className="w-6 h-6 rounded-full bg-pangea-800 flex items-center justify-center shrink-0">
                        {key === "__global__" ? <Globe className="w-3 h-3 text-fg-primary" /> : <Tag className="w-3 h-3 text-fg-primary" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-fg truncate">
                          {key === "__global__" ? t("delegations.globalDelegation") : (name ?? key)}
                        </p>
                        <p className="text-xs text-fg-muted">{count} {count === 1 ? t("delegations.statsDelegator") : t("delegations.statsDelegators")}</p>
                      </div>
                      <span className="text-sm font-bold text-amber-400 shrink-0">×{weight}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {acceptedReceived.length === 0 && (
              <div className="card p-8 text-center">
                <BarChart3 className="w-12 h-12 text-fg-muted mx-auto mb-3" />
                <p className="text-fg-muted text-sm">{t("delegations.statsEmpty")}</p>
                <p className="text-xs text-fg-muted mt-1">{t("delegations.statsEmptyDesc")}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </AppShell>
  );
}

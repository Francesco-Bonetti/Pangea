"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import AppShell from "@/components/core/AppShell";
import { useLanguage } from "@/components/core/language-provider";
import type { Category, Delegation, Profile } from "@/lib/types";
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
  ShieldAlert,
  RefreshCw,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function DelegationsPage() {
  const { t } = useLanguage();
  const [user, setUser] = useState<{ id: string; email?: string } | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [delegations, setDelegations] = useState<Delegation[]>([]);
  const [receivedDelegations, setReceivedDelegations] = useState<Delegation[]>([]);
  const [loading, setLoading] = useState(true);

  // Form state
  const [showForm, setShowForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Pick<Profile, "id" | "full_name">[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedDelegate, setSelectedDelegate] = useState<Pick<Profile, "id" | "full_name"> | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [reactivatingId, setReactivatingId] = useState<string | null>(null);

  const supabase = createClient();
  const router = useRouter();

  // Load initial data
  const loadData = useCallback(async () => {
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();

    if (!authUser) {
      router.push("/auth");
      return;
    }

    setUser(authUser);

    const [profileRes, catRes, delegGivenRes, delegReceivedRes] =
      await Promise.all([
        supabase.from("profiles").select("*").eq("id", authUser.id).single(),
        supabase.from("categories").select("*").order("name").limit(100),
        supabase
          .from("delegations")
          .select("*, delegate:profiles!delegations_delegate_id_fkey(id, full_name), categories(id, name)")
          .eq("delegator_id", authUser.id)
          .order("created_at", { ascending: false })
          .limit(200),
        supabase
          .from("delegations")
          .select("*, delegator:profiles!delegations_delegator_id_fkey(id, full_name), categories(id, name)")
          .eq("delegate_id", authUser.id)
          .order("created_at", { ascending: false })
          .limit(200),
      ]);

    setProfile(profileRes.data);
    setCategories(catRes.data ?? []);
    setDelegations(delegGivenRes.data ?? []);
    setReceivedDelegations(delegReceivedRes.data ?? []);
    setLoading(false);
  }, [supabase, router]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Search users
  async function searchUsers(query: string) {
    setSearchQuery(query);
    if (query.trim().length < 2) {
      setSearchResults([]);
      return;
    }

    setSearching(true);
    const { data } = await supabase
      .from("profiles")
      .select("id, full_name")
      .ilike("full_name", `%${query.trim()}%`)
      .neq("id", user?.id ?? "")
      .limit(10);

    setSearchResults(data ?? []);
    setSearching(false);
  }

  // Create delegation (as pending request)
  async function createDelegation() {
    if (!selectedDelegate || !user) return;
    setSaving(true);
    setError(null);

    try {
      const payload: Record<string, unknown> = {
        delegator_id: user.id,
        delegate_id: selectedDelegate.id,
        category_id: selectedCategory || null,
        status: "pending",
      };

      const { error: insertError } = await supabase
        .from("delegations")
        .upsert(payload, { onConflict: "delegator_id,category_id" });

      if (insertError) {
        if (insertError.message?.includes("ciclo infinito")) {
          setError(t("delegations.cycleError"));
        } else if (insertError.code === "23505") {
          setError(t("delegations.duplicateError"));
        } else {
          throw insertError;
        }
        return;
      }

      setShowForm(false);
      setSelectedDelegate(null);
      setSelectedCategory("");
      setSearchQuery("");
      setSearchResults([]);
      await loadData();
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : t("delegations.errorCreating");
      setError(msg);
    } finally {
      setSaving(false);
    }
  }

  // Accept received delegation
  async function acceptDelegation(delegationId: string) {
    setError(null);
    const { error: err } = await supabase
      .from("delegations")
      .update({ status: "accepted", confirmed_at: new Date().toISOString() })
      .eq("id", delegationId);
    if (err) {
      setError(t("delegations.failedAccept") + ": " + err.message);
    } else {
      await loadData();
    }
  }

  // Reject received delegation
  async function rejectDelegation(delegationId: string) {
    setError(null);
    const { error: err } = await supabase
      .from("delegations")
      .update({ status: "rejected" })
      .eq("id", delegationId);
    if (err) {
      setError(t("delegations.failedReject") + ": " + err.message);
    } else {
      await loadData();
    }
  }

  // Revoke delegation
  async function revokeDelegation(delegationId: string) {
    const { error: deleteError } = await supabase
      .from("delegations")
      .delete()
      .eq("id", delegationId);

    if (!deleteError) {
      await loadData();
    }
  }

  // DE-27: Confirm delegation (reset ping timer)
  async function confirmDelegation(delegationId: string) {
    setConfirmingId(delegationId);
    const { error: err } = await supabase.rpc("confirm_delegation", {
      p_delegation_id: delegationId,
    });
    if (err) {
      setError(err.message);
    } else {
      await loadData();
    }
    setConfirmingId(null);
  }

  // DE-28: Reactivate expired delegation
  async function reactivateDelegation(delegationId: string) {
    setReactivatingId(delegationId);
    const { error: err } = await supabase.rpc("reactivate_delegation", {
      p_delegation_id: delegationId,
    });
    if (err) {
      setError(err.message);
    } else {
      await loadData();
    }
    setReactivatingId(null);
  }

  // Helper: calculate days until expiry for pinged delegations
  function daysUntilExpiry(d: Delegation): number | null {
    if (!d.last_pinged_at || d.status !== "accepted") return null;
    const pingedAt = new Date(d.last_pinged_at).getTime();
    const expiryAt = pingedAt + 30 * 24 * 60 * 60 * 1000; // 30 days
    const remaining = Math.ceil((expiryAt - Date.now()) / (24 * 60 * 60 * 1000));
    return remaining > 0 ? remaining : 0;
  }

  // Helper: status badge
  function StatusBadge({ d }: { d: Delegation }) {
    if (d.status === "accepted") {
      const remaining = daysUntilExpiry(d);
      if (remaining !== null) {
        // Pinged — needs confirmation
        return (
          <div className="shrink-0 flex items-center gap-1.5">
            <span
              className="text-xs px-2 py-1 rounded-full font-medium whitespace-nowrap text-amber-300 bg-warning-tint border border-theme flex items-center gap-1"
              title={t("delegations.confirmNeededDesc")}
            >
              <ShieldAlert className="w-3 h-3" />
              {t("delegations.expiresIn")} {remaining} {t("delegations.days")}
            </span>
            <button
              onClick={() => confirmDelegation(d.id)}
              disabled={confirmingId === d.id}
              className="text-xs px-2 py-1 rounded-full font-medium bg-pangea-700/30 text-fg-primary hover:bg-pangea-600/40 border border-pangea-600/30 transition-colors flex items-center gap-1"
            >
              {confirmingId === d.id ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <CheckCircle2 className="w-3 h-3" />
              )}
              {confirmingId === d.id ? t("delegations.confirming") : t("delegations.confirmButton")}
            </button>
          </div>
        );
      }
      return (
        <span
          className="shrink-0 text-xs px-2 py-1 rounded-full font-medium whitespace-nowrap text-fg-success bg-success-tint border border-theme"
          title={t("delegations.tooltipAccepted")}
        >
          {t("delegations.statusAccepted")}
        </span>
      );
    }

    if (d.status === "expired") {
      return (
        <div className="shrink-0 flex items-center gap-1.5">
          <span
            className="text-xs px-2 py-1 rounded-full font-medium whitespace-nowrap text-fg-muted bg-theme-card border border-theme"
            title={t("delegations.tooltipExpired")}
          >
            {t("delegations.statusExpired")}
          </span>
          <button
            onClick={() => reactivateDelegation(d.id)}
            disabled={reactivatingId === d.id}
            className="text-xs px-2 py-1 rounded-full font-medium bg-pangea-700/30 text-fg-primary hover:bg-pangea-600/40 border border-pangea-600/30 transition-colors flex items-center gap-1"
          >
            {reactivatingId === d.id ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <RefreshCw className="w-3 h-3" />
            )}
            {reactivatingId === d.id ? t("delegations.reactivating") : t("delegations.reactivate")}
          </button>
        </div>
      );
    }

    if (d.status === "rejected") {
      return (
        <span
          className="shrink-0 text-xs px-2 py-1 rounded-full font-medium whitespace-nowrap text-fg-danger bg-danger-tint border border-theme"
          title={t("delegations.tooltipRejected")}
        >
          {t("delegations.statusRejected")}
        </span>
      );
    }

    // pending
    return (
      <span
        className="shrink-0 text-xs px-2 py-1 rounded-full font-medium whitespace-nowrap text-amber-300 bg-warning-tint border border-theme cursor-help"
        title={t("delegations.tooltipPending")}
      >
        <Clock className="w-3 h-3 inline mr-1" />
        {t("delegations.statusPending")}
      </span>
    );
  }

  if (loading) {
    return (
      <AppShell section="core" sectionName="delegations" userEmail={user?.email} userName={profile?.full_name} userRole={profile?.role}>
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="w-8 h-8 text-fg-primary animate-spin" />
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell section="core" sectionName="delegations" userEmail={user?.email} userName={profile?.full_name} userRole={profile?.role}>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8 overflow-hidden">
          <Link
            href="/dashboard"
            className="shrink-0 p-2 rounded-lg text-fg-muted hover:text-fg hover:bg-theme-card transition-colors"
          >
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
          <button
            onClick={() => setShowForm(!showForm)}
            className="shrink-0 btn-primary flex items-center gap-2 text-sm py-2"
          >
            {showForm ? (
              <X className="w-4 h-4" />
            ) : (
              <Plus className="w-4 h-4" />
            )}
            <span className="hidden sm:inline">{showForm ? t("common.cancel") : t("delegations.newDelegation")}</span>
          </button>
        </div>

        {/* Info card */}
        <div className="card p-4 mb-6 bg-pangea-900/10 border-pangea-800/30 flex gap-3">
          <Globe className="w-5 h-5 text-fg-primary shrink-0 mt-0.5" />
          <div className="text-sm text-fg-muted space-y-2">
            <p>
              <strong className="text-fg">{t("delegations.infoTitle")}</strong>{" "}
              {t("delegations.infoDescription")}{" "}
              <strong className="text-fg">{t("delegations.infoRevocable")}</strong>{" "}
              {t("common.and")}{" "}
              <strong className="text-fg">{t("delegations.infoDirectVote")}</strong>{" "}
              {t("delegations.infoPrecedence")}
            </p>
            <p>
              <strong className="text-amber-400">{t("delegations.infoHowItWorks")}</strong>{" "}
              {t("delegations.infoHowDesc")}{" "}
              <strong className="text-amber-300">{t("delegations.infoPendingLabel")}</strong>{" "}
              {t("delegations.infoAcceptDesc")}
            </p>
            <p className="text-xs">
              <strong className="text-fg">{t("common.example")}:</strong>{" "}
              {t("delegations.infoExample")}
            </p>
          </div>
        </div>

        {/* New delegation form */}
        {showForm && (
          <div className="card p-6 mb-6">
            <h2 className="text-lg font-semibold text-fg mb-4">
              {t("delegations.createNew")}
            </h2>

            {/* User search */}
            <div className="mb-4">
              <label className="label">{t("delegations.searchCitizen")}</label>
              <div className="relative">
                <Search className="w-4 h-4 text-fg-muted absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  className="input-field pl-10"
                  placeholder={t("delegations.searchByName")}
                  value={searchQuery}
                  onChange={(e) => searchUsers(e.target.value)}
                />
                {searching && (
                  <Loader2 className="w-4 h-4 text-fg-muted absolute right-3 top-1/2 -translate-y-1/2 animate-spin" />
                )}
              </div>

              {/* Search results */}
              {searchResults.length > 0 && !selectedDelegate && (
                <div className="mt-2 border border-theme rounded-lg overflow-hidden">
                  {searchResults.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => {
                        setSelectedDelegate(p);
                        setSearchQuery(p.full_name ?? "");
                        setSearchResults([]);
                      }}
                      className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-theme-card transition-colors border-b border-theme last:border-b-0"
                    >
                      <div className="w-8 h-8 rounded-full bg-pangea-800 border border-pangea-600 flex items-center justify-center text-xs text-fg-primary font-bold">
                        {(p.full_name ?? "?")[0].toUpperCase()}
                      </div>
                      <span className="text-sm text-fg">
                        {p.full_name ?? t("common.citizen")}
                      </span>
                      <ChevronRight className="w-4 h-4 text-fg-muted ml-auto" />
                    </button>
                  ))}
                </div>
              )}

              {/* Selected delegate */}
              {selectedDelegate && (
                <div className="mt-2 flex items-center gap-3 bg-pangea-900/20 border border-pangea-700/30 rounded-lg px-4 py-3">
                  <div className="w-8 h-8 rounded-full bg-pangea-800 border border-pangea-600 flex items-center justify-center text-xs text-fg-primary font-bold">
                    {(selectedDelegate.full_name ?? "?")[0].toUpperCase()}
                  </div>
                  <span className="text-sm text-fg font-medium">
                    {selectedDelegate.full_name}
                  </span>
                  <button
                    onClick={() => {
                      setSelectedDelegate(null);
                      setSearchQuery("");
                    }}
                    className="ml-auto text-fg-muted hover:text-fg-danger"
                  >
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
              <select
                className="input-field"
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
              >
                <option value="">
                  {t("delegations.globalDelegation")}
                </option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
              <p className="text-xs text-fg-muted mt-1.5">
                {t("delegations.categoryPriority")}
              </p>
            </div>

            {/* Error */}
            {error && (
              <div className="mb-4 p-3 bg-danger-tint border border-theme rounded-lg text-fg-danger text-xs flex gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {/* Confirm */}
            <button
              onClick={createDelegation}
              disabled={!selectedDelegate || saving}
              className="btn-primary w-full flex items-center justify-center gap-2"
            >
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Users className="w-4 h-4" />
              )}
              {saving ? t("common.creating") : t("delegations.confirmDelegation")}
            </button>
          </div>
        )}

        {/* Global error banner */}
        {error && !showForm && (
          <div className="mb-6 p-3 bg-danger-tint border border-theme rounded-lg text-fg-danger text-sm flex gap-2 items-start">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <span className="flex-1">{error}</span>
            <button onClick={() => setError(null)} className="text-fg-danger hover:text-fg-danger">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Your delegations */}
        <section className="mb-8">
          <h2 className="text-lg font-semibold text-fg mb-4 flex items-center gap-2">
            <ChevronRight className="w-5 h-5 text-fg-primary" />
            {t("delegations.yourDelegations")}
            <span className="text-xs text-fg-muted font-normal">
              ({delegations.length})
            </span>
          </h2>

          {delegations.length === 0 ? (
            <div className="card p-8 text-center">
              <Users className="w-12 h-12 text-fg-muted mx-auto mb-3" />
              <p className="text-fg-muted text-sm">
                {t("delegations.noDelegationsYet")}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {delegations.map((d) => {
                const delegateProfile = d.delegate as unknown as Profile | undefined;
                const category = d.categories as unknown as Category | undefined;
                return (
                  <div
                    key={d.id}
                    className="card p-4 flex items-center gap-3 overflow-hidden"
                  >
                    <div className="w-10 h-10 shrink-0 rounded-full bg-pangea-800 border border-pangea-600 flex items-center justify-center text-xs text-fg-primary font-bold overflow-hidden">
                      {delegateProfile?.full_name ? delegateProfile.full_name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase() : "?"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-fg font-medium truncate">
                        {delegateProfile?.id ? <PrivacyName userId={delegateProfile.id} fullName={delegateProfile.full_name ?? null} currentUserId={user?.id} /> : t("common.citizen")}
                      </p>
                      <p className="text-xs text-fg-muted flex items-center gap-1 truncate">
                        {category ? (
                          <>
                            <Tag className="w-3 h-3 shrink-0" />
                            <span className="truncate">{category.name}</span>
                          </>
                        ) : (
                          <>
                            <Globe className="w-3 h-3 shrink-0" />
                            {t("delegations.globalDelegation")}
                          </>
                        )}
                      </p>
                    </div>
                    <StatusBadge d={d} />
                    <button
                      onClick={() => revokeDelegation(d.id)}
                      className="shrink-0 text-fg-muted hover:text-fg-danger transition-colors p-2"
                      title={t("delegations.revokeDelegation")}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Received delegations */}
        <section>
          <h2 className="text-lg font-semibold text-fg mb-4 flex items-center gap-2">
            <Users className="w-5 h-5 text-amber-400" />
            {t("delegations.receivedDelegations")}
            <span className="text-xs text-fg-muted font-normal">
              ({receivedDelegations.length})
            </span>
          </h2>

          {receivedDelegations.length === 0 ? (
            <div className="card p-8 text-center">
              <Users className="w-12 h-12 text-fg-muted mx-auto mb-3" />
              <p className="text-fg-muted text-sm">
                {t("delegations.noReceivedYet")}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {receivedDelegations.map((d) => {
                const delegatorProfile = d.delegator as unknown as Profile | undefined;
                const category = d.categories as unknown as Category | undefined;
                return (
                  <div
                    key={d.id}
                    className="card p-4 flex items-center gap-3 overflow-hidden"
                  >
                    <div className="w-10 h-10 shrink-0 rounded-full bg-amber-900/30 border border-amber-700/50 flex items-center justify-center text-xs text-amber-300 font-bold overflow-hidden">
                      {delegatorProfile?.full_name ? delegatorProfile.full_name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase() : "?"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-fg font-medium truncate">
                        {delegatorProfile?.id ? <PrivacyName userId={delegatorProfile.id} fullName={delegatorProfile.full_name ?? null} currentUserId={user?.id} /> : t("common.citizen")}
                      </p>
                      <p className="text-xs text-fg-muted flex items-center gap-1 truncate">
                        {category ? (
                          <>
                            <Tag className="w-3 h-3 shrink-0" />
                            <span className="truncate">{category.name}</span>
                          </>
                        ) : (
                          <>
                            <Globe className="w-3 h-3 shrink-0" />
                            {t("delegations.globalDelegation")}
                          </>
                        )}
                      </p>
                    </div>
                    {d.status === "pending" ? (
                      <div className="shrink-0 flex items-center gap-1.5">
                        <button
                          onClick={() => acceptDelegation(d.id)}
                          className="p-1.5 rounded-lg text-fg-success hover:bg-green-900/30 transition-colors"
                          title={t("delegations.acceptDelegation")}
                        >
                          <CheckCircle2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => rejectDelegation(d.id)}
                          className="p-1.5 rounded-lg text-fg-danger hover:bg-danger-tint transition-colors"
                          title={t("delegations.rejectDelegation")}
                        >
                          <XCircle className="w-4 h-4" />
                        </button>
                        <span className="text-xs text-amber-500/80 bg-warning-tint px-2 py-1 rounded-full flex items-center gap-1 whitespace-nowrap">
                          <Clock className="w-3 h-3" /> {t("delegations.statusPending")}
                        </span>
                      </div>
                    ) : d.status === "accepted" ? (
                      <span className="text-xs text-fg-success bg-success-tint px-2 py-1 rounded-full">
                        {t("delegations.statusAccepted")}
                      </span>
                    ) : d.status === "expired" ? (
                      <span className="text-xs text-fg-muted bg-theme-card px-2 py-1 rounded-full">
                        {t("delegations.statusExpired")}
                      </span>
                    ) : (
                      <span className="text-xs text-fg-danger bg-danger-tint px-2 py-1 rounded-full">
                        {t("delegations.statusRejected")}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </AppShell>
  );
}

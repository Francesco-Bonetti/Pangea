"use client";

import { createClient } from "@/lib/supabase/client";
import { useEffect, useState, useCallback } from "react";
import { useLanguage } from "@/components/language-provider";
import AppShell from "@/components/AppShell";
import PrivacyName from "@/components/PrivacyName";
import {
  Map,
  Search,
  Plus,
  X,
  Users,
  Globe,
  MapPin,
  ChevronRight,
  Loader2,
  Info,
  AlertCircle,
  Pencil,
  Check,
} from "lucide-react";
import Link from "next/link";
import type { Jurisdiction, Profile } from "@/lib/types";

export default function JurisdictionsPage() {
  const supabase = createClient();
  const { t } = useLanguage();

  // Auth state
  const [user, setUser] = useState<{ id: string; email?: string } | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isGuest, setIsGuest] = useState(true);

  // Jurisdiction list
  const [jurisdictions, setJurisdictions] = useState<
    (Jurisdiction & { member_count: number; is_member: boolean; founder_name: string | null })[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // Editing jurisdiction
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editSaving, setEditSaving] = useState(false);

  // Create jurisdiction modal
  const [showCreate, setShowCreate] = useState(false);
  const [newJurisdiction, setNewJurisdiction] = useState({
    name: "",
    description: "",
    type: "virtual" as "virtual" | "geographic",
    logo_emoji: "🌍",
    location_name: "",
  });
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Emoji options
  const emojiOptions = [
    "🌍", "🏛️", "🏙️", "🌎", "🌏", "🏔️", "🏝️", "🌊",
    "🔬", "💻", "🎓", "🌱", "⚡", "🔗", "🛡️", "🎯",
  ];

  // Navbar state
  const [pendingDelegations, setPendingDelegations] = useState(0);

  const loadData = useCallback(async () => {
    const {
      data: { user: u },
    } = await supabase.auth.getUser();
    setUser(u);
    setIsGuest(!u);

    if (u) {
      const { data: prof } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", u.id)
        .single();
      setProfile(prof);

      // Pending delegations for navbar
      const { count } = await supabase
        .from("delegations")
        .select("*", { count: "exact", head: true })
        .eq("delegate_id", u.id)
        .eq("status", "pending");
      setPendingDelegations(count ?? 0);
    }

    // Fetch jurisdictions (with limit)
    const { data: jurisdictionData } = await supabase
      .from("jurisdictions")
      .select("*")
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(200);

    if (jurisdictionData && jurisdictionData.length > 0) {
      const jIds = jurisdictionData.map((j: Jurisdiction) => j.id);
      const founderIds = Array.from(new Set(jurisdictionData.map((j: Jurisdiction) => j.founder_id).filter(Boolean)));

      // Batch: get ALL member counts in one query
      const { data: memberCounts } = await supabase
        .from("jurisdiction_members")
        .select("jurisdiction_id")
        .in("jurisdiction_id", jIds);

      // Build count map
      const countMap: Record<string, number> = {};
      (memberCounts ?? []).forEach((m: { jurisdiction_id: string }) => {
        countMap[m.jurisdiction_id] = (countMap[m.jurisdiction_id] || 0) + 1;
      });

      // Batch: check current user memberships in one query
      const membershipSet = new Set<string>();
      if (u) {
        const { data: myMemberships } = await supabase
          .from("jurisdiction_members")
          .select("jurisdiction_id")
          .eq("user_id", u.id)
          .in("jurisdiction_id", jIds);
        (myMemberships ?? []).forEach((m: { jurisdiction_id: string }) => membershipSet.add(m.jurisdiction_id));
      }

      // Batch: fetch ALL founder names in one query
      const founderMap: Record<string, string | null> = {};
      if (founderIds.length > 0) {
        const { data: founderProfiles } = await supabase
          .from("profiles")
          .select("id, full_name")
          .in("id", founderIds);
        (founderProfiles ?? []).forEach((p: { id: string; full_name: string | null }) => {
          founderMap[p.id] = p.full_name;
        });
      }

      const enriched = jurisdictionData.map((j: Jurisdiction) => ({
        ...j,
        member_count: countMap[j.id] ?? 0,
        is_member: membershipSet.has(j.id),
        founder_name: founderMap[j.founder_id] ?? null,
      }));
      setJurisdictions(enriched);
    }

    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    loadData();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleCreate() {
    if (!user) return;
    setCreating(true);
    setError(null);

    try {
      const { data, error: insertError } = await supabase
        .from("jurisdictions")
        .insert({
          name: newJurisdiction.name.trim(),
          description: newJurisdiction.description.trim() || null,
          type: newJurisdiction.type,
          logo_emoji: newJurisdiction.logo_emoji,
          founder_id: user.id,
          location_name:
            newJurisdiction.type === "geographic" && newJurisdiction.location_name.trim()
              ? newJurisdiction.location_name.trim()
              : null,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      // Auto-join as founder
      if (data) {
        await supabase.from("jurisdiction_members").insert({
          jurisdiction_id: data.id,
          user_id: user.id,
          role: "founder",
        });
      }

      setShowCreate(false);
      setNewJurisdiction({
        name: "",
        description: "",
        type: "virtual",
        logo_emoji: "🌍",
        location_name: "",
      });
      loadData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error creating jurisdiction";
      setError(msg);
    } finally {
      setCreating(false);
    }
  }

  async function handleJoin(jurisdictionId: string) {
    if (!user) return;
    await supabase.from("jurisdiction_members").insert({
      jurisdiction_id: jurisdictionId,
      user_id: user.id,
      role: "member",
    });
    loadData();
  }

  function startEditing(j: Jurisdiction & { member_count: number; is_member: boolean; founder_name: string | null }) {
    setEditingId(j.id);
    setEditName(j.name);
    setEditDesc(j.description || "");
  }

  async function handleSaveEdit() {
    if (!editingId || !editName.trim()) return;
    setEditSaving(true);
    const { error: updateError } = await supabase
      .from("jurisdictions")
      .update({
        name: editName.trim(),
        description: editDesc.trim() || null,
      })
      .eq("id", editingId);
    if (updateError) {
      setError(updateError.message);
    } else {
      setEditingId(null);
      loadData();
    }
    setEditSaving(false);
  }

  const filtered = jurisdictions.filter(
    (j) =>
      j.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (j.description ?? "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <AppShell userEmail={user?.email} userName={profile?.full_name} userRole={profile?.role} isGuest={isGuest} pendingDelegations={pendingDelegations}>
        <div className="max-w-6xl mx-auto px-4 py-8">
          <div className="h-8 w-48 bg-theme-card rounded-lg animate-pulse mb-6" />
          <div className="grid gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-theme-card border border-theme rounded-xl p-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-theme-muted rounded-lg animate-pulse" />
                  <div className="flex-1 space-y-2">
                    <div className="h-5 w-40 bg-theme-muted rounded animate-pulse" />
                    <div className="h-4 w-64 bg-theme-muted rounded animate-pulse" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell
      userEmail={user?.email}
      userName={profile?.full_name}
      userRole={profile?.role}
      isGuest={isGuest}
      pendingDelegations={pendingDelegations}
    >
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6 overflow-hidden">
          <div className="flex items-center gap-3 min-w-0">
            <Map className="w-7 h-7 text-fg-primary shrink-0" />
            <div className="min-w-0">
              <h1 className="text-2xl font-bold text-fg truncate">{t("jurisdictions.title")}</h1>
              <p className="text-sm text-fg-muted">
                {t("jurisdictions.subtitle")}
              </p>
            </div>
          </div>
          {!isGuest && (
            <button
              onClick={() => setShowCreate(true)}
              className="btn-primary flex items-center gap-2 shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">{t("jurisdictions.createJurisdiction")}</span>
            </button>
          )}
        </div>

        {/* Info box */}
        <div className="card p-4 mb-6 bg-pangea-900/10 border-pangea-800/30 flex gap-3">
          <Info className="w-5 h-5 text-fg-primary shrink-0 mt-0.5" />
          <div className="text-sm text-fg-muted">
            <p className="text-fg font-medium mb-1">{t("jurisdictions.whatAreJurisdictions")}</p>
            <p>
              {t("jurisdictions.whatAreJurisdictionsDesc")}
            </p>
          </div>
        </div>

        {/* Search */}
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-fg-muted" />
          <input
            type="text"
            className="input-field pl-10"
            placeholder={t("jurisdictions.searchJurisdictions")}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-fg-muted hover:text-fg"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Jurisdictions list */}
        {filtered.length === 0 ? (
          <div className="card p-12 text-center">
            <Map className="w-12 h-12 text-fg-muted mx-auto mb-4" />
            <p className="text-fg-muted mb-2">
              {searchQuery ? t("jurisdictions.noJurisdictionsFound") : t("jurisdictions.noJurisdictionsYet")}
            </p>
            <p className="text-sm text-fg-muted">
              {searchQuery
                ? t("jurisdictions.tryDifferentSearch")
                : t("jurisdictions.beFirstJurisdiction")}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((j) => (
              <div
                key={j.id}
                className="card p-5 hover:border-theme transition-colors"
              >
                <div className="flex items-start gap-4 overflow-hidden">
                  {/* Emoji */}
                  <div className="w-12 h-12 rounded-xl bg-theme-card flex items-center justify-center text-2xl shrink-0">
                    {j.logo_emoji}
                  </div>
                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    {editingId === j.id ? (
                      /* ── Inline edit mode ── */
                      <div className="space-y-2">
                        <input
                          type="text"
                          className="input-field text-sm"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          placeholder="Jurisdiction name"
                          maxLength={100}
                          autoFocus
                        />
                        <textarea
                          className="input-field text-sm min-h-[60px] resize-y"
                          value={editDesc}
                          onChange={(e) => setEditDesc(e.target.value)}
                          placeholder="Description (optional)"
                          maxLength={500}
                        />
                        <div className="flex items-center gap-2">
                          <button
                            onClick={handleSaveEdit}
                            disabled={editSaving || !editName.trim()}
                            className="btn-primary text-xs px-3 py-1.5 flex items-center gap-1"
                          >
                            {editSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                            {t("common.save")}
                          </button>
                          <button
                            onClick={() => setEditingId(null)}
                            className="btn-secondary text-xs px-3 py-1.5"
                          >
                            {t("common.cancel")}
                          </button>
                        </div>
                      </div>
                    ) : (
                      /* ── Normal view ── */
                      <>
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <h3 className="text-lg font-semibold text-fg truncate">
                            {j.name}
                          </h3>
                          {j.is_member && (
                            <span className="text-xs bg-pangea-900/40 text-fg-primary px-2 py-0.5 rounded-full shrink-0">
                              {t("jurisdictions.joined")}
                            </span>
                          )}
                          <span
                            className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${
                              j.type === "virtual"
                                ? "bg-blue-900/30 text-blue-300"
                                : "bg-green-900/30 text-fg-success"
                            }`}
                          >
                            {j.type === "virtual" ? (
                              <span className="flex items-center gap-1">
                                <Globe className="w-3 h-3" /> {t("jurisdictions.virtual")}
                              </span>
                            ) : (
                              <span className="flex items-center gap-1">
                                <MapPin className="w-3 h-3" /> {t("jurisdictions.geographic")}
                              </span>
                            )}
                          </span>
                          {/* Edit button for founder */}
                          {user && j.founder_id === user.id && (
                            <button
                              onClick={() => startEditing(j)}
                              className="p-1 rounded-md hover:bg-[var(--muted)] transition-colors"
                              style={{ color: "var(--muted-foreground)" }}
                              title="Edit jurisdiction"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                        {j.description && (
                          <p className="text-sm text-fg-muted line-clamp-2 mb-2">
                            {j.description}
                          </p>
                        )}
                        {j.location_name && (
                          <p className="text-xs text-fg-muted flex items-center gap-1 mb-2">
                            <MapPin className="w-3 h-3" /> {j.location_name}
                          </p>
                        )}
                        <div className="flex items-center gap-4 text-xs text-fg-muted">
                          <span className="flex items-center gap-1">
                            <Users className="w-3 h-3" /> {j.member_count}{" "}
                            {t(`jurisdictions.${j.member_count === 1 ? "member" : "members"}`)}
                          </span>
                          <span>
                            {t("jurisdictions.foundedBy")}{" "}
                            <PrivacyName userId={j.founder_id} fullName={j.founder_name} />
                          </span>
                        </div>
                      </>
                    )}
                  </div>
                  {/* Action */}
                  <div className="shrink-0">
                    {!isGuest && !j.is_member ? (
                      <button
                        onClick={() => handleJoin(j.id)}
                        className="btn-secondary text-sm flex items-center gap-1.5"
                      >
                        <Plus className="w-3.5 h-3.5" /> {t("jurisdictions.join")}
                      </button>
                    ) : editingId !== j.id ? (
                      <ChevronRight className="w-5 h-5 text-fg-muted" />
                    ) : null}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="card p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-fg">
                {t("jurisdictions.createJurisdiction")}
              </h2>
              <button
                onClick={() => {
                  setShowCreate(false);
                  setError(null);
                }}
                className="text-fg-muted hover:text-fg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Type */}
              <div>
                <label className="label">{t("jurisdictions.type")}</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() =>
                      setNewJurisdiction({ ...newJurisdiction, type: "virtual" })
                    }
                    className={`card p-3 text-left text-sm transition-all ${
                      newJurisdiction.type === "virtual"
                        ? "border-blue-500 bg-blue-900/20"
                        : "hover:border-theme"
                    }`}
                  >
                    <Globe className="w-4 h-4 text-blue-400 mb-1" />
                    <p className="font-medium text-fg">{t("jurisdictions.virtual")}</p>
                    <p className="text-xs text-fg-muted">{t("jurisdictions.topicBased")}</p>
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setNewJurisdiction({ ...newJurisdiction, type: "geographic" })
                    }
                    className={`card p-3 text-left text-sm transition-all ${
                      newJurisdiction.type === "geographic"
                        ? "border-green-500 bg-success-tint"
                        : "hover:border-theme"
                    }`}
                  >
                    <MapPin className="w-4 h-4 text-fg-success mb-1" />
                    <p className="font-medium text-fg">{t("jurisdictions.geographic")}</p>
                    <p className="text-xs text-fg-muted">{t("jurisdictions.locationBased")}</p>
                  </button>
                </div>
              </div>

              {/* Emoji */}
              <div>
                <label className="label">{t("jurisdictions.symbol")}</label>
                <div className="flex flex-wrap gap-2">
                  {emojiOptions.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() =>
                        setNewJurisdiction({ ...newJurisdiction, logo_emoji: emoji })
                      }
                      className={`w-10 h-10 rounded-lg flex items-center justify-center text-xl transition-all ${
                        newJurisdiction.logo_emoji === emoji
                          ? "bg-pangea-900/40 border-2 border-pangea-500 scale-110"
                          : "bg-theme-card border border-theme hover:border-theme"
                      }`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>

              {/* Name */}
              <div>
                <label className="label">
                  {t("jurisdictions.name")} <span className="text-fg-danger">*</span>
                </label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="e.g. Digital Sustainability Community"
                  value={newJurisdiction.name}
                  onChange={(e) =>
                    setNewJurisdiction({ ...newJurisdiction, name: e.target.value })
                  }
                  maxLength={100}
                />
              </div>

              {/* Description */}
              <div>
                <label className="label">{t("jurisdictions.descriptionLabel")}</label>
                <textarea
                  className="input-field min-h-[80px] resize-y"
                  placeholder={t("jurisdictions.whatIsAbout")}
                  value={newJurisdiction.description}
                  onChange={(e) =>
                    setNewJurisdiction({
                      ...newJurisdiction,
                      description: e.target.value,
                    })
                  }
                  maxLength={500}
                />
              </div>

              {/* Location (geographic only) */}
              {newJurisdiction.type === "geographic" && (
                <div>
                  <label className="label">{t("jurisdictions.locationName")}</label>
                  <input
                    type="text"
                    className="input-field"
                    placeholder={t("jurisdictions.locationPlaceholder")}
                    value={newJurisdiction.location_name}
                    onChange={(e) =>
                      setNewJurisdiction({
                        ...newJurisdiction,
                        location_name: e.target.value,
                      })
                    }
                    maxLength={200}
                  />
                </div>
              )}

              {error && (
                <div className="p-3 bg-danger-tint border border-theme rounded-lg text-fg-danger text-sm flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  {error}
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => {
                    setShowCreate(false);
                    setError(null);
                  }}
                  className="btn-secondary flex-1"
                >
                  {t("common.cancel")}
                </button>
                <button
                  onClick={handleCreate}
                  disabled={!newJurisdiction.name.trim() || creating}
                  className="btn-primary flex-1 flex items-center justify-center gap-2"
                >
                  {creating ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Plus className="w-4 h-4" />
                  )}
                  {t("jurisdictions.create")}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}

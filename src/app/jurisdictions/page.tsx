"use client";

import { createClient } from "@/lib/supabase/client";
import { useEffect, useState, useCallback } from "react";
import Navbar from "@/components/Navbar";
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
} from "lucide-react";
import Link from "next/link";
import type { Jurisdiction, Profile } from "@/lib/types";

export default function JurisdictionsPage() {
  const supabase = createClient();

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

    // Fetch jurisdictions
    const { data: jurisdictionData } = await supabase
      .from("jurisdictions")
      .select("*")
      .eq("is_active", true)
      .order("created_at", { ascending: false });

    if (jurisdictionData) {
      // Get member counts, membership status, and founder names
      const enriched = await Promise.all(
        jurisdictionData.map(async (j: Jurisdiction) => {
          const { count } = await supabase
            .from("jurisdiction_members")
            .select("*", { count: "exact", head: true })
            .eq("jurisdiction_id", j.id);

          let is_member = false;
          if (u) {
            const { data: membership } = await supabase
              .from("jurisdiction_members")
              .select("id")
              .eq("jurisdiction_id", j.id)
              .eq("user_id", u.id)
              .maybeSingle();
            is_member = !!membership;
          }

          // Fetch founder name
          const { data: founderProfile } = await supabase
            .from("profiles")
            .select("full_name")
            .eq("id", j.founder_id)
            .maybeSingle();

          return { ...j, member_count: count ?? 0, is_member, founder_name: founderProfile?.full_name ?? null };
        })
      );
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

  const filtered = jurisdictions.filter(
    (j) =>
      j.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (j.description ?? "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0c1220]">
        <div className="max-w-6xl mx-auto px-4 py-8">
          <div className="h-8 w-48 bg-slate-800 rounded-lg animate-pulse mb-6" />
          <div className="grid gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-slate-700 rounded-lg animate-pulse" />
                  <div className="flex-1 space-y-2">
                    <div className="h-5 w-40 bg-slate-700 rounded animate-pulse" />
                    <div className="h-4 w-64 bg-slate-700/50 rounded animate-pulse" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0c1220]">
      <Navbar
        userEmail={user?.email}
        userName={profile?.full_name}
        userRole={profile?.role}
        isGuest={isGuest}
        pendingDelegations={pendingDelegations}
      />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6 overflow-hidden">
          <div className="flex items-center gap-3 min-w-0">
            <Map className="w-7 h-7 text-pangea-400 shrink-0" />
            <div className="min-w-0">
              <h1 className="text-2xl font-bold text-white truncate">Jurisdictions</h1>
              <p className="text-sm text-slate-400">
                Communities and regions within Pangea
              </p>
            </div>
          </div>
          {!isGuest && (
            <button
              onClick={() => setShowCreate(true)}
              className="btn-primary flex items-center gap-2 shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Create</span>
            </button>
          )}
        </div>

        {/* Info box */}
        <div className="card p-4 mb-6 bg-pangea-900/10 border-pangea-800/30 flex gap-3">
          <Info className="w-5 h-5 text-pangea-400 shrink-0 mt-0.5" />
          <div className="text-sm text-slate-400">
            <p className="text-slate-300 font-medium mb-1">What are jurisdictions?</p>
            <p>
              Jurisdictions are self-governing communities within Pangea. They can be{" "}
              <strong className="text-blue-300">virtual</strong> (topic-based, like
              &quot;Open Source Alliance&quot;) or{" "}
              <strong className="text-green-300">geographic</strong> (location-based, like
              &quot;Lisbon District&quot;). Each jurisdiction can propose its own laws and
              hold local elections. For example, a &quot;Digital Sustainability&quot;
              jurisdiction could propose laws about open-source software for all its
              members.
            </p>
          </div>
        </div>

        {/* Search */}
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            className="input-field pl-10"
            placeholder="Search jurisdictions..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Jurisdictions list */}
        {filtered.length === 0 ? (
          <div className="card p-12 text-center">
            <Map className="w-12 h-12 text-slate-600 mx-auto mb-4" />
            <p className="text-slate-400 mb-2">
              {searchQuery ? "No jurisdictions found" : "No jurisdictions yet"}
            </p>
            <p className="text-sm text-slate-500">
              {searchQuery
                ? "Try a different search term"
                : "Be the first to create a jurisdiction!"}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((j) => (
              <div
                key={j.id}
                className="card p-5 hover:border-slate-600 transition-colors"
              >
                <div className="flex items-start gap-4 overflow-hidden">
                  {/* Emoji */}
                  <div className="w-12 h-12 rounded-xl bg-slate-800 flex items-center justify-center text-2xl shrink-0">
                    {j.logo_emoji}
                  </div>
                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <h3 className="text-lg font-semibold text-white truncate">
                        {j.name}
                      </h3>
                      {j.is_member && (
                        <span className="text-xs bg-pangea-900/40 text-pangea-300 px-2 py-0.5 rounded-full shrink-0">
                          Joined
                        </span>
                      )}
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${
                          j.type === "virtual"
                            ? "bg-blue-900/30 text-blue-300"
                            : "bg-green-900/30 text-green-300"
                        }`}
                      >
                        {j.type === "virtual" ? (
                          <span className="flex items-center gap-1">
                            <Globe className="w-3 h-3" /> Virtual
                          </span>
                        ) : (
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3" /> Geographic
                          </span>
                        )}
                      </span>
                    </div>
                    {j.description && (
                      <p className="text-sm text-slate-400 line-clamp-2 mb-2">
                        {j.description}
                      </p>
                    )}
                    {j.location_name && (
                      <p className="text-xs text-slate-500 flex items-center gap-1 mb-2">
                        <MapPin className="w-3 h-3" /> {j.location_name}
                      </p>
                    )}
                    <div className="flex items-center gap-4 text-xs text-slate-500">
                      <span className="flex items-center gap-1">
                        <Users className="w-3 h-3" /> {j.member_count}{" "}
                        {j.member_count === 1 ? "member" : "members"}
                      </span>
                      <span>
                        Founded by{" "}
                        <PrivacyName userId={j.founder_id} fullName={j.founder_name} />
                      </span>
                    </div>
                  </div>
                  {/* Action */}
                  <div className="shrink-0">
                    {!isGuest && !j.is_member ? (
                      <button
                        onClick={() => handleJoin(j.id)}
                        className="btn-secondary text-sm flex items-center gap-1.5"
                      >
                        <Plus className="w-3.5 h-3.5" /> Join
                      </button>
                    ) : (
                      <ChevronRight className="w-5 h-5 text-slate-600" />
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="card p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-white">
                Create Jurisdiction
              </h2>
              <button
                onClick={() => {
                  setShowCreate(false);
                  setError(null);
                }}
                className="text-slate-400 hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Type */}
              <div>
                <label className="label">Type</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() =>
                      setNewJurisdiction({ ...newJurisdiction, type: "virtual" })
                    }
                    className={`card p-3 text-left text-sm transition-all ${
                      newJurisdiction.type === "virtual"
                        ? "border-blue-500 bg-blue-900/20"
                        : "hover:border-slate-600"
                    }`}
                  >
                    <Globe className="w-4 h-4 text-blue-400 mb-1" />
                    <p className="font-medium text-slate-200">Virtual</p>
                    <p className="text-xs text-slate-500">Topic or interest-based</p>
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setNewJurisdiction({ ...newJurisdiction, type: "geographic" })
                    }
                    className={`card p-3 text-left text-sm transition-all ${
                      newJurisdiction.type === "geographic"
                        ? "border-green-500 bg-green-900/20"
                        : "hover:border-slate-600"
                    }`}
                  >
                    <MapPin className="w-4 h-4 text-green-400 mb-1" />
                    <p className="font-medium text-slate-200">Geographic</p>
                    <p className="text-xs text-slate-500">Location-based</p>
                  </button>
                </div>
              </div>

              {/* Emoji */}
              <div>
                <label className="label">Symbol</label>
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
                          : "bg-slate-800 border border-slate-700 hover:border-slate-500"
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
                  Name <span className="text-red-400">*</span>
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
                <label className="label">Description</label>
                <textarea
                  className="input-field min-h-[80px] resize-y"
                  placeholder="What is this jurisdiction about?"
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
                  <label className="label">Location name</label>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="e.g. Lisbon, Portugal"
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
                <div className="p-3 bg-red-900/30 border border-red-700/50 rounded-lg text-red-300 text-sm flex items-center gap-2">
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
                  Cancel
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
                  Create
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

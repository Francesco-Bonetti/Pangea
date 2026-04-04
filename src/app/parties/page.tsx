"use client";

import { createClient } from "@/lib/supabase/client";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import AppShell from "@/components/AppShell";
import { Flag, Plus, Users, Search, X, AlertCircle, ChevronRight } from "lucide-react";
import type { Party, Profile } from "@/lib/types";
import PrivacyName from "@/components/PrivacyName";

export default function PartiesPage() {
  const supabase = createClient();
  const router = useRouter();

  // Auth state
  const [user, setUser] = useState<{ id: string; email?: string } | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isGuest, setIsGuest] = useState(true);

  // Party list
  const [parties, setParties] = useState<(Party & { member_count: number; is_member: boolean })[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // Create party modal
  const [showCreate, setShowCreate] = useState(false);
  const [newParty, setNewParty] = useState({ name: "", description: "", manifesto: "", logo_emoji: "🏛️" });
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Emoji options for party logo
  const emojiOptions = ["🏛️", "⚖️", "🌍", "🔥", "🕊️", "🌱", "💡", "🛡️", "🎯", "⭐", "🦁", "🌊", "🏔️", "🔱", "🎪"];

  // Navbar state
  const [pendingDelegations, setPendingDelegations] = useState(0);

  const loadData = useCallback(async () => {
    const { data: { user: u } } = await supabase.auth.getUser();
    setUser(u);
    setIsGuest(!u);

    if (u) {
      const { data: prof } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", u.id)
        .single();
      setProfile(prof);

      // Pending delegations for navbar badge
      const { count } = await supabase
        .from("delegations")
        .select("*", { count: "exact", head: true })
        .eq("delegate_id", u.id)
        .eq("status", "pending");
      setPendingDelegations(count || 0);
    }

    // Load all active parties with member count
    const { data: partiesData } = await supabase
      .from("parties")
      .select("*, profiles!parties_founder_id_fkey(full_name)")
      .eq("is_active", true)
      .order("created_at", { ascending: false });

    if (partiesData) {
      // Get member counts and membership status for each party
      const enriched = await Promise.all(
        partiesData.map(async (p: Party & { profiles?: { full_name: string | null } }) => {
          const { count } = await supabase
            .from("party_members")
            .select("*", { count: "exact", head: true })
            .eq("party_id", p.id);

          let is_member = false;
          if (u) {
            const { data: mem } = await supabase
              .from("party_members")
              .select("id")
              .eq("party_id", p.id)
              .eq("user_id", u.id)
              .maybeSingle();
            is_member = !!mem;
          }

          return { ...p, member_count: count || 0, is_member };
        })
      );
      setParties(enriched);
    }

    setLoading(false);
  }, [supabase]);

  useEffect(() => { loadData(); }, [loadData]);

  async function handleCreateParty() {
    if (!newParty.name.trim()) {
      setError("Party name is required");
      return;
    }
    setCreating(true);
    setError(null);

    const { data, error: err } = await supabase.rpc("create_party", {
      p_name: newParty.name.trim(),
      p_description: newParty.description.trim() || null,
      p_manifesto: newParty.manifesto.trim() || null,
      p_logo_emoji: newParty.logo_emoji,
    });

    if (err) {
      if (err.message.includes("delega")) {
        setError("To create a party you need to enable the delegation feature in your personal settings.");
      } else if (err.message.includes("unique") || err.message.includes("duplicate")) {
        setError("A party with this name already exists.");
      } else {
        setError(err.message);
      }
      setCreating(false);
      return;
    }

    // Navigate to the new party
    router.push(`/parties/${data}`);
  }

  async function handleJoinParty(partyId: string) {
    if (!user) { router.push("/auth"); return; }

    const { error: err } = await supabase
      .from("party_members")
      .insert({ party_id: partyId, user_id: user.id, role: "member" });

    if (err) {
      setError(err.message);
      return;
    }
    loadData();
  }

  const filteredParties = parties.filter(
    (p) =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.description || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <AppShell
      userEmail={user?.email}
      userName={profile?.full_name}
      userRole={profile?.role}
      isGuest={isGuest}
      pendingDelegations={pendingDelegations}
    >
      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold text-fg flex items-center gap-3 overflow-hidden">
              <Flag className="w-7 h-7 text-fg-primary shrink-0" />
              <span className="truncate">Political Parties</span>
            </h1>
            <p className="text-fg-muted mt-1">
              Organize into parties to influence votes on proposals. You can join multiple parties.
            </p>
          </div>
          {!isGuest && (
            <button
              onClick={() => setShowCreate(true)}
              className="btn-primary flex items-center gap-2 whitespace-nowrap shrink-0 overflow-hidden"
            >
              <Plus className="w-4 h-4 shrink-0" />
              <span className="truncate">Create Party</span>
            </button>
          )}
        </div>

        {/* Info card */}
        <div className="info-box mb-6">
          <h3 className="text-sm font-semibold text-fg-primary mb-2">How Parties Work</h3>
          <ul className="text-xs text-fg-muted space-y-1">
            <li>• You can join <strong className="text-fg">multiple parties</strong> at the same time</li>
            <li>• Parties cast a <strong className="text-fg">public vote</strong> on each proposal</li>
            <li>• If you don&apos;t vote directly, your vote is <strong className="text-fg">split among parties</strong> based on the weights you choose</li>
            <li>• Your <strong className="text-fg">direct vote</strong> always overrides party votes (and you can restore them)</li>
            <li>• To create a party you must have the <strong className="text-fg">delegation feature enabled</strong></li>
          </ul>
        </div>

        {/* Search */}
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-fg-muted" />
          <input
            type="text"
            placeholder="Search parties..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input-field pl-10 w-full"
          />
        </div>

        {/* Error */}
        {error && (
          <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 text-fg-danger text-sm rounded-lg p-3 mb-4 overflow-hidden">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span className="truncate">{error}</span>
            <button onClick={() => setError(null)} className="ml-auto shrink-0"><X className="w-4 h-4" /></button>
          </div>
        )}

        {/* Party list */}
        {loading ? (
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
        ) : filteredParties.length === 0 ? (
          <div className="text-center text-fg-muted py-12">
            {searchQuery ? "No parties found." : "No parties created yet. Be the first!"}
          </div>
        ) : (
          <div className="grid gap-4">
            {filteredParties.map((party) => (
              <Link
                key={party.id}
                href={`/parties/${party.id}`}
                className="card hover:border-pangea-600/50 transition-all group overflow-hidden"
              >
                <div className="flex items-start gap-4 overflow-hidden">
                  <div className="text-3xl shrink-0 mt-1">{party.logo_emoji}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 overflow-hidden">
                      <h2 className="text-lg font-semibold text-fg group-hover:text-fg-primary transition-colors truncate">
                        {party.name}
                      </h2>
                      {party.is_member && (
                        <span className="text-[10px] bg-pangea-800 text-fg-primary px-2 py-0.5 rounded-full font-medium shrink-0">
                          Joined
                        </span>
                      )}
                    </div>
                    {party.description && (
                      <p className="text-sm text-fg-muted line-clamp-2 mb-2">{party.description}</p>
                    )}
                    <div className="flex items-center gap-4 text-xs text-fg-muted flex-wrap">
                      <span className="flex items-center gap-1 shrink-0">
                        <Users className="w-3 h-3 shrink-0" />
                        {party.member_count} {party.member_count === 1 ? "member" : "members"}
                      </span>
                      <span className="flex-1 min-w-0 truncate">Founded by <PrivacyName userId={party.founder_id} fullName={party.profiles?.full_name ?? null} currentUserId={user?.id} /></span>
                      <span className="shrink-0">{new Date(party.created_at).toLocaleDateString("en-US")}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {!isGuest && !party.is_member && (
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleJoinParty(party.id);
                        }}
                        className="btn-primary text-xs py-1.5 px-3 whitespace-nowrap overflow-hidden"
                      >
                        <span className="truncate">Join</span>
                      </button>
                    )}
                    <ChevronRight className="w-5 h-5 text-fg-muted group-hover:text-fg-primary transition-colors shrink-0" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Create party modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-theme-base border border-theme rounded-xl max-w-lg w-full p-6 overflow-hidden">
            <div className="flex items-center justify-between mb-6 overflow-hidden">
              <h2 className="text-xl font-bold text-fg flex items-center gap-2 overflow-hidden flex-1">
                <Flag className="w-5 h-5 text-fg-primary shrink-0" />
                <span className="truncate">Create Party</span>
              </h2>
              <button onClick={() => { setShowCreate(false); setError(null); }} className="text-fg-muted hover:text-fg shrink-0">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Delegation warning */}
            {profile && !profile.allow_delegations && (
              <div className="flex items-start gap-2 bg-amber-500/10 border border-amber-500/30 text-amber-400 text-sm rounded-lg p-3 mb-4 overflow-hidden">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium">Delegation feature not enabled</p>
                  <p className="text-xs mt-1">To create a party you need to enable the delegation feature in your{" "}
                    <Link href="/settings" className="underline text-amber-300">personal settings</Link>.
                  </p>
                </div>
              </div>
            )}

            {error && (
              <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 text-fg-danger text-sm rounded-lg p-3 mb-4 overflow-hidden">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span className="truncate">{error}</span>
              </div>
            )}

            {/* Emoji selector */}
            <div className="mb-4">
              <label className="label">Symbol</label>
              <div className="flex flex-wrap gap-2">
                {emojiOptions.map((e) => (
                  <button
                    key={e}
                    onClick={() => setNewParty({ ...newParty, logo_emoji: e })}
                    className={`text-2xl p-2 rounded-lg transition-colors ${
                      newParty.logo_emoji === e
                        ? "bg-pangea-800 border border-pangea-500"
                        : "bg-theme-card border border-theme hover:border-theme"
                    }`}
                  >
                    {e}
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-4">
              <label className="label">Party Name *</label>
              <input
                type="text"
                value={newParty.name}
                onChange={(e) => setNewParty({ ...newParty, name: e.target.value })}
                className="input-field w-full"
                placeholder="e.g. Global Sustainability Party"
                maxLength={100}
              />
            </div>

            <div className="mb-4">
              <label className="label">Short description</label>
              <textarea
                value={newParty.description}
                onChange={(e) => setNewParty({ ...newParty, description: e.target.value })}
                className="input-field w-full h-20 resize-none"
                placeholder="A sentence describing the party's mission..."
                maxLength={300}
              />
            </div>

            <div className="mb-6">
              <label className="label">Manifesto (optional)</label>
              <textarea
                value={newParty.manifesto}
                onChange={(e) => setNewParty({ ...newParty, manifesto: e.target.value })}
                className="input-field w-full h-32 resize-none"
                placeholder="Core principles, goals, and values of the party..."
                maxLength={5000}
              />
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => { setShowCreate(false); setError(null); }}
                className="btn-ghost px-4 py-2"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateParty}
                disabled={creating || !newParty.name.trim()}
                className="btn-primary px-6 py-2"
              >
                {creating ? "Creating..." : "Create Party"}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}

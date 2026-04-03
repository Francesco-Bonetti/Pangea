"use client";

import { createClient } from "@/lib/supabase/client";
import { useEffect, useState, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import {
  Flag, Users, ArrowLeft, Crown, Shield, UserPlus, UserMinus, Edit2, Send,
  ThumbsUp, ThumbsDown, MinusCircle, Lock, ChevronDown, ChevronUp, AlertCircle, X
} from "lucide-react";
import type { Party, PartyMember, PartyVote, PartyForumPost, Profile, Proposal } from "@/lib/types";

type Tab = "info" | "members" | "votes" | "forum";

export default function PartyDetailPage() {
  const supabase = createClient();
  const router = useRouter();
  const params = useParams();
  const partyId = params.id as string;

  // Auth
  const [user, setUser] = useState<{ id: string; email?: string } | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isGuest, setIsGuest] = useState(true);

  // Party data
  const [party, setParty] = useState<Party | null>(null);
  const [members, setMembers] = useState<PartyMember[]>([]);
  const [myMembership, setMyMembership] = useState<PartyMember | null>(null);
  const [partyVotes, setPartyVotes] = useState<(PartyVote & { proposals?: Proposal })[]>([]);
  const [forumPosts, setForumPosts] = useState<PartyForumPost[]>([]);
  const [activeProposals, setActiveProposals] = useState<{ id: string; title: string; status: string }[]>([]);

  // UI state
  const [activeTab, setActiveTab] = useState<Tab>("info");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [pendingDelegations, setPendingDelegations] = useState(0);

  // Forum state
  const [newPost, setNewPost] = useState({ title: "", body: "", is_admin_only: false });
  const [posting, setPosting] = useState(false);

  // Edit party state
  const [editing, setEditing] = useState(false);
  const [editData, setEditData] = useState({ description: "", manifesto: "" });

  // Transfer founder state
  const [showTransfer, setShowTransfer] = useState(false);
  const [transferTo, setTransferTo] = useState<string>("");

  const isFounder = myMembership?.role === "founder";
  const isAdmin = myMembership?.role === "admin" || isFounder;
  const isMember = !!myMembership;

  const loadData = useCallback(async () => {
    const { data: { user: u } } = await supabase.auth.getUser();
    setUser(u);
    setIsGuest(!u);

    if (u) {
      const { data: prof } = await supabase.from("profiles").select("*").eq("id", u.id).single();
      setProfile(prof);
      const { count } = await supabase
        .from("delegations").select("*", { count: "exact", head: true })
        .eq("delegate_id", u.id).eq("status", "pending");
      setPendingDelegations(count || 0);
    }

    // Load party
    const { data: p } = await supabase
      .from("parties")
      .select("*, profiles!parties_founder_id_fkey(full_name)")
      .eq("id", partyId)
      .single();
    if (!p) { router.push("/parties"); return; }
    setParty(p);
    setEditData({ description: p.description || "", manifesto: p.manifesto || "" });

    // Load members
    const { data: mems } = await supabase
      .from("party_members")
      .select("*, profiles(full_name, bio, role)")
      .eq("party_id", partyId)
      .order("role", { ascending: true })
      .order("joined_at", { ascending: true });
    setMembers(mems || []);

    // Check my membership
    if (u) {
      const mine = (mems || []).find((m: PartyMember) => m.user_id === u.id);
      setMyMembership(mine || null);
    }

    // Load party votes with proposal info
    const { data: pvotes } = await supabase
      .from("party_votes")
      .select("*, proposals(id, title, status)")
      .eq("party_id", partyId)
      .order("created_at", { ascending: false });
    setPartyVotes(pvotes || []);

    // Load forum posts (only if member - RLS handles this)
    if (u) {
      const { data: posts } = await supabase
        .from("party_forum_posts")
        .select("*, profiles(full_name)")
        .eq("party_id", partyId)
        .is("parent_id", null)
        .order("created_at", { ascending: false });
      setForumPosts(posts || []);
    }

    // Load active proposals (for voting)
    const { data: props } = await supabase
      .from("proposals")
      .select("id, title, status")
      .eq("status", "active")
      .order("created_at", { ascending: false });
    setActiveProposals(props || []);

    setLoading(false);
  }, [supabase, partyId, router]);

  useEffect(() => { loadData(); }, [loadData]);

  // Auto-dismiss success
  useEffect(() => {
    if (success) { const t = setTimeout(() => setSuccess(null), 3000); return () => clearTimeout(t); }
  }, [success]);

  async function handleJoin() {
    if (!user) { router.push("/auth"); return; }
    const { error: err } = await supabase
      .from("party_members")
      .insert({ party_id: partyId, user_id: user.id, role: "member" });
    if (err) { setError(err.message); return; }
    setSuccess("Ti sei iscritto al partito!");
    loadData();
  }

  async function handleLeave() {
    if (!user || !myMembership) return;
    if (isFounder) {
      setError("Il fondatore non può lasciare il partito. Trasferisci prima il ruolo.");
      return;
    }
    const { error: err } = await supabase
      .from("party_members").delete().eq("id", myMembership.id);
    if (err) { setError(err.message); return; }
    setSuccess("Hai lasciato il partito.");
    loadData();
  }

  async function handlePromote(memberId: string, userId: string) {
    const { error: err } = await supabase
      .from("party_members").update({ role: "admin" })
      .eq("party_id", partyId).eq("user_id", userId);
    if (err) { setError(err.message); return; }
    setSuccess("Membro promosso ad admin.");
    loadData();
  }

  async function handleDemote(memberId: string, userId: string) {
    const { error: err } = await supabase
      .from("party_members").update({ role: "member" })
      .eq("party_id", partyId).eq("user_id", userId);
    if (err) { setError(err.message); return; }
    setSuccess("Admin retrocesso a membro.");
    loadData();
  }

  async function handleRemoveMember(userId: string) {
    const { error: err } = await supabase
      .from("party_members").delete()
      .eq("party_id", partyId).eq("user_id", userId);
    if (err) { setError(err.message); return; }
    setSuccess("Membro rimosso.");
    loadData();
  }

  async function handleTransferFounder() {
    if (!transferTo) return;
    const { error: err } = await supabase.rpc("transfer_party_founder", {
      p_party_id: partyId,
      p_new_founder_id: transferTo,
    });
    if (err) { setError(err.message); return; }
    setShowTransfer(false);
    setSuccess("Ruolo di fondatore trasferito!");
    loadData();
  }

  async function handleSetPartyVote(proposalId: string, voteType: string) {
    if (!user) return;
    // Upsert: insert or update
    const existing = partyVotes.find((v) => v.proposal_id === proposalId);
    if (existing) {
      const { error: err } = await supabase
        .from("party_votes")
        .update({ vote_type: voteType, decided_by: user.id })
        .eq("id", existing.id);
      if (err) { setError(err.message); return; }
    } else {
      const { error: err } = await supabase
        .from("party_votes")
        .insert({ party_id: partyId, proposal_id: proposalId, vote_type: voteType, decided_by: user.id });
      if (err) { setError(err.message); return; }
    }
    setSuccess("Posizione del partito registrata!");
    loadData();
  }

  async function handleSaveEdit() {
    const { error: err } = await supabase
      .from("parties")
      .update({ description: editData.description || null, manifesto: editData.manifesto || null })
      .eq("id", partyId);
    if (err) { setError(err.message); return; }
    setEditing(false);
    setSuccess("Partito aggiornato!");
    loadData();
  }

  async function handlePostForum() {
    if (!newPost.body.trim() || !user) return;
    setPosting(true);
    const { error: err } = await supabase.from("party_forum_posts").insert({
      party_id: partyId,
      author_id: user.id,
      title: newPost.title.trim() || null,
      body: newPost.body.trim(),
      is_admin_only: newPost.is_admin_only,
    });
    if (err) { setError(err.message); setPosting(false); return; }
    setNewPost({ title: "", body: "", is_admin_only: false });
    setPosting(false);
    setSuccess("Post pubblicato!");
    loadData();
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0c1220]">
        <Navbar isGuest={true} />
        <div className="text-center text-slate-500 py-20">Caricamento...</div>
      </div>
    );
  }

  if (!party) return null;

  const tabs: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: "info", label: "Info", icon: <Flag className="w-4 h-4" /> },
    { key: "members", label: `Membri (${members.length})`, icon: <Users className="w-4 h-4" /> },
    { key: "votes", label: "Posizioni di Voto", icon: <ThumbsUp className="w-4 h-4" /> },
    ...(isMember ? [{ key: "forum" as Tab, label: "Forum Interno", icon: <Send className="w-4 h-4" /> }] : []),
  ];

  return (
    <div className="min-h-screen bg-[#0c1220]">
      <Navbar
        userEmail={user?.email}
        userName={profile?.full_name}
        userRole={profile?.role}
        isGuest={isGuest}
        pendingDelegations={pendingDelegations}
      />

      <main className="max-w-5xl mx-auto px-4 py-8">
        {/* Back link */}
        <Link href="/parties" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-300 mb-6">
          <ArrowLeft className="w-4 h-4" /> Tutti i partiti
        </Link>

        {/* Alerts */}
        {error && (
          <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-lg p-3 mb-4">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />{error}
            <button onClick={() => setError(null)} className="ml-auto"><X className="w-4 h-4" /></button>
          </div>
        )}
        {success && (
          <div className="bg-green-500/10 border border-green-500/30 text-green-400 text-sm rounded-lg p-3 mb-4">
            {success}
          </div>
        )}

        {/* Party header */}
        <div className="card mb-6">
          <div className="flex items-start gap-4">
            <div className="text-5xl">{party.logo_emoji}</div>
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-white">{party.name}</h1>
              <p className="text-sm text-slate-400 mt-1">
                Fondato da <span className="text-slate-300">{party.profiles?.full_name || "Anonimo"}</span>
                {" · "}{new Date(party.created_at).toLocaleDateString("it-IT")}
                {" · "}{members.length} {members.length === 1 ? "membro" : "membri"}
              </p>
              {!editing && party.description && (
                <p className="text-slate-300 mt-3">{party.description}</p>
              )}
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              {!isGuest && !isMember && (
                <button onClick={handleJoin} className="btn-primary flex items-center gap-2">
                  <UserPlus className="w-4 h-4" /> Iscriviti
                </button>
              )}
              {isMember && !isFounder && (
                <button onClick={handleLeave} className="btn-ghost text-red-400 flex items-center gap-2">
                  <UserMinus className="w-4 h-4" /> Lascia
                </button>
              )}
              {isAdmin && (
                <button onClick={() => setEditing(!editing)} className="btn-ghost flex items-center gap-2">
                  <Edit2 className="w-4 h-4" /> Modifica
                </button>
              )}
            </div>
          </div>

          {/* Edit form */}
          {editing && (
            <div className="mt-4 border-t border-slate-700 pt-4 space-y-3">
              <div>
                <label className="label">Descrizione</label>
                <textarea
                  value={editData.description}
                  onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                  className="input-field w-full h-20 resize-none"
                  maxLength={300}
                />
              </div>
              <div>
                <label className="label">Manifesto</label>
                <textarea
                  value={editData.manifesto}
                  onChange={(e) => setEditData({ ...editData, manifesto: e.target.value })}
                  className="input-field w-full h-32 resize-none"
                  maxLength={5000}
                />
              </div>
              <div className="flex gap-2 justify-end">
                <button onClick={() => setEditing(false)} className="btn-ghost">Annulla</button>
                <button onClick={handleSaveEdit} className="btn-primary">Salva</button>
              </div>
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 border-b border-slate-800 mb-6 overflow-x-auto">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === t.key
                  ? "border-pangea-400 text-pangea-300"
                  : "border-transparent text-slate-500 hover:text-slate-300"
              }`}
            >
              {t.icon}{t.label}
            </button>
          ))}
        </div>

        {/* Tab: Info */}
        {activeTab === "info" && (
          <div className="space-y-6">
            {party.manifesto && (
              <div className="card">
                <h3 className="text-lg font-semibold text-white mb-3">Manifesto</h3>
                <p className="text-slate-300 whitespace-pre-wrap">{party.manifesto}</p>
              </div>
            )}
            {/* Role badges for current user */}
            {isMember && (
              <div className="card">
                <h3 className="text-sm font-semibold text-slate-400 mb-2">Il tuo ruolo</h3>
                <div className="flex items-center gap-2">
                  {isFounder && <span className="flex items-center gap-1 bg-amber-500/20 text-amber-400 text-sm px-3 py-1 rounded-full"><Crown className="w-3.5 h-3.5" /> Fondatore</span>}
                  {myMembership?.role === "admin" && <span className="flex items-center gap-1 bg-blue-500/20 text-blue-400 text-sm px-3 py-1 rounded-full"><Shield className="w-3.5 h-3.5" /> Admin</span>}
                  {myMembership?.role === "member" && <span className="flex items-center gap-1 bg-slate-500/20 text-slate-400 text-sm px-3 py-1 rounded-full"><Users className="w-3.5 h-3.5" /> Membro</span>}
                </div>
                {isFounder && (
                  <button
                    onClick={() => setShowTransfer(!showTransfer)}
                    className="mt-3 text-xs text-slate-500 hover:text-amber-400 transition-colors"
                  >
                    Trasferisci ruolo fondatore →
                  </button>
                )}
                {showTransfer && (
                  <div className="mt-3 p-3 bg-slate-800/50 rounded-lg">
                    <label className="label">Seleziona nuovo fondatore</label>
                    <select
                      value={transferTo}
                      onChange={(e) => setTransferTo(e.target.value)}
                      className="input-field w-full mb-2"
                    >
                      <option value="">-- Seleziona un membro --</option>
                      {members
                        .filter((m) => m.user_id !== user?.id)
                        .map((m) => (
                          <option key={m.user_id} value={m.user_id}>
                            {m.profiles?.full_name || "Anonimo"} ({m.role})
                          </option>
                        ))}
                    </select>
                    <div className="flex gap-2 justify-end">
                      <button onClick={() => setShowTransfer(false)} className="btn-ghost text-xs">Annulla</button>
                      <button
                        onClick={handleTransferFounder}
                        disabled={!transferTo}
                        className="btn-primary text-xs bg-amber-600 hover:bg-amber-500"
                      >
                        Conferma Trasferimento
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Tab: Members */}
        {activeTab === "members" && (
          <div className="space-y-2">
            {members.map((m) => (
              <div key={m.id} className="card flex items-center gap-3 py-3">
                <div className="w-10 h-10 rounded-full bg-pangea-800 border border-pangea-600 flex items-center justify-center text-pangea-300 font-bold text-sm">
                  {(m.profiles?.full_name || "?")[0].toUpperCase()}
                </div>
                <div className="flex-1">
                  <Link href={`/citizens/${m.user_id}`} className="text-sm font-medium text-white hover:text-pangea-300 transition-colors">
                    {m.profiles?.full_name || "Anonimo"}
                  </Link>
                  <div className="flex items-center gap-2 mt-0.5">
                    {m.role === "founder" && <span className="text-[10px] bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded-full">Fondatore</span>}
                    {m.role === "admin" && <span className="text-[10px] bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded-full">Admin</span>}
                    {m.role === "member" && <span className="text-[10px] bg-slate-500/20 text-slate-400 px-2 py-0.5 rounded-full">Membro</span>}
                    <span className="text-[10px] text-slate-600">Dal {new Date(m.joined_at).toLocaleDateString("it-IT")}</span>
                  </div>
                </div>
                {/* Admin actions */}
                {isAdmin && m.user_id !== user?.id && m.role !== "founder" && (
                  <div className="flex items-center gap-1">
                    {isFounder && m.role === "member" && (
                      <button onClick={() => handlePromote(m.id, m.user_id)} className="btn-ghost text-xs text-blue-400" title="Promuovi ad admin">
                        <Shield className="w-3.5 h-3.5" />
                      </button>
                    )}
                    {isFounder && m.role === "admin" && (
                      <button onClick={() => handleDemote(m.id, m.user_id)} className="btn-ghost text-xs text-slate-400" title="Retrocedi a membro">
                        <ChevronDown className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <button onClick={() => handleRemoveMember(m.user_id)} className="btn-ghost text-xs text-red-400" title="Rimuovi">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Tab: Party Votes */}
        {activeTab === "votes" && (
          <div className="space-y-6">
            {/* Set vote on active proposals (admin only) */}
            {isAdmin && (
              <div className="card border-l-4 border-pangea-500">
                <h3 className="text-sm font-semibold text-pangea-300 mb-3">Esprimi la posizione del partito</h3>
                {activeProposals.length === 0 ? (
                  <p className="text-xs text-slate-500">Nessuna proposta attiva al momento.</p>
                ) : (
                  <div className="space-y-3">
                    {activeProposals.map((prop) => {
                      const currentVote = partyVotes.find((v) => v.proposal_id === prop.id);
                      return (
                        <div key={prop.id} className="flex items-center gap-3 bg-slate-800/50 rounded-lg p-3">
                          <Link href={`/proposals/${prop.id}`} className="flex-1 text-sm text-slate-300 hover:text-white truncate">
                            {prop.title}
                          </Link>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleSetPartyVote(prop.id, "yea")}
                              className={`p-1.5 rounded transition-colors ${currentVote?.vote_type === "yea" ? "bg-green-500/30 text-green-400" : "text-slate-600 hover:text-green-400"}`}
                              title="Favorevole"
                            >
                              <ThumbsUp className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleSetPartyVote(prop.id, "nay")}
                              className={`p-1.5 rounded transition-colors ${currentVote?.vote_type === "nay" ? "bg-red-500/30 text-red-400" : "text-slate-600 hover:text-red-400"}`}
                              title="Contrario"
                            >
                              <ThumbsDown className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleSetPartyVote(prop.id, "abstain")}
                              className={`p-1.5 rounded transition-colors ${currentVote?.vote_type === "abstain" ? "bg-amber-500/30 text-amber-400" : "text-slate-600 hover:text-amber-400"}`}
                              title="Astenuto"
                            >
                              <MinusCircle className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* List of all party votes */}
            <div>
              <h3 className="text-lg font-semibold text-white mb-3">Posizioni pubbliche</h3>
              {partyVotes.length === 0 ? (
                <p className="text-slate-500 text-sm">Il partito non ha ancora espresso posizioni.</p>
              ) : (
                <div className="space-y-2">
                  {partyVotes.map((pv) => (
                    <div key={pv.id} className="card flex items-center gap-3 py-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        pv.vote_type === "yea" ? "bg-green-500/20" : pv.vote_type === "nay" ? "bg-red-500/20" : "bg-amber-500/20"
                      }`}>
                        {pv.vote_type === "yea" && <ThumbsUp className="w-4 h-4 text-green-400" />}
                        {pv.vote_type === "nay" && <ThumbsDown className="w-4 h-4 text-red-400" />}
                        {pv.vote_type === "abstain" && <MinusCircle className="w-4 h-4 text-amber-400" />}
                      </div>
                      <div className="flex-1">
                        <Link href={`/proposals/${pv.proposal_id}`} className="text-sm text-white hover:text-pangea-300 transition-colors">
                          {pv.proposals?.title || "Proposta"}
                        </Link>
                        <p className="text-[10px] text-slate-600 mt-0.5">
                          {pv.vote_type === "yea" ? "Favorevole" : pv.vote_type === "nay" ? "Contrario" : "Astenuto"}
                          {" · "}{new Date(pv.created_at).toLocaleDateString("it-IT")}
                        </p>
                      </div>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                        pv.proposals?.status === "active" ? "bg-green-500/10 text-green-400" : "bg-slate-500/10 text-slate-400"
                      }`}>
                        {pv.proposals?.status || ""}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab: Forum */}
        {activeTab === "forum" && isMember && (
          <div className="space-y-6">
            {/* New post form */}
            <div className="card">
              <h3 className="text-sm font-semibold text-slate-300 mb-3">Nuovo post</h3>
              <input
                type="text"
                value={newPost.title}
                onChange={(e) => setNewPost({ ...newPost, title: e.target.value })}
                placeholder="Titolo (opzionale)"
                className="input-field w-full mb-2"
                maxLength={200}
              />
              <textarea
                value={newPost.body}
                onChange={(e) => setNewPost({ ...newPost, body: e.target.value })}
                placeholder="Scrivi il tuo messaggio..."
                className="input-field w-full h-24 resize-none mb-2"
                maxLength={5000}
              />
              <div className="flex items-center justify-between">
                {isAdmin && (
                  <label className="flex items-center gap-2 text-xs text-slate-400 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newPost.is_admin_only}
                      onChange={(e) => setNewPost({ ...newPost, is_admin_only: e.target.checked })}
                      className="rounded border-slate-600 bg-slate-800"
                    />
                    <Lock className="w-3 h-3" />
                    Solo admin
                  </label>
                )}
                <button
                  onClick={handlePostForum}
                  disabled={!newPost.body.trim() || posting}
                  className="btn-primary text-sm flex items-center gap-2 ml-auto"
                >
                  <Send className="w-3.5 h-3.5" />
                  {posting ? "Invio..." : "Pubblica"}
                </button>
              </div>
            </div>

            {/* Posts */}
            {forumPosts.length === 0 ? (
              <p className="text-slate-500 text-sm text-center py-8">Nessun post nel forum. Inizia la discussione!</p>
            ) : (
              <div className="space-y-3">
                {forumPosts.map((post) => (
                  <div key={post.id} className={`card ${post.is_admin_only ? "border-l-4 border-amber-500/50" : ""}`}>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-sm font-medium text-slate-300">
                        {post.profiles?.full_name || "Anonimo"}
                      </span>
                      {post.is_admin_only && (
                        <span className="flex items-center gap-1 text-[10px] text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full">
                          <Lock className="w-2.5 h-2.5" /> Solo admin
                        </span>
                      )}
                      <span className="text-[10px] text-slate-600">
                        {new Date(post.created_at).toLocaleDateString("it-IT", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                    {post.title && <h4 className="text-white font-medium mb-1">{post.title}</h4>}
                    <p className="text-sm text-slate-400 whitespace-pre-wrap">{post.body}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

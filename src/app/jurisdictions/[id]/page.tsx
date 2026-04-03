"use client";

import { createClient } from "@/lib/supabase/client";
import { useEffect, useState, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import {
  Globe2, Users, ArrowLeft, Crown, Shield, UserPlus, UserMinus, Edit2,
  MapPin, Sparkles, BookOpen, AlertTriangle, AlertCircle, X, ChevronDown
} from "lucide-react";
import type { Jurisdiction, JurisdictionMember, Profile, LawConflict } from "@/lib/types";

type Tab = "info" | "members" | "laws";

interface JurisdictionLaw {
  id: string;
  title: string;
  code: string | null;
  article_number: string | null;
  law_type: string;
  content: string | null;
  simplified_content: string | null;
  is_active: boolean;
  parent_id: string | null;
}

export default function JurisdictionDetailPage() {
  const supabase = createClient();
  const router = useRouter();
  const params = useParams();
  const jurisdictionId = params.id as string;

  // Auth
  const [user, setUser] = useState<{ id: string; email?: string } | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isGuest, setIsGuest] = useState(true);

  // Jurisdiction data
  const [jurisdiction, setJurisdiction] = useState<Jurisdiction | null>(null);
  const [members, setMembers] = useState<JurisdictionMember[]>([]);
  const [myMembership, setMyMembership] = useState<JurisdictionMember | null>(null);
  const [laws, setLaws] = useState<JurisdictionLaw[]>([]);
  const [conflicts, setConflicts] = useState<LawConflict[]>([]);
  const [stats, setStats] = useState<{ member_count: number; law_count: number; active_law_count: number } | null>(null);

  // UI state
  const [activeTab, setActiveTab] = useState<Tab>("info");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [pendingDelegations, setPendingDelegations] = useState(0);

  // Edit state
  const [editing, setEditing] = useState(false);
  const [editData, setEditData] = useState({ description: "", location_name: "" });

  // Transfer founder
  const [showTransfer, setShowTransfer] = useState(false);
  const [transferTo, setTransferTo] = useState("");

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

    // Load jurisdiction
    const { data: j } = await supabase
      .from("jurisdictions")
      .select("*, profiles!jurisdictions_founder_id_fkey(full_name)")
      .eq("id", jurisdictionId)
      .single();
    if (!j) { router.push("/jurisdictions"); return; }
    setJurisdiction(j);
    setEditData({ description: j.description || "", location_name: j.location_name || "" });

    // Load members
    const { data: mems } = await supabase
      .from("jurisdiction_members")
      .select("*, profiles(full_name, bio, role)")
      .eq("jurisdiction_id", jurisdictionId)
      .order("role", { ascending: true })
      .order("joined_at", { ascending: true });
    setMembers(mems || []);

    // Check my membership
    if (u) {
      const mine = (mems || []).find((m: JurisdictionMember) => m.user_id === u.id);
      setMyMembership(mine || null);

      // Check conflicts if not a member
      if (!mine) {
        const { data: conflictData } = await supabase.rpc("check_jurisdiction_law_conflicts", {
          p_user_id: u.id,
          p_new_jurisdiction_id: jurisdictionId,
        });
        if (conflictData && Array.isArray(conflictData)) {
          setConflicts(conflictData);
        }
      }
    }

    // Load jurisdiction-specific laws
    const { data: lawsData } = await supabase
      .from("laws")
      .select("id, title, code, article_number, law_type, content, simplified_content, is_active, parent_id")
      .eq("jurisdiction_id", jurisdictionId)
      .order("order_index", { ascending: true });
    setLaws(lawsData || []);

    // Get stats
    const { data: statsData } = await supabase.rpc("get_jurisdiction_stats", {
      p_jurisdiction_id: jurisdictionId,
    });
    if (statsData) setStats(statsData);

    setLoading(false);
  }, [supabase, jurisdictionId, router]);

  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => {
    if (success) { const t = setTimeout(() => setSuccess(null), 3000); return () => clearTimeout(t); }
  }, [success]);

  async function handleJoin() {
    if (!user) { router.push("/auth"); return; }

    if (conflicts.length > 0) {
      setError(
        `Ci sono ${conflicts.length} potenziali conflitti tra le leggi di questa giurisdizione e le tue giurisdizioni attuali. Controlla i dettagli sotto prima di iscriverti.`
      );
      return;
    }

    const { error: err } = await supabase
      .from("jurisdiction_members")
      .insert({ jurisdiction_id: jurisdictionId, user_id: user.id, role: "member" });
    if (err) {
      if (err.message.includes("duplicate") || err.message.includes("unique")) {
        setError("Sei già membro di questa giurisdizione.");
      } else {
        setError(err.message);
      }
      return;
    }
    setSuccess("Ti sei iscritto alla giurisdizione!");
    loadData();
  }

  async function handleLeave() {
    if (!user || !myMembership) return;
    if (isFounder) {
      setError("Il fondatore non può lasciare la giurisdizione. Trasferisci prima il ruolo.");
      return;
    }
    const { error: err } = await supabase
      .from("jurisdiction_members").delete().eq("id", myMembership.id);
    if (err) { setError(err.message); return; }
    setSuccess("Hai lasciato la giurisdizione.");
    loadData();
  }

  async function handlePromote(userId: string) {
    const { error: err } = await supabase
      .from("jurisdiction_members").update({ role: "admin" })
      .eq("jurisdiction_id", jurisdictionId).eq("user_id", userId);
    if (err) { setError(err.message); return; }
    setSuccess("Membro promosso ad admin.");
    loadData();
  }

  async function handleDemote(userId: string) {
    const { error: err } = await supabase
      .from("jurisdiction_members").update({ role: "member" })
      .eq("jurisdiction_id", jurisdictionId).eq("user_id", userId);
    if (err) { setError(err.message); return; }
    setSuccess("Admin retrocesso a membro.");
    loadData();
  }

  async function handleRemoveMember(userId: string) {
    const { error: err } = await supabase
      .from("jurisdiction_members").delete()
      .eq("jurisdiction_id", jurisdictionId).eq("user_id", userId);
    if (err) { setError(err.message); return; }
    setSuccess("Membro rimosso.");
    loadData();
  }

  async function handleTransferFounder() {
    if (!transferTo || !user) return;
    // Update old founder to admin
    const { error: err1 } = await supabase
      .from("jurisdiction_members")
      .update({ role: "admin" })
      .eq("jurisdiction_id", jurisdictionId)
      .eq("user_id", user.id);
    if (err1) { setError(err1.message); return; }

    // Update new founder
    const { error: err2 } = await supabase
      .from("jurisdiction_members")
      .update({ role: "founder" })
      .eq("jurisdiction_id", jurisdictionId)
      .eq("user_id", transferTo);
    if (err2) { setError(err2.message); return; }

    // Update founder_id in jurisdiction
    const { error: err3 } = await supabase
      .from("jurisdictions")
      .update({ founder_id: transferTo })
      .eq("id", jurisdictionId);
    if (err3) { setError(err3.message); return; }

    setShowTransfer(false);
    setSuccess("Ruolo di fondatore trasferito!");
    loadData();
  }

  async function handleSaveEdit() {
    const updates: Record<string, string | null> = { description: editData.description || null };
    if (jurisdiction?.type === "geographic") {
      updates.location_name = editData.location_name || null;
    }
    const { error: err } = await supabase
      .from("jurisdictions")
      .update(updates)
      .eq("id", jurisdictionId);
    if (err) { setError(err.message); return; }
    setEditing(false);
    setSuccess("Giurisdizione aggiornata!");
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

  if (!jurisdiction) return null;

  const tabs: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: "info", label: "Info", icon: <Globe2 className="w-4 h-4" /> },
    { key: "members", label: `Membri (${members.length})`, icon: <Users className="w-4 h-4" /> },
    { key: "laws", label: `Sotto-leggi (${laws.length})`, icon: <BookOpen className="w-4 h-4" /> },
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
        <Link href="/jurisdictions" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-300 mb-6">
          <ArrowLeft className="w-4 h-4" /> Tutte le giurisdizioni
        </Link>

        {/* Alerts */}
        {error && (
          <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-lg p-3 mb-4">
            <AlertCircle className="w-4 h-4 flex-shrink-0" /><span className="flex-1">{error}</span>
            <button onClick={() => setError(null)} className="ml-auto"><X className="w-4 h-4" /></button>
          </div>
        )}
        {success && (
          <div className="bg-green-500/10 border border-green-500/30 text-green-400 text-sm rounded-lg p-3 mb-4">
            {success}
          </div>
        )}

        {/* Jurisdiction header */}
        <div className="card mb-6">
          <div className="flex items-start gap-4">
            <div className="text-5xl">{jurisdiction.logo_emoji}</div>
            <div className="flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-2xl font-bold text-white">{jurisdiction.name}</h1>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                  jurisdiction.type === "virtual"
                    ? "bg-purple-500/20 text-purple-400"
                    : "bg-emerald-500/20 text-emerald-400"
                }`}>
                  {jurisdiction.type === "virtual" ? (
                    <span className="flex items-center gap-1"><Sparkles className="w-3 h-3" /> Virtuale</span>
                  ) : (
                    <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> Geografica</span>
                  )}
                </span>
              </div>
              <p className="text-sm text-slate-400 mt-1">
                Fondata da <span className="text-slate-300">{jurisdiction.profiles?.full_name || "Anonimo"}</span>
                {" · "}{new Date(jurisdiction.created_at).toLocaleDateString("it-IT")}
                {" · "}{members.length} {members.length === 1 ? "membro" : "membri"}
                {jurisdiction.location_name && (
                  <><span className="mx-1">·</span><MapPin className="w-3 h-3 inline" /> {jurisdiction.location_name}</>
                )}
              </p>
              {!editing && jurisdiction.description && (
                <p className="text-slate-300 mt-3">{jurisdiction.description}</p>
              )}

              {/* Stats bar */}
              {stats && (
                <div className="flex gap-4 mt-3">
                  <div className="text-xs text-slate-500">
                    <span className="text-slate-300 font-medium">{stats.member_count}</span> membri
                  </div>
                  <div className="text-xs text-slate-500">
                    <span className="text-slate-300 font-medium">{stats.law_count}</span> sotto-leggi
                  </div>
                  <div className="text-xs text-slate-500">
                    <span className="text-slate-300 font-medium">{stats.active_law_count}</span> attive
                  </div>
                </div>
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
                  className="input-field w-full h-24 resize-none"
                  maxLength={500}
                />
              </div>
              {jurisdiction.type === "geographic" && (
                <div>
                  <label className="label">Località</label>
                  <input
                    type="text"
                    value={editData.location_name}
                    onChange={(e) => setEditData({ ...editData, location_name: e.target.value })}
                    className="input-field w-full"
                    maxLength={200}
                  />
                </div>
              )}
              <div className="flex gap-2 justify-end">
                <button onClick={() => setEditing(false)} className="btn-ghost">Annulla</button>
                <button onClick={handleSaveEdit} className="btn-primary">Salva</button>
              </div>
            </div>
          )}
        </div>

        {/* Conflict warning (for non-members) */}
        {!isMember && conflicts.length > 0 && (
          <div className="card mb-6 border-l-4 border-amber-500">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="text-sm font-semibold text-amber-300 mb-2">
                  {conflicts.length} Potenziali conflitti rilevati
                </h3>
                <p className="text-xs text-slate-400 mb-3">
                  Alcune sotto-leggi di questa giurisdizione modificano le stesse leggi-base di Pangea
                  già modificate da giurisdizioni a cui appartieni. Verifica i conflitti prima di iscriverti.
                </p>
                <div className="space-y-2">
                  {conflicts.map((c, i) => (
                    <div key={i} className="bg-amber-500/5 border border-amber-500/20 rounded-lg p-3">
                      <p className="text-xs text-amber-300 font-medium mb-1">
                        Legge base: {c.parent_law_code} — {c.parent_law_title}
                      </p>
                      <div className="grid grid-cols-2 gap-2 text-[10px] text-slate-400">
                        <div>
                          <span className="text-slate-500">In questa giurisdizione:</span><br />
                          {c.new_law_code}: {c.new_law_title}
                        </div>
                        <div>
                          <span className="text-slate-500">Nella tua giurisdizione ({c.existing_jurisdiction_name}):</span><br />
                          {c.existing_law_code}: {c.existing_law_title}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

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
            {/* Role */}
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

            {/* Gerarchia */}
            <div className="card">
              <h3 className="text-sm font-semibold text-slate-400 mb-3">Gerarchia legislativa</h3>
              <div className="flex items-center gap-2 text-xs">
                <span className="bg-pangea-800 text-pangea-300 px-3 py-1.5 rounded-lg font-medium">Pangea (Generale)</span>
                <span className="text-slate-600">→</span>
                <span className={`px-3 py-1.5 rounded-lg font-medium ${
                  jurisdiction.type === "virtual"
                    ? "bg-purple-500/20 text-purple-400"
                    : "bg-emerald-500/20 text-emerald-400"
                }`}>
                  {jurisdiction.name}
                </span>
              </div>
              <p className="text-[10px] text-slate-500 mt-2">
                Le leggi generali di Pangea si applicano sempre. Questa giurisdizione può creare sotto-leggi
                che specificano o estendono le leggi generali, ma non possono contraddirle.
              </p>
            </div>
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
                      <button onClick={() => handlePromote(m.user_id)} className="btn-ghost text-xs text-blue-400" title="Promuovi ad admin">
                        <Shield className="w-3.5 h-3.5" />
                      </button>
                    )}
                    {isFounder && m.role === "admin" && (
                      <button onClick={() => handleDemote(m.user_id)} className="btn-ghost text-xs text-slate-400" title="Retrocedi a membro">
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

        {/* Tab: Laws */}
        {activeTab === "laws" && (
          <div className="space-y-4">
            <div className="card border-l-4 border-pangea-500">
              <p className="text-xs text-slate-400">
                Le sotto-leggi di questa giurisdizione specificano o estendono le leggi generali di Pangea.
                Sono collegate all&apos;albero legislativo principale e non possono contraddire le leggi superiori.
              </p>
            </div>

            {laws.length === 0 ? (
              <div className="text-center text-slate-500 py-12">
                <BookOpen className="w-8 h-8 mx-auto mb-3 text-slate-600" />
                <p>Nessuna sotto-legge ancora creata per questa giurisdizione.</p>
                {isAdmin && (
                  <p className="text-xs mt-2 text-slate-600">
                    Le sotto-leggi potranno essere proposte e votate dai membri.
                  </p>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                {laws.map((law) => (
                  <div key={law.id} className={`card py-3 ${!law.is_active ? "opacity-60" : ""}`}>
                    <div className="flex items-center gap-2 mb-1">
                      {law.code && (
                        <span className="text-[10px] font-mono bg-slate-800 text-slate-400 px-2 py-0.5 rounded">
                          {law.code}
                        </span>
                      )}
                      {law.article_number && (
                        <span className="text-[10px] text-slate-500">Art. {law.article_number}</span>
                      )}
                      <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                        law.is_active
                          ? "bg-green-500/10 text-green-400"
                          : "bg-slate-500/10 text-slate-500"
                      }`}>
                        {law.is_active ? "Attiva" : "Inattiva"}
                      </span>
                    </div>
                    <h4 className="text-sm font-medium text-white">{law.title}</h4>
                    {law.content && (
                      <p className="text-xs text-slate-400 mt-1 line-clamp-2">{law.content}</p>
                    )}
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

"use client";

import { createClient } from "@/lib/supabase/client";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import { MapPin, Globe2, Plus, Users, Search, X, AlertCircle, ChevronRight, Sparkles } from "lucide-react";
import type { Jurisdiction, Profile } from "@/lib/types";

export default function JurisdictionsPage() {
  const supabase = createClient();
  const router = useRouter();

  // Auth state
  const [user, setUser] = useState<{ id: string; email?: string } | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isGuest, setIsGuest] = useState(true);

  // Jurisdiction list
  const [jurisdictions, setJurisdictions] = useState<(Jurisdiction & { member_count: number; is_member: boolean })[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<"all" | "virtual" | "geographic">("all");

  // Create modal
  const [showCreate, setShowCreate] = useState(false);
  const [newJurisdiction, setNewJurisdiction] = useState({
    name: "",
    description: "",
    type: "virtual" as "virtual" | "geographic",
    logo_emoji: "🌐",
    location_name: "",
  });
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Emoji options
  const emojiOptions = ["🌐", "🏔️", "🌊", "🏙️", "🌿", "🔮", "⚡", "🎭", "🏛️", "🌍", "🏝️", "🌸", "🦅", "🔥", "💎"];

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

      const { count } = await supabase
        .from("delegations")
        .select("*", { count: "exact", head: true })
        .eq("delegate_id", u.id)
        .eq("status", "pending");
      setPendingDelegations(count || 0);
    }

    // Load all active jurisdictions
    const { data: jurisdictionsData } = await supabase
      .from("jurisdictions")
      .select("*, profiles!jurisdictions_founder_id_fkey(full_name)")
      .eq("is_active", true)
      .order("created_at", { ascending: false });

    if (jurisdictionsData) {
      const enriched = await Promise.all(
        jurisdictionsData.map(async (j: Jurisdiction & { profiles?: { full_name: string | null } }) => {
          const { count } = await supabase
            .from("jurisdiction_members")
            .select("*", { count: "exact", head: true })
            .eq("jurisdiction_id", j.id);

          let is_member = false;
          if (u) {
            const { data: mem } = await supabase
              .from("jurisdiction_members")
              .select("id")
              .eq("jurisdiction_id", j.id)
              .eq("user_id", u.id)
              .maybeSingle();
            is_member = !!mem;
          }

          return { ...j, member_count: count || 0, is_member };
        })
      );
      setJurisdictions(enriched);
    }

    setLoading(false);
  }, [supabase]);

  useEffect(() => { loadData(); }, [loadData]);

  async function handleCreate() {
    if (!newJurisdiction.name.trim()) {
      setError("Il nome della giurisdizione è obbligatorio");
      return;
    }
    if (newJurisdiction.type === "geographic" && !newJurisdiction.location_name.trim()) {
      setError("Le giurisdizioni geografiche richiedono un nome di località");
      return;
    }
    setCreating(true);
    setError(null);

    const { data, error: err } = await supabase.rpc("create_jurisdiction", {
      p_name: newJurisdiction.name.trim(),
      p_description: newJurisdiction.description.trim() || null,
      p_type: newJurisdiction.type,
      p_logo_emoji: newJurisdiction.logo_emoji,
      p_location_name: newJurisdiction.location_name.trim() || null,
    });

    if (err) {
      if (err.message.includes("unique") || err.message.includes("duplicate")) {
        setError("Esiste già una giurisdizione con questo nome.");
      } else {
        setError(err.message);
      }
      setCreating(false);
      return;
    }

    router.push(`/jurisdictions/${data}`);
  }

  async function handleJoin(jurisdictionId: string) {
    if (!user) { router.push("/auth"); return; }

    // Check for conflicts first
    const { data: conflicts } = await supabase.rpc("check_jurisdiction_law_conflicts", {
      p_user_id: user.id,
      p_new_jurisdiction_id: jurisdictionId,
    });

    if (conflicts && Array.isArray(conflicts) && conflicts.length > 0) {
      setError(
        `Attenzione: trovati ${conflicts.length} potenziali conflitti tra le leggi di questa giurisdizione e quelle delle tue giurisdizioni attuali. Visita la pagina della giurisdizione per i dettagli.`
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
    loadData();
  }

  const filteredJurisdictions = jurisdictions.filter((j) => {
    const matchesSearch =
      j.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (j.description || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (j.location_name || "").toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = filterType === "all" || j.type === filterType;
    return matchesSearch && matchesType;
  });

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
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-3">
              <Globe2 className="w-7 h-7 text-pangea-400" />
              Sotto-giurisdizioni
            </h1>
            <p className="text-slate-400 mt-1">
              Comunità autonome all&apos;interno di Pangea, con le proprie sotto-leggi.
            </p>
          </div>
          {!isGuest && (
            <button
              onClick={() => setShowCreate(true)}
              className="btn-primary flex items-center gap-2 whitespace-nowrap"
            >
              <Plus className="w-4 h-4" />
              Crea Giurisdizione
            </button>
          )}
        </div>

        {/* Info card */}
        <div className="card p-6 mb-8 border-l-4 border-pangea-500">
          <h3 className="text-sm font-semibold text-pangea-300 mb-3">Come funzionano le Sotto-giurisdizioni</h3>
          <ul className="text-sm text-slate-400 space-y-2 leading-relaxed">
            <li>• Esistono due tipi: <strong className="text-slate-300">Virtuali</strong> (comunità unite da un ideale, come &quot;Ambientalisti Globali&quot;) e <strong className="text-slate-300">Geografiche</strong> (legate a un luogo, come &quot;Comunità di Milano&quot;)</li>
            <li>• Puoi appartenere a <strong className="text-slate-300">più giurisdizioni</strong> contemporaneamente, purché le loro sotto-leggi non siano in conflitto tra loro</li>
            <li>• Le leggi di Pangea sono sempre <strong className="text-slate-300">superiori</strong> — le sotto-leggi possono aggiungere dettagli o regole locali, ma mai contraddire la legge madre</li>
            <li>• Ogni giurisdizione può proporre <strong className="text-slate-300">sotto-leggi specifiche</strong> collegate a una legge di Pangea esistente</li>
            <li>• Il sistema rileva automaticamente i <strong className="text-slate-300">conflitti</strong>: se provi a iscriverti a una giurisdizione le cui leggi contraddicono quelle di una a cui già appartieni, verrai avvisato</li>
          </ul>
          <div className="bg-slate-800/60 rounded-lg p-3 mt-3">
            <p className="text-xs text-slate-300 font-medium mb-1">Esempio:</p>
            <p className="text-xs text-slate-400">
              La giurisdizione &quot;Comunità Verde&quot; potrebbe creare una sotto-legge collegata al Codice Ambientale di Pangea
              che stabilisce regole più stringenti sulla gestione dei rifiuti per i propri membri. Questa sotto-legge non può
              contraddire il Codice Ambientale, ma può aggiungere obblighi specifici per chi aderisce volontariamente.
            </p>
          </div>
        </div>

        {/* Search + Filter */}
        <div className="flex gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="text"
              placeholder="Cerca giurisdizioni..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input-field pl-10 w-full"
            />
          </div>
          <div className="flex gap-1 bg-slate-800 rounded-lg p-1">
            {(["all", "virtual", "geographic"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setFilterType(t)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  filterType === t
                    ? "bg-pangea-700 text-pangea-200"
                    : "text-slate-500 hover:text-slate-300"
                }`}
              >
                {t === "all" ? "Tutte" : t === "virtual" ? "Virtuali" : "Geografiche"}
              </button>
            ))}
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-lg p-3 mb-4">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span className="flex-1">{error}</span>
            <button onClick={() => setError(null)} className="ml-auto"><X className="w-4 h-4" /></button>
          </div>
        )}

        {/* Jurisdiction list */}
        {loading ? (
          <div className="text-center text-slate-500 py-12">Caricamento giurisdizioni...</div>
        ) : filteredJurisdictions.length === 0 ? (
          <div className="text-center text-slate-500 py-12">
            {searchQuery || filterType !== "all"
              ? "Nessuna giurisdizione trovata con questi filtri."
              : "Nessuna giurisdizione ancora creata. Sii il primo!"}
          </div>
        ) : (
          <div className="grid gap-4">
            {filteredJurisdictions.map((j) => (
              <Link
                key={j.id}
                href={`/jurisdictions/${j.id}`}
                className="card p-6 hover:border-pangea-600/50 transition-all group"
              >
                <div className="flex items-start gap-4">
                  <div className="text-3xl flex-shrink-0 mt-1">{j.logo_emoji}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <h2 className="text-lg font-semibold text-white group-hover:text-pangea-300 transition-colors">
                        {j.name}
                      </h2>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                        j.type === "virtual"
                          ? "bg-purple-500/20 text-purple-400"
                          : "bg-emerald-500/20 text-emerald-400"
                      }`}>
                        {j.type === "virtual" ? (
                          <span className="flex items-center gap-1"><Sparkles className="w-2.5 h-2.5" /> Virtuale</span>
                        ) : (
                          <span className="flex items-center gap-1"><MapPin className="w-2.5 h-2.5" /> Geografica</span>
                        )}
                      </span>
                      {j.is_member && (
                        <span className="text-[10px] bg-pangea-800 text-pangea-300 px-2 py-0.5 rounded-full font-medium">
                          Membro
                        </span>
                      )}
                    </div>
                    {j.description && (
                      <p className="text-sm text-slate-400 line-clamp-2 mb-2">{j.description}</p>
                    )}
                    <div className="flex items-center gap-4 text-xs text-slate-500 flex-wrap">
                      <span className="flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        {j.member_count} {j.member_count === 1 ? "membro" : "membri"}
                      </span>
                      {j.location_name && (
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {j.location_name}
                        </span>
                      )}
                      <span>Fondata da {j.profiles?.full_name || "Anonimo"}</span>
                      <span>{new Date(j.created_at).toLocaleDateString("it-IT")}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {!isGuest && !j.is_member && (
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleJoin(j.id);
                        }}
                        className="btn-primary text-xs py-1.5 px-3"
                      >
                        Iscriviti
                      </button>
                    )}
                    <ChevronRight className="w-5 h-5 text-slate-600 group-hover:text-pangea-400 transition-colors" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>

      {/* Create jurisdiction modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Globe2 className="w-5 h-5 text-pangea-400" />
                Crea Giurisdizione
              </h2>
              <button onClick={() => { setShowCreate(false); setError(null); }} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            {error && (
              <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-lg p-3 mb-4">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {error}
              </div>
            )}

            {/* Type selector */}
            <div className="mb-4">
              <label className="label">Tipo di giurisdizione *</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setNewJurisdiction({ ...newJurisdiction, type: "virtual" })}
                  className={`p-4 rounded-lg border text-center transition-all ${
                    newJurisdiction.type === "virtual"
                      ? "border-purple-500 bg-purple-500/10"
                      : "border-slate-700 bg-slate-800 hover:border-slate-600"
                  }`}
                >
                  <Sparkles className={`w-6 h-6 mx-auto mb-2 ${newJurisdiction.type === "virtual" ? "text-purple-400" : "text-slate-500"}`} />
                  <p className={`text-sm font-medium ${newJurisdiction.type === "virtual" ? "text-purple-300" : "text-slate-400"}`}>Virtuale</p>
                  <p className="text-[10px] text-slate-500 mt-1">Unita da un ideale o interesse comune</p>
                </button>
                <button
                  onClick={() => setNewJurisdiction({ ...newJurisdiction, type: "geographic" })}
                  className={`p-4 rounded-lg border text-center transition-all ${
                    newJurisdiction.type === "geographic"
                      ? "border-emerald-500 bg-emerald-500/10"
                      : "border-slate-700 bg-slate-800 hover:border-slate-600"
                  }`}
                >
                  <MapPin className={`w-6 h-6 mx-auto mb-2 ${newJurisdiction.type === "geographic" ? "text-emerald-400" : "text-slate-500"}`} />
                  <p className={`text-sm font-medium ${newJurisdiction.type === "geographic" ? "text-emerald-300" : "text-slate-400"}`}>Geografica</p>
                  <p className="text-[10px] text-slate-500 mt-1">Legata a un luogo fisico con prova di residenza</p>
                </button>
              </div>
            </div>

            {/* Emoji selector */}
            <div className="mb-4">
              <label className="label">Simbolo</label>
              <div className="flex flex-wrap gap-2">
                {emojiOptions.map((e) => (
                  <button
                    key={e}
                    onClick={() => setNewJurisdiction({ ...newJurisdiction, logo_emoji: e })}
                    className={`text-2xl p-2 rounded-lg transition-colors ${
                      newJurisdiction.logo_emoji === e
                        ? "bg-pangea-800 border border-pangea-500"
                        : "bg-slate-800 border border-slate-700 hover:border-slate-600"
                    }`}
                  >
                    {e}
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-4">
              <label className="label">Nome della Giurisdizione *</label>
              <input
                type="text"
                value={newJurisdiction.name}
                onChange={(e) => setNewJurisdiction({ ...newJurisdiction, name: e.target.value })}
                className="input-field w-full"
                placeholder={newJurisdiction.type === "virtual" ? "es. Comunità della Sostenibilità" : "es. Distretto di Lisbona"}
                maxLength={100}
              />
            </div>

            {newJurisdiction.type === "geographic" && (
              <div className="mb-4">
                <label className="label">Località *</label>
                <input
                  type="text"
                  value={newJurisdiction.location_name}
                  onChange={(e) => setNewJurisdiction({ ...newJurisdiction, location_name: e.target.value })}
                  className="input-field w-full"
                  placeholder="es. Lisbona, Portogallo"
                  maxLength={200}
                />
                <p className="text-[10px] text-slate-500 mt-1">In futuro sarà richiesta una prova di residenza per le giurisdizioni geografiche.</p>
              </div>
            )}

            <div className="mb-6">
              <label className="label">Descrizione</label>
              <textarea
                value={newJurisdiction.description}
                onChange={(e) => setNewJurisdiction({ ...newJurisdiction, description: e.target.value })}
                className="input-field w-full h-24 resize-none"
                placeholder="Descrivi la missione e gli obiettivi di questa giurisdizione..."
                maxLength={500}
              />
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => { setShowCreate(false); setError(null); }}
                className="btn-ghost px-4 py-2"
              >
                Annulla
              </button>
              <button
                onClick={handleCreate}
                disabled={creating || !newJurisdiction.name.trim()}
                className="btn-primary px-6 py-2"
              >
                {creating ? "Creazione..." : "Crea Giurisdizione"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

"use client";

import { createClient } from "@/lib/supabase/client";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import { Flag, Plus, Users, Search, X, AlertCircle, ChevronRight } from "lucide-react";
import type { Party, Profile } from "@/lib/types";

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
      setError("Il nome del partito è obbligatorio");
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
        setError("Per creare un partito è necessario attivare la funzione delega nelle tue impostazioni personali.");
      } else if (err.message.includes("unique") || err.message.includes("duplicate")) {
        setError("Esiste già un partito con questo nome.");
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
              <Flag className="w-7 h-7 text-pangea-400" />
              Partiti Politici
            </h1>
            <p className="text-slate-400 mt-1">
              Organizzati in partiti per influenzare il voto sulle proposte. Puoi iscriverti a più partiti.
            </p>
          </div>
          {!isGuest && (
            <button
              onClick={() => setShowCreate(true)}
              className="btn-primary flex items-center gap-2 whitespace-nowrap"
            >
              <Plus className="w-4 h-4" />
              Crea Partito
            </button>
          )}
        </div>

        {/* Info card */}
        <div className="card mb-6 border-l-4 border-pangea-500">
          <h3 className="text-sm font-semibold text-pangea-300 mb-2">Come funzionano i Partiti</h3>
          <ul className="text-sm text-slate-400 space-y-2 leading-relaxed">
            <li>• Puoi iscriverti a <strong className="text-slate-300">più partiti</strong> contemporaneamente — ad esempio al Partito Verde e al Partito Scientifico insieme</li>
            <li>• I partiti esprimono un <strong className="text-slate-300">voto pubblico</strong> su ogni proposta. Se non voti direttamente, il tuo voto viene automaticamente diviso tra i partiti a cui sei iscritto, secondo i pesi che imposti nelle <strong className="text-slate-300">Impostazioni</strong></li>
            <li>• Il tuo <strong className="text-slate-300">voto diretto</strong> ha sempre la priorità: se voti personalmente su una proposta, il voto dei partiti viene ignorato per quella proposta (e puoi ripristinarlo in qualsiasi momento)</li>
            <li>• Per creare un nuovo partito devi avere la <strong className="text-slate-300">funzione delega attivata</strong> nelle impostazioni del profilo</li>
          </ul>
          <div className="bg-slate-800/60 rounded-lg p-3 mt-3">
            <p className="text-xs text-slate-300 font-medium mb-1">Esempio:</p>
            <p className="text-xs text-slate-400">
              Mario è iscritto al Partito Verde (peso 3) e al Partito Scientifico (peso 1). Su una proposta dove non vota direttamente,
              il 75% del suo voto segue la posizione del Partito Verde e il 25% quella del Partito Scientifico.
              Se Mario decide di votare in prima persona, il suo voto diretto sostituisce completamente quello dei partiti.
            </p>
          </div>
        </div>

        {/* Search */}
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            placeholder="Cerca partiti..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input-field pl-10 w-full"
          />
        </div>

        {/* Error */}
        {error && (
          <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-lg p-3 mb-4">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {error}
            <button onClick={() => setError(null)} className="ml-auto"><X className="w-4 h-4" /></button>
          </div>
        )}

        {/* Party list */}
        {loading ? (
          <div className="text-center text-slate-500 py-12">Caricamento partiti...</div>
        ) : filteredParties.length === 0 ? (
          <div className="text-center text-slate-500 py-12">
            {searchQuery ? "Nessun partito trovato." : "Nessun partito ancora creato. Sii il primo!"}
          </div>
        ) : (
          <div className="grid gap-4">
            {filteredParties.map((party) => (
              <Link
                key={party.id}
                href={`/parties/${party.id}`}
                className="card hover:border-pangea-600/50 transition-all group"
              >
                <div className="flex items-start gap-4">
                  <div className="text-3xl flex-shrink-0 mt-1">{party.logo_emoji}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h2 className="text-lg font-semibold text-white group-hover:text-pangea-300 transition-colors">
                        {party.name}
                      </h2>
                      {party.is_member && (
                        <span className="text-[10px] bg-pangea-800 text-pangea-300 px-2 py-0.5 rounded-full font-medium">
                          Iscritto
                        </span>
                      )}
                    </div>
                    {party.description && (
                      <p className="text-sm text-slate-400 line-clamp-2 mb-2">{party.description}</p>
                    )}
                    <div className="flex items-center gap-4 text-xs text-slate-500">
                      <span className="flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        {party.member_count} {party.member_count === 1 ? "membro" : "membri"}
                      </span>
                      <span>Fondato da {party.profiles?.full_name || "Anonimo"}</span>
                      <span>{new Date(party.created_at).toLocaleDateString("it-IT")}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {!isGuest && !party.is_member && (
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleJoinParty(party.id);
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

      {/* Create party modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-xl max-w-lg w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Flag className="w-5 h-5 text-pangea-400" />
                Crea Partito
              </h2>
              <button onClick={() => { setShowCreate(false); setError(null); }} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Delegation warning */}
            {profile && !profile.allow_delegations && (
              <div className="flex items-start gap-2 bg-amber-500/10 border border-amber-500/30 text-amber-400 text-sm rounded-lg p-3 mb-4">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium">Funzione delega non attivata</p>
                  <p className="text-xs mt-1">Per creare un partito è necessario attivare la funzione delega nelle tue{" "}
                    <Link href="/settings" className="underline text-amber-300">impostazioni personali</Link>.
                  </p>
                </div>
              </div>
            )}

            {error && (
              <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-lg p-3 mb-4">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {error}
              </div>
            )}

            {/* Emoji selector */}
            <div className="mb-4">
              <label className="label">Simbolo</label>
              <div className="flex flex-wrap gap-2">
                {emojiOptions.map((e) => (
                  <button
                    key={e}
                    onClick={() => setNewParty({ ...newParty, logo_emoji: e })}
                    className={`text-2xl p-2 rounded-lg transition-colors ${
                      newParty.logo_emoji === e
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
              <label className="label">Nome del Partito *</label>
              <input
                type="text"
                value={newParty.name}
                onChange={(e) => setNewParty({ ...newParty, name: e.target.value })}
                className="input-field w-full"
                placeholder="es. Partito della Sostenibilità Globale"
                maxLength={100}
              />
            </div>

            <div className="mb-4">
              <label className="label">Descrizione breve</label>
              <textarea
                value={newParty.description}
                onChange={(e) => setNewParty({ ...newParty, description: e.target.value })}
                className="input-field w-full h-20 resize-none"
                placeholder="Una frase che descrive la missione del partito..."
                maxLength={300}
              />
            </div>

            <div className="mb-6">
              <label className="label">Manifesto (opzionale)</label>
              <textarea
                value={newParty.manifesto}
                onChange={(e) => setNewParty({ ...newParty, manifesto: e.target.value })}
                className="input-field w-full h-32 resize-none"
                placeholder="I principi fondamentali, gli obiettivi e i valori del partito..."
                maxLength={5000}
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
                onClick={handleCreateParty}
                disabled={creating || !newParty.name.trim()}
                className="btn-primary px-6 py-2"
              >
                {creating ? "Creazione..." : "Crea Partito"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

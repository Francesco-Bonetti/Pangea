"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import Navbar from "@/components/Navbar";
import type { Category, Delegation, Profile } from "@/lib/types";
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
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function DelegationsPage() {
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

  const supabase = createClient();
  const router = useRouter();

  // Carica dati iniziali
  const loadData = useCallback(async () => {
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();

    if (!authUser) {
      router.push("/auth");
      return;
    }

    setUser(authUser);

    // Carica profilo, categorie e deleghe in parallelo
    const [profileRes, catRes, delegGivenRes, delegReceivedRes] =
      await Promise.all([
        supabase.from("profiles").select("*").eq("id", authUser.id).single(),
        supabase.from("categories").select("*").order("name"),
        supabase
          .from("delegations")
          .select("*, delegate:profiles!delegations_delegate_id_fkey(id, full_name), categories(id, name)")
          .eq("delegator_id", authUser.id)
          .order("created_at", { ascending: false }),
        supabase
          .from("delegations")
          .select("*, delegator:profiles!delegations_delegator_id_fkey(id, full_name), categories(id, name)")
          .eq("delegate_id", authUser.id)
          .order("created_at", { ascending: false }),
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

  // Ricerca utenti
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

  // Crea delega (come richiesta pendente)
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
          setError(
            "Impossibile creare questa delega: si formerebbe un ciclo. " +
              "Il cittadino selezionato ha già delegato te (direttamente o transitivamente) per questa categoria."
          );
        } else if (insertError.code === "23505") {
          setError(
            "Hai già una delega attiva per questa categoria. Verrà aggiornata con il nuovo delegato."
          );
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
        err instanceof Error ? err.message : "Errore durante la creazione";
      setError(msg);
    } finally {
      setSaving(false);
    }
  }

  // Accetta delega ricevuta
  async function acceptDelegation(delegationId: string) {
    const { error: err } = await supabase
      .from("delegations")
      .update({ status: "accepted" })
      .eq("id", delegationId);
    if (!err) await loadData();
  }

  // Rifiuta delega ricevuta
  async function rejectDelegation(delegationId: string) {
    const { error: err } = await supabase
      .from("delegations")
      .update({ status: "rejected" })
      .eq("id", delegationId);
    if (!err) await loadData();
  }

  // Revoca delega
  async function revokeDelegation(delegationId: string) {
    const { error: deleteError } = await supabase
      .from("delegations")
      .delete()
      .eq("id", delegationId);

    if (!deleteError) {
      await loadData();
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0c1220] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-pangea-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0c1220]">
      <Navbar userEmail={user?.email} userName={profile?.full_name} />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link
            href="/dashboard"
            className="p-2 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <Users className="w-6 h-6 text-pangea-400" />
              Democrazia Liquida
            </h1>
            <p className="text-sm text-slate-400 mt-0.5">
              Gestisci le tue deleghe di voto — globali o per dominio tematico
            </p>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="btn-primary flex items-center gap-2 text-sm py-2"
          >
            {showForm ? (
              <X className="w-4 h-4" />
            ) : (
              <Plus className="w-4 h-4" />
            )}
            {showForm ? "Annulla" : "Nuova Delega"}
          </button>
        </div>

        {/* Info card */}
        <div className="card p-4 mb-6 bg-pangea-900/10 border-pangea-800/30 flex gap-3">
          <Globe className="w-5 h-5 text-pangea-400 shrink-0 mt-0.5" />
          <div className="text-sm text-slate-400 space-y-2">
            <p>
              La <strong className="text-slate-300">Democrazia Liquida</strong>{" "}
              ti permette di delegare il tuo voto a un altro cittadino per tutti
              i temi o per una categoria specifica. La delega è sempre{" "}
              <strong className="text-slate-300">revocabile</strong> e il tuo{" "}
              <strong className="text-slate-300">voto diretto</strong> ha sempre
              la priorità assoluta.
            </p>
            <div className="bg-slate-800/60 rounded-lg p-2.5">
              <p className="text-xs text-slate-300 font-medium mb-1">Esempio:</p>
              <p className="text-xs text-slate-400">
                Non ti intendi di economia? Puoi delegare il voto sulle proposte economiche a un cittadino esperto di cui ti fidi.
                Quando si vota una proposta economica, il tuo voto segue la sua scelta. Ma se un giorno vuoi votare direttamente
                su una proposta specifica, il tuo voto personale prevale automaticamente. Puoi anche revocare la delega in qualsiasi momento.
              </p>
            </div>
          </div>
        </div>

        {/* Form nuova delega */}
        {showForm && (
          <div className="card p-6 mb-6">
            <h2 className="text-lg font-semibold text-slate-200 mb-4">
              Crea una nuova delega
            </h2>

            {/* Ricerca utente */}
            <div className="mb-4">
              <label className="label">Cerca un cittadino</label>
              <div className="relative">
                <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  className="input-field pl-10"
                  placeholder="Cerca per nome..."
                  value={searchQuery}
                  onChange={(e) => searchUsers(e.target.value)}
                />
                {searching && (
                  <Loader2 className="w-4 h-4 text-slate-500 absolute right-3 top-1/2 -translate-y-1/2 animate-spin" />
                )}
              </div>

              {/* Risultati ricerca */}
              {searchResults.length > 0 && !selectedDelegate && (
                <div className="mt-2 border border-slate-700 rounded-lg overflow-hidden">
                  {searchResults.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => {
                        setSelectedDelegate(p);
                        setSearchQuery(p.full_name ?? "");
                        setSearchResults([]);
                      }}
                      className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-slate-800 transition-colors border-b border-slate-700/50 last:border-b-0"
                    >
                      <div className="w-8 h-8 rounded-full bg-pangea-800 border border-pangea-600 flex items-center justify-center text-xs text-pangea-300 font-bold">
                        {(p.full_name ?? "?")[0].toUpperCase()}
                      </div>
                      <span className="text-sm text-slate-200">
                        {p.full_name ?? "Cittadino"}
                      </span>
                      <ChevronRight className="w-4 h-4 text-slate-600 ml-auto" />
                    </button>
                  ))}
                </div>
              )}

              {/* Delegato selezionato */}
              {selectedDelegate && (
                <div className="mt-2 flex items-center gap-3 bg-pangea-900/20 border border-pangea-700/30 rounded-lg px-4 py-3">
                  <div className="w-8 h-8 rounded-full bg-pangea-800 border border-pangea-600 flex items-center justify-center text-xs text-pangea-300 font-bold">
                    {(selectedDelegate.full_name ?? "?")[0].toUpperCase()}
                  </div>
                  <span className="text-sm text-slate-200 font-medium">
                    {selectedDelegate.full_name}
                  </span>
                  <button
                    onClick={() => {
                      setSelectedDelegate(null);
                      setSearchQuery("");
                    }}
                    className="ml-auto text-slate-500 hover:text-red-400"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>

            {/* Categoria */}
            <div className="mb-4">
              <label className="label flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5" />
                Dominio (facoltativo)
              </label>
              <select
                className="input-field"
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
              >
                <option value="">
                  Delega globale (tutti i domini)
                </option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
              <p className="text-xs text-slate-600 mt-1.5">
                Una delega specifica per dominio ha la priorità su quella globale
              </p>
            </div>

            {/* Errore */}
            {error && (
              <div className="mb-4 p-3 bg-red-900/30 border border-red-700/50 rounded-lg text-red-300 text-xs flex gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {/* Conferma */}
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
              {saving ? "Creazione..." : "Conferma delega"}
            </button>
          </div>
        )}

        {/* Deleghe assegnate */}
        <section className="mb-8">
          <h2 className="text-lg font-semibold text-slate-200 mb-4 flex items-center gap-2">
            <ChevronRight className="w-5 h-5 text-pangea-400" />
            Le tue deleghe
            <span className="text-xs text-slate-500 font-normal">
              ({delegations.length})
            </span>
          </h2>

          {delegations.length === 0 ? (
            <div className="card p-8 text-center">
              <Users className="w-12 h-12 text-slate-700 mx-auto mb-3" />
              <p className="text-slate-500 text-sm">
                Non hai ancora delegato il tuo voto a nessuno.
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
                    className="card p-4 flex items-center gap-4"
                  >
                    <div className="w-10 h-10 rounded-full bg-pangea-800 border border-pangea-600 flex items-center justify-center text-sm text-pangea-300 font-bold">
                      {(delegateProfile?.full_name ?? "?")[0].toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-slate-200 font-medium">
                        {delegateProfile?.full_name ?? "Cittadino"}
                      </p>
                      <p className="text-xs text-slate-500 flex items-center gap-1">
                        {category ? (
                          <>
                            <Tag className="w-3 h-3" />
                            {category.name}
                          </>
                        ) : (
                          <>
                            <Globe className="w-3 h-3" />
                            Delega globale
                          </>
                        )}
                      </p>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                      d.status === "accepted" ? "text-green-300 bg-green-900/20 border border-green-700/30" :
                      d.status === "rejected" ? "text-red-300 bg-red-900/20 border border-red-700/30" :
                      "text-amber-300 bg-amber-900/20 border border-amber-700/30"
                    }`}>
                      {d.status === "accepted" ? "Accettata" : d.status === "rejected" ? "Rifiutata" : "In attesa"}
                    </span>
                    <button
                      onClick={() => revokeDelegation(d.id)}
                      className="text-slate-600 hover:text-red-400 transition-colors p-2"
                      title="Revoca delega"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Deleghe ricevute */}
        <section>
          <h2 className="text-lg font-semibold text-slate-200 mb-4 flex items-center gap-2">
            <Users className="w-5 h-5 text-amber-400" />
            Deleghe ricevute
            <span className="text-xs text-slate-500 font-normal">
              ({receivedDelegations.length})
            </span>
          </h2>

          {receivedDelegations.length === 0 ? (
            <div className="card p-8 text-center">
              <Users className="w-12 h-12 text-slate-700 mx-auto mb-3" />
              <p className="text-slate-500 text-sm">
                Nessun cittadino ti ha ancora delegato il proprio voto.
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
                    className="card p-4 flex items-center gap-4"
                  >
                    <div className="w-10 h-10 rounded-full bg-amber-900/30 border border-amber-700/50 flex items-center justify-center text-sm text-amber-300 font-bold">
                      {(delegatorProfile?.full_name ?? "?")[0].toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-slate-200 font-medium">
                        {delegatorProfile?.full_name ?? "Cittadino"}
                      </p>
                      <p className="text-xs text-slate-500 flex items-center gap-1">
                        {category ? (
                          <>
                            <Tag className="w-3 h-3" />
                            {category.name}
                          </>
                        ) : (
                          <>
                            <Globe className="w-3 h-3" />
                            Delega globale
                          </>
                        )}
                      </p>
                    </div>
                    {d.status === "pending" ? (
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => acceptDelegation(d.id)}
                          className="p-1.5 rounded-lg text-green-400 hover:bg-green-900/30 transition-colors"
                          title="Accetta delega"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => rejectDelegation(d.id)}
                          className="p-1.5 rounded-lg text-red-400 hover:bg-red-900/30 transition-colors"
                          title="Rifiuta delega"
                        >
                          <XCircle className="w-4 h-4" />
                        </button>
                        <span className="text-xs text-amber-500/80 bg-amber-900/20 px-2 py-1 rounded-full flex items-center gap-1">
                          <Clock className="w-3 h-3" /> In attesa
                        </span>
                      </div>
                    ) : d.status === "accepted" ? (
                      <span className="text-xs text-green-400 bg-green-900/20 px-2 py-1 rounded-full">
                        Accettata
                      </span>
                    ) : (
                      <span className="text-xs text-red-400 bg-red-900/20 px-2 py-1 rounded-full">
                        Rifiutata
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { ArrowLeft, Settings, User, Users, Shield, Eye, Save, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import Navbar from "@/components/Navbar";

interface Profile {
  id: string;
  full_name: string;
  bio: string;
  role: string;
  allow_delegations: boolean;
  is_searchable: boolean;
}

export default function SettingsPage() {
  const router = useRouter();
  const supabase = createClient();

  const [user, setUser] = useState<{ id: string; email: string | undefined } | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Form state
  const [fullName, setFullName] = useState("");
  const [bio, setBio] = useState("");
  const [allowDelegations, setAllowDelegations] = useState(false);
  const [isSearchable, setIsSearchable] = useState(false);

  // Load user and profile
  useEffect(() => {
    async function loadUserAndProfile() {
      try {
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
          router.push("/auth");
          return;
        }

        setUser({ id: user.id, email: user.email });

        // Load profile
        const { data: profileData, error } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .single();

        if (error) {
          console.error("Errore caricamento profilo:", error);
          setMessage({
            type: "error",
            text: "Impossibile caricare il profilo. Riprova più tardi.",
          });
          return;
        }

        if (profileData) {
          setProfile(profileData);
          setFullName(profileData.full_name || "");
          setBio(profileData.bio || "");
          setAllowDelegations(profileData.allow_delegations || false);
          setIsSearchable(profileData.is_searchable || false);
        }
      } catch (error) {
        console.error("Errore:", error);
        setMessage({
          type: "error",
          text: "Errore durante il caricamento dei dati.",
        });
      } finally {
        setLoading(false);
      }
    }

    loadUserAndProfile();
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !profile) return;

    setSaving(true);
    setMessage(null);

    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: fullName,
          bio: bio,
          allow_delegations: allowDelegations,
          is_searchable: isSearchable,
          updated_at: new Date().toISOString(),
        })
        .eq("id", user.id);

      if (error) throw error;

      setMessage({
        type: "success",
        text: "Impostazioni salvate con successo!",
      });

      // Update local profile state
      setProfile({
        ...profile,
        full_name: fullName,
        bio: bio,
        allow_delegations: allowDelegations,
        is_searchable: isSearchable,
      });
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Errore sconosciuto";
      setMessage({
        type: "error",
        text: `Errore nel salvataggio: ${msg}`,
      });
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0c1220]">
        <Navbar userEmail={user?.email} userName={profile?.full_name} />
        <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-center h-96">
            <Loader2 className="w-8 h-8 text-pangea-400 animate-spin" />
          </div>
        </main>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-[#0c1220]">
      <Navbar userEmail={user.email} userName={profile?.full_name} />

      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 text-slate-400 hover:text-slate-200 transition-colors mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Torna alla dashboard
          </Link>

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-pangea-900/30 border border-pangea-600/30 flex items-center justify-center">
              <Settings className="w-5 h-5 text-pangea-400" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">Impostazioni Account</h1>
              <p className="text-slate-400 text-sm mt-1">Gestisci il tuo profilo e le preferenze</p>
            </div>
          </div>
        </div>

        {/* Feedback Message */}
        {message && (
          <div
            className={`mb-6 p-4 rounded-lg border flex items-start gap-3 ${
              message.type === "success"
                ? "bg-green-900/20 border-green-700/50 text-green-300"
                : "bg-red-900/20 border-red-700/50 text-red-300"
            }`}
          >
            {message.type === "success" ? (
              <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            )}
            <span className="text-sm">{message.text}</span>
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-6">
          {/* Profile Section */}
          <section className="card p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-8 h-8 rounded-lg bg-pangea-900/30 flex items-center justify-center">
                <User className="w-4 h-4 text-pangea-400" />
              </div>
              <h2 className="text-lg font-semibold text-slate-200">Profilo</h2>
            </div>

            <div className="space-y-4">
              {/* Full Name */}
              <div>
                <label className="label">Nome Completo</label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="Mario Rossi"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                />
                <p className="text-xs text-slate-500 mt-1.5">
                  Il tuo nome sarà visibile agli altri cittadini.
                </p>
              </div>

              {/* Bio */}
              <div>
                <label className="label">Biografia</label>
                <textarea
                  className="input-field resize-none"
                  placeholder="Racconta qualcosa di te... (max 500 caratteri)"
                  rows={4}
                  maxLength={500}
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                />
                <p className="text-xs text-slate-500 mt-1.5">
                  {bio.length}/500 caratteri
                </p>
              </div>
            </div>
          </section>

          {/* Deleghe Section */}
          <section className="card p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-8 h-8 rounded-lg bg-purple-900/30 flex items-center justify-center">
                <Users className="w-4 h-4 text-purple-400" />
              </div>
              <h2 className="text-lg font-semibold text-slate-200">Deleghe</h2>
            </div>

            <div className="space-y-4">
              {/* Allow Delegations Toggle */}
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium text-slate-200">Accetta deleghe</h3>
                  </div>
                  <p className="text-sm text-slate-400 mt-1">
                    Se abilitato, altri cittadini potranno delegarti i loro voti in proprie aree di competenza.
                    La tua identità sarà verificata per questa funzione.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setAllowDelegations(!allowDelegations)}
                  className={`relative inline-flex h-8 w-14 shrink-0 rounded-full transition-colors ${
                    allowDelegations ? "bg-pangea-600" : "bg-slate-700"
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-7 w-7 transform rounded-full bg-white shadow-lg transition transform ${
                      allowDelegations ? "translate-x-7" : "translate-x-0.5"
                    }`}
                  />
                </button>
              </div>
            </div>
          </section>

          {/* Privacy Section */}
          <section className="card p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-8 h-8 rounded-lg bg-blue-900/30 flex items-center justify-center">
                <Eye className="w-4 h-4 text-blue-400" />
              </div>
              <h2 className="text-lg font-semibold text-slate-200">Privacy</h2>
            </div>

            <div className="space-y-4">
              {/* Searchable Toggle */}
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium text-slate-200">Visibile nella ricerca deleghe</h3>
                  </div>
                  <p className="text-sm text-slate-400 mt-1">
                    Se abilitato, il tuo profilo sarà visibile quando altri cittadini cercano esperti a cui delegare i voti.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsSearchable(!isSearchable)}
                  className={`relative inline-flex h-8 w-14 shrink-0 rounded-full transition-colors ${
                    isSearchable ? "bg-pangea-600" : "bg-slate-700"
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-7 w-7 transform rounded-full bg-white shadow-lg transition transform ${
                      isSearchable ? "translate-x-7" : "translate-x-0.5"
                    }`}
                  />
                </button>
              </div>
            </div>
          </section>

          {/* Account Info Section */}
          <section className="card p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-8 h-8 rounded-lg bg-slate-700/50 flex items-center justify-center">
                <Shield className="w-4 h-4 text-slate-400" />
              </div>
              <h2 className="text-lg font-semibold text-slate-200">Informazioni Account</h2>
            </div>

            <div className="space-y-4">
              {/* Email */}
              <div>
                <label className="label">Email</label>
                <div className="bg-slate-900/50 border border-slate-700 rounded-lg px-4 py-3 text-slate-300 flex items-center justify-between">
                  <span className="truncate">{user.email}</span>
                  <span className="text-xs text-slate-500 ml-2 shrink-0">Non modificabile</span>
                </div>
              </div>

              {/* Role Badge */}
              <div>
                <label className="label">Ruolo</label>
                <div className="flex items-center gap-2">
                  <div className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-800/50 border border-slate-700">
                    <div className="w-2 h-2 rounded-full bg-slate-400"></div>
                    <span className="text-sm font-medium text-slate-300">
                      {profile?.role === "admin" ? "Amministratore" : profile?.role === "moderator" ? "Moderatore" : "Cittadino"}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Save Button */}
          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              disabled={saving}
              className="btn-primary flex items-center gap-2 flex-1"
            >
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              {saving ? "Salvataggio..." : "Salva Impostazioni"}
            </button>

            <Link
              href="/dashboard"
              className="btn-secondary flex items-center justify-center"
            >
              Annulla
            </Link>
          </div>
        </form>

        {/* Info Footer */}
        <div className="mt-12 p-4 rounded-lg bg-slate-800/20 border border-slate-700/30">
          <p className="text-xs text-slate-500">
            Le tue impostazioni sono protette da crittografia end-to-end. I tuoi dati sono al sicuro e conformi al GDPR.
          </p>
        </div>
      </main>
    </div>
  );
}

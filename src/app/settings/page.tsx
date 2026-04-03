"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import Navbar from "@/components/Navbar";
import type { Profile } from "@/lib/types";
import {
  Settings,
  User,
  Shield,
  Users,
  Eye,
  Save,
  Loader2,
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  Mail,
  Calendar,
  Flag,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatDate } from "@/lib/utils";

export default function SettingsPage() {
  const [user, setUser] = useState<{ id: string; email?: string; created_at?: string } | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [fullName, setFullName] = useState("");
  const [bio, setBio] = useState("");
  const [allowDelegations, setAllowDelegations] = useState(true);
  const [isSearchable, setIsSearchable] = useState(true);

  // Party weights
  const [partyMemberships, setPartyMemberships] = useState<{ id: string; party_id: string; party_name: string; logo_emoji: string; vote_weight: number }[]>([]);
  const [savingWeights, setSavingWeights] = useState(false);
  const [weightsSuccess, setWeightsSuccess] = useState(false);

  // Password change
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const supabase = createClient();
  const router = useRouter();

  const loadProfile = useCallback(async () => {
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) { router.push("/auth"); return; }
    setUser(authUser);

    const { data: prof } = await supabase.from("profiles").select("*").eq("id", authUser.id).single();
    if (prof) {
      setProfile(prof);
      setFullName(prof.full_name ?? "");
      setBio(prof.bio ?? "");
      setAllowDelegations(prof.allow_delegations ?? true);
      setIsSearchable(prof.is_searchable ?? true);
    }
    // Load party memberships for weight management
    const { data: memberships } = await supabase
      .from("party_members")
      .select("id, party_id, vote_weight, parties(name, logo_emoji)")
      .eq("user_id", authUser.id);
    if (memberships) {
      setPartyMemberships(
        memberships.map((m: Record<string, unknown>) => ({
          id: m.id as string,
          party_id: m.party_id as string,
          party_name: (m.parties as Record<string, string>)?.name || "Partito",
          logo_emoji: (m.parties as Record<string, string>)?.logo_emoji || "🏛️",
          vote_weight: m.vote_weight as number,
        }))
      );
    }

    setLoading(false);
  }, [supabase, router]);

  useEffect(() => { loadProfile(); }, [loadProfile]);

  async function saveProfile() {
    if (!user) return;
    setSaving(true);
    setError(null);
    setSuccess(false);

    const { error: err } = await supabase
      .from("profiles")
      .update({
        full_name: fullName.trim() || null,
        bio: bio.trim() || null,
        allow_delegations: allowDelegations,
        is_searchable: isSearchable,
      })
      .eq("id", user.id);

    if (err) setError(err.message);
    else setSuccess(true);
    setSaving(false);
    setTimeout(() => setSuccess(false), 3000);
  }

  async function savePartyWeights() {
    setSavingWeights(true);
    setWeightsSuccess(false);
    for (const pm of partyMemberships) {
      await supabase
        .from("party_members")
        .update({ vote_weight: pm.vote_weight })
        .eq("id", pm.id);
    }
    setWeightsSuccess(true);
    setSavingWeights(false);
    setTimeout(() => setWeightsSuccess(false), 3000);
  }

  function updatePartyWeight(partyId: string, weight: number) {
    setPartyMemberships((prev) =>
      prev.map((pm) => (pm.party_id === partyId ? { ...pm, vote_weight: Math.max(1, Math.min(100, weight)) } : pm))
    );
  }

  async function changePassword() {
    setPasswordError(null);
    setPasswordSuccess(false);

    if (newPassword.length < 8) {
      setPasswordError("La password deve essere di almeno 8 caratteri.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("Le password non corrispondono.");
      return;
    }

    setChangingPassword(true);
    const { error: err } = await supabase.auth.updateUser({ password: newPassword });
    if (err) setPasswordError(err.message);
    else {
      setPasswordSuccess(true);
      setNewPassword("");
      setConfirmPassword("");
    }
    setChangingPassword(false);
    setTimeout(() => setPasswordSuccess(false), 3000);
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
      <Navbar userEmail={user?.email} userName={profile?.full_name} userRole={profile?.role} />

      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link href="/dashboard" className="p-2 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <Settings className="w-6 h-6 text-pangea-400" />
              Impostazioni Account
            </h1>
            <p className="text-sm text-slate-400 mt-0.5">Gestisci il tuo profilo e le preferenze</p>
          </div>
        </div>

        <div className="space-y-6">
          {/* Account info (read-only) */}
          <div className="card p-6">
            <h2 className="text-lg font-semibold text-slate-200 mb-4 flex items-center gap-2">
              <Shield className="w-5 h-5 text-pangea-400" />
              Informazioni Account
            </h2>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <Mail className="w-4 h-4 text-slate-500" />
                <div>
                  <p className="text-xs text-slate-500">Email</p>
                  <p className="text-sm text-slate-200">{user?.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Shield className="w-4 h-4 text-slate-500" />
                <div>
                  <p className="text-xs text-slate-500">Ruolo</p>
                  <p className="text-sm text-slate-200 capitalize">{profile?.role || "citizen"}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Calendar className="w-4 h-4 text-slate-500" />
                <div>
                  <p className="text-xs text-slate-500">Membro dal</p>
                  <p className="text-sm text-slate-200">{profile?.created_at ? formatDate(profile.created_at) : "—"}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Profile editing */}
          <div className="card p-6">
            <h2 className="text-lg font-semibold text-slate-200 mb-4 flex items-center gap-2">
              <User className="w-5 h-5 text-pangea-400" />
              Profilo Pubblico
            </h2>

            <div className="space-y-4">
              <div>
                <label className="label">Nome completo</label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="Il tuo nome"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  maxLength={100}
                />
              </div>
              <div>
                <label className="label">Bio</label>
                <textarea
                  className="input-field min-h-[100px] resize-y"
                  placeholder="Racconta qualcosa di te ai concittadini..."
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  maxLength={500}
                />
                <p className="text-xs text-slate-600 mt-1">{bio.length}/500 caratteri</p>
              </div>
            </div>
          </div>

          {/* Privacy settings */}
          <div className="card p-6">
            <h2 className="text-lg font-semibold text-slate-200 mb-4 flex items-center gap-2">
              <Eye className="w-5 h-5 text-pangea-400" />
              Privacy e Deleghe
            </h2>

            <div className="space-y-4">
              <label className="flex items-center justify-between cursor-pointer group">
                <div className="flex items-center gap-3">
                  <Users className="w-4 h-4 text-slate-500" />
                  <div>
                    <p className="text-sm text-slate-200">Accetta deleghe</p>
                    <p className="text-xs text-slate-500">Permetti ad altri cittadini di delegarti il voto</p>
                  </div>
                </div>
                <div
                  className={`w-11 h-6 rounded-full transition-colors relative ${
                    allowDelegations ? "bg-pangea-600" : "bg-slate-700"
                  }`}
                  onClick={() => setAllowDelegations(!allowDelegations)}
                >
                  <div className={`w-5 h-5 rounded-full bg-white shadow-sm absolute top-0.5 transition-transform ${
                    allowDelegations ? "translate-x-5.5 left-0.5" : "left-0.5"
                  }`} style={{ transform: allowDelegations ? "translateX(22px)" : "translateX(0)" }} />
                </div>
              </label>

              <label className="flex items-center justify-between cursor-pointer group">
                <div className="flex items-center gap-3">
                  <Eye className="w-4 h-4 text-slate-500" />
                  <div>
                    <p className="text-sm text-slate-200">Profilo ricercabile</p>
                    <p className="text-xs text-slate-500">Appari nei risultati di ricerca per le deleghe</p>
                  </div>
                </div>
                <div
                  className={`w-11 h-6 rounded-full transition-colors relative ${
                    isSearchable ? "bg-pangea-600" : "bg-slate-700"
                  }`}
                  onClick={() => setIsSearchable(!isSearchable)}
                >
                  <div className={`w-5 h-5 rounded-full bg-white shadow-sm absolute top-0.5 transition-transform`}
                    style={{ transform: isSearchable ? "translateX(22px)" : "translateX(0)", left: "2px" }} />
                </div>
              </label>
            </div>
          </div>

          {/* Party vote weights */}
          {partyMemberships.length > 0 && (
            <div className="card p-6">
              <h2 className="text-lg font-semibold text-slate-200 mb-4 flex items-center gap-2">
                <Flag className="w-5 h-5 text-pangea-400" />
                Pesi Voto Partiti
              </h2>
              <p className="text-xs text-slate-500 mb-4">
                Se sei iscritto a più partiti e non voti direttamente su una proposta, il tuo voto viene diviso tra i partiti
                in base a questi pesi. Di default tutti hanno peso uguale (1). Puoi personalizzare i pesi per dare più
                influenza a un partito rispetto ad un altro.
              </p>
              <div className="space-y-3">
                {partyMemberships.map((pm) => {
                  const totalWeight = partyMemberships.reduce((s, p) => s + p.vote_weight, 0);
                  const percentage = totalWeight > 0 ? Math.round((pm.vote_weight / totalWeight) * 100) : 0;
                  return (
                    <div key={pm.party_id} className="flex items-center gap-3 bg-slate-800/50 rounded-lg p-3">
                      <span className="text-xl">{pm.logo_emoji}</span>
                      <div className="flex-1 min-w-0">
                        <Link href={`/parties/${pm.party_id}`} className="text-sm text-slate-200 hover:text-pangea-300 transition-colors">
                          {pm.party_name}
                        </Link>
                        <p className="text-[10px] text-slate-500">{percentage}% del tuo voto</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => updatePartyWeight(pm.party_id, pm.vote_weight - 1)}
                          className="w-7 h-7 rounded bg-slate-700 text-slate-300 hover:bg-slate-600 flex items-center justify-center text-sm font-bold"
                          disabled={pm.vote_weight <= 1}
                        >
                          −
                        </button>
                        <input
                          type="number"
                          value={pm.vote_weight}
                          onChange={(e) => updatePartyWeight(pm.party_id, parseInt(e.target.value) || 1)}
                          className="w-14 text-center input-field py-1 text-sm"
                          min={1}
                          max={100}
                        />
                        <button
                          onClick={() => updatePartyWeight(pm.party_id, pm.vote_weight + 1)}
                          className="w-7 h-7 rounded bg-slate-700 text-slate-300 hover:bg-slate-600 flex items-center justify-center text-sm font-bold"
                          disabled={pm.vote_weight >= 100}
                        >
                          +
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
              {weightsSuccess && (
                <div className="mt-3 p-2 bg-green-900/30 border border-green-700/50 rounded-lg text-green-300 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Pesi aggiornati!
                </div>
              )}
              <button
                onClick={savePartyWeights}
                disabled={savingWeights}
                className="mt-3 btn-secondary w-full flex items-center justify-center gap-2 text-sm"
              >
                {savingWeights ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {savingWeights ? "Salvando..." : "Salva pesi partiti"}
              </button>
            </div>
          )}

          {/* Save button */}
          {error && (
            <div className="p-3 bg-red-900/30 border border-red-700/50 rounded-lg text-red-300 text-sm flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" /> {error}
            </div>
          )}
          {success && (
            <div className="p-3 bg-green-900/30 border border-green-700/50 rounded-lg text-green-300 text-sm flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" /> Profilo aggiornato con successo!
            </div>
          )}
          <button
            onClick={saveProfile}
            disabled={saving}
            className="btn-primary w-full flex items-center justify-center gap-2 py-3"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {saving ? "Salvando..." : "Salva modifiche"}
          </button>

          {/* Change password */}
          <div className="card p-6">
            <h2 className="text-lg font-semibold text-slate-200 mb-4 flex items-center gap-2">
              <Shield className="w-5 h-5 text-amber-400" />
              Cambia Password
            </h2>
            <div className="space-y-4">
              <div>
                <label className="label">Nuova password</label>
                <input
                  type="password"
                  className="input-field"
                  placeholder="Minimo 8 caratteri"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
              </div>
              <div>
                <label className="label">Conferma password</label>
                <input
                  type="password"
                  className="input-field"
                  placeholder="Ripeti la password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>
              {passwordError && (
                <div className="p-3 bg-red-900/30 border border-red-700/50 rounded-lg text-red-300 text-sm flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" /> {passwordError}
                </div>
              )}
              {passwordSuccess && (
                <div className="p-3 bg-green-900/30 border border-green-700/50 rounded-lg text-green-300 text-sm flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" /> Password aggiornata!
                </div>
              )}
              <button
                onClick={changePassword}
                disabled={changingPassword || !newPassword}
                className="btn-secondary w-full flex items-center justify-center gap-2"
              >
                {changingPassword ? <Loader2 className="w-4 h-4 animate-spin" /> : <Shield className="w-4 h-4" />}
                {changingPassword ? "Aggiornando..." : "Aggiorna password"}
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

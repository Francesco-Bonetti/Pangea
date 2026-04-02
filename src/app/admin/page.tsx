"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Navbar from "@/components/Navbar";
import {
  Shield,
  Users,
  FileText,
  Trash2,
  ChevronDown,
  AlertTriangle,
  CheckCircle2,
  Clock,
  XCircle,
  Flame,
  LogIn,
  Lock,
} from "lucide-react";
import type { Profile, Proposal, ProposalStatus } from "@/lib/types";

interface UserWithRole extends Profile {
  email?: string;
}

interface ProposalWithAuthor extends Proposal {
  author_email?: string;
}

export default function AdminPanel() {
  const router = useRouter();
  const supabase = createClient();

  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<UserWithRole | null>(null);
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [proposals, setProposals] = useState<ProposalWithAuthor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updating, setUpdating] = useState<{
    type: "role" | "proposal_status";
    id: string;
  } | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | null>(null);

  // Fetch current user and check admin role
  useEffect(() => {
    async function checkAdmin() {
      try {
        const {
          data: { user: authUser },
        } = await supabase.auth.getUser();

        if (!authUser) {
          router.push("/auth");
          return;
        }

        setUser(authUser);

        // Get profile with role
        const { data: userProfile } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", authUser.id)
          .single();

        if (!userProfile || userProfile.role !== "admin") {
          router.push("/dashboard");
          return;
        }

        setProfile(userProfile);
        setUserName(userProfile.full_name);

        // Fetch all users
        const { data: allUsers } = await supabase.from("profiles").select("*");
        if (allUsers) {
          setUsers(allUsers);
        }

        // Fetch all proposals
        const { data: allProposals } = await supabase
          .from("proposals")
          .select("*")
          .order("created_at", { ascending: false });

        if (allProposals) {
          // Enrich proposals with author email
          const enriched = await Promise.all(
            allProposals.map(async (proposal) => {
              return {
                ...proposal,
                author_email: authUser.email,
              };
            })
          );
          setProposals(enriched);
        }
      } catch (err) {
        console.error("Admin check error:", err);
        setError("Errore nel caricamento della pagina admin");
      } finally {
        setLoading(false);
      }
    }

    checkAdmin();
  }, [supabase, router]);

  // Update user role
  async function handleRoleChange(userId: string, newRole: string) {
    setUpdating({ type: "role", id: userId });
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ role: newRole })
        .eq("id", userId);

      if (error) throw error;

      setUsers(
        users.map((u) =>
          u.id === userId ? { ...u, role: newRole as import("@/lib/types").UserRole } : u
        )
      );
    } catch (err) {
      console.error("Role update error:", err);
      setError("Errore nell'aggiornamento del ruolo");
    } finally {
      setUpdating(null);
    }
  }

  // Update proposal status
  async function handleStatusChange(proposalId: string, newStatus: string) {
    setUpdating({ type: "proposal_status", id: proposalId });
    try {
      const { error } = await supabase
        .from("proposals")
        .update({ status: newStatus })
        .eq("id", proposalId);

      if (error) throw error;

      setProposals(
        proposals.map((p) =>
          p.id === proposalId ? { ...p, status: newStatus as ProposalStatus } : p
        )
      );
    } catch (err) {
      console.error("Status update error:", err);
      setError("Errore nell'aggiornamento dello stato");
    } finally {
      setUpdating(null);
    }
  }

  // Delete proposal
  async function handleDeleteProposal(proposalId: string) {
    try {
      const { error } = await supabase
        .from("proposals")
        .delete()
        .eq("id", proposalId);

      if (error) throw error;

      setProposals(proposals.filter((p) => p.id !== proposalId));
      setDeleteConfirm(null);
    } catch (err) {
      console.error("Delete error:", err);
      setError("Errore nell'eliminazione della proposta");
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0c1220]">
        <Navbar userEmail={user?.email} userName={userName} />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-pangea-400 border-opacity-75 mx-auto mb-4"></div>
              <p className="text-slate-400">Caricamento dashboard admin...</p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (!profile || profile.role !== "admin") {
    return (
      <div className="min-h-screen bg-[#0c1220]">
        <Navbar userEmail={user?.email} userName={userName} />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="text-center card p-8">
            <Lock className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-white mb-2">
              Accesso Negato
            </h1>
            <p className="text-slate-400 mb-6">
              Non hai i permessi per accedere alla dashboard admin.
            </p>
            <button
              onClick={() => router.push("/dashboard")}
              className="btn-primary inline-flex items-center gap-2"
            >
              <LogIn className="w-4 h-4" />
              Torna alla Dashboard
            </button>
          </div>
        </main>
      </div>
    );
  }

  const statusColor: Record<string, string> = {
    draft: "status-draft",
    curation: "status-curation",
    active: "status-active",
    closed: "status-closed",
    repealed: "status-closed",
  };

  const statusIcon: Record<string, any> = {
    draft: FileText,
    curation: Flame,
    active: Clock,
    closed: CheckCircle2,
    repealed: XCircle,
  };

  return (
    <div className="min-h-screen bg-[#0c1220]">
      <Navbar userEmail={user?.email} userName={userName} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Shield className="w-8 h-8 text-pangea-400" strokeWidth={1.5} />
            <h1 className="text-3xl font-bold text-white">Dashboard Admin</h1>
          </div>
          <p className="text-slate-400">
            Gestisci utenti e proposte della piattaforma Agora Pangea
          </p>
        </div>

        {/* Error message */}
        {error && (
          <div className="mb-6 card border border-red-500/30 bg-red-900/10 p-4 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-red-300 text-sm">{error}</p>
            </div>
            <button
              onClick={() => setError(null)}
              className="ml-auto text-slate-400 hover:text-slate-200"
            >
              ✕
            </button>
          </div>
        )}

        {/* Tabs */}
        <div className="space-y-8">
          {/* Users Section */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <Users className="w-5 h-5 text-pangea-400" />
              <h2 className="text-xl font-semibold text-slate-200">
                Utenti ({users.length})
              </h2>
            </div>

            <div className="card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-700/50 bg-slate-900/30">
                      <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                        Nome
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                        Email
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                        Ruolo
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                        Iscritto
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700/30">
                    {users.map((u) => (
                      <tr
                        key={u.id}
                        className="hover:bg-slate-700/20 transition-colors"
                      >
                        <td className="px-6 py-4">
                          <span className="text-sm text-slate-200 font-medium">
                            {u.full_name || "—"}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm text-slate-400 font-mono">
                            {u.email || "—"}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="relative inline-block w-full max-w-xs">
                            <select
                              value={u.role || "citizen"}
                              onChange={(e) =>
                                handleRoleChange(u.id, e.target.value)
                              }
                              disabled={updating?.id === u.id}
                              className="input-field appearance-none pr-10 py-2 text-sm"
                            >
                              <option value="citizen">Cittadino</option>
                              <option value="moderator">Moderatore</option>
                              <option value="admin">Admin</option>
                            </select>
                            <ChevronDown className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-xs text-slate-500">
                            {new Date(u.created_at).toLocaleDateString("it-IT")}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {users.length === 0 && (
                <div className="text-center py-12">
                  <Users className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                  <p className="text-slate-500">Nessun utente trovato</p>
                </div>
              )}
            </div>
          </section>

          {/* Proposals Section */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <FileText className="w-5 h-5 text-pangea-400" />
              <h2 className="text-xl font-semibold text-slate-200">
                Proposte ({proposals.length})
              </h2>
            </div>

            <div className="card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-700/50 bg-slate-900/30">
                      <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                        Titolo
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                        Autore
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                        Stato
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                        Data Creazione
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                        Azioni
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700/30">
                    {proposals.map((proposal) => {
                      const StatusIcon =
                        statusIcon[proposal.status] || FileText;
                      return (
                        <tr
                          key={proposal.id}
                          className="hover:bg-slate-700/20 transition-colors"
                        >
                          <td className="px-6 py-4 max-w-xs">
                            <span className="text-sm text-slate-200 font-medium truncate block">
                              {proposal.title}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-xs text-slate-400 font-mono">
                              {proposal.author_email || "—"}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="relative inline-block w-full max-w-xs">
                              <select
                                value={proposal.status}
                                onChange={(e) =>
                                  handleStatusChange(proposal.id, e.target.value)
                                }
                                disabled={updating?.id === proposal.id}
                                className={`input-field appearance-none pr-10 py-2 text-sm`}
                              >
                                <option value="draft">Bozza</option>
                                <option value="curation">Curatela</option>
                                <option value="active">Attiva</option>
                                <option value="closed">Chiusa</option>
                                <option value="repealed">Abrogata</option>
                              </select>
                              <ChevronDown className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-xs text-slate-500">
                              {new Date(
                                proposal.created_at
                              ).toLocaleDateString("it-IT")}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            {deleteConfirm === proposal.id ? (
                              <div className="flex gap-2">
                                <button
                                  onClick={() =>
                                    handleDeleteProposal(proposal.id)
                                  }
                                  className="btn-primary text-xs py-1.5 px-2"
                                >
                                  Conferma
                                </button>
                                <button
                                  onClick={() => setDeleteConfirm(null)}
                                  className="btn-ghost text-xs py-1.5 px-2"
                                >
                                  Annulla
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() =>
                                  setDeleteConfirm(proposal.id)
                                }
                                className="text-red-400 hover:text-red-300 transition-colors inline-flex items-center gap-1 text-xs"
                              >
                                <Trash2 className="w-4 h-4" />
                                Elimina
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {proposals.length === 0 && (
                <div className="text-center py-12">
                  <FileText className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                  <p className="text-slate-500">Nessuna proposta trovata</p>
                </div>
              )}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}

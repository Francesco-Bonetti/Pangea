"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import Navbar from "@/components/Navbar";
import type { Profile, Proposal, UserRole } from "@/lib/types";
import {
  Shield,
  Users,
  FileText,
  Trash2,
  Loader2,
  AlertTriangle,
  ChevronDown,
  BookOpen,
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Scale,
  BarChart3,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatDateTime } from "@/lib/utils";

interface LawRow {
  id: string;
  title: string;
  code: string | null;
  law_type: string;
  status: string;
  created_at: string;
}

export default function AdminPage() {
  const [user, setUser] = useState<{ id: string; email?: string } | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);

  // Data
  const [users, setUsers] = useState<Profile[]>([]);
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [laws, setLaws] = useState<LawRow[]>([]);

  // UI State
  const [activeTab, setActiveTab] = useState<"users" | "proposals" | "laws" | "stats">("users");
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const supabase = createClient();
  const router = useRouter();

  const loadData = useCallback(async () => {
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) { router.push("/auth"); return; }
    setUser(authUser);

    const { data: prof } = await supabase.from("profiles").select("*").eq("id", authUser.id).single();
    setProfile(prof);

    if (prof?.role !== "admin" && prof?.role !== "moderator") {
      setAuthorized(false);
      setLoading(false);
      return;
    }
    setAuthorized(true);

    const [usersRes, proposalsRes, lawsRes] = await Promise.all([
      supabase.from("profiles").select("*").order("created_at", { ascending: false }),
      supabase.from("proposals").select("*").order("created_at", { ascending: false }),
      supabase.from("laws").select("id, title, code, law_type, status, created_at").order("created_at", { ascending: false }),
    ]);

    setUsers(usersRes.data ?? []);
    setProposals(proposalsRes.data ?? []);
    setLaws(lawsRes.data ?? []);
    setLoading(false);
  }, [supabase, router]);

  useEffect(() => { loadData(); }, [loadData]);

  function clearMessages() { setError(null); setSuccess(null); }

  async function changeUserRole(userId: string, newRole: UserRole) {
    clearMessages();
    setActionLoading(userId);
    const { error: err } = await supabase
      .from("profiles")
      .update({ role: newRole })
      .eq("id", userId);
    if (err) setError(err.message);
    else {
      setSuccess(`Role updated to "${newRole}"`);
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u));
    }
    setActionLoading(null);
  }

  async function deleteProposal(proposalId: string) {
    clearMessages();
    if (!confirm("Are you sure you want to delete this proposal? This action is irreversible.")) return;
    setActionLoading(proposalId);

    // Delete related data first
    await supabase.from("proposal_signals").delete().eq("proposal_id", proposalId);
    await supabase.from("proposal_tags").delete().eq("proposal_id", proposalId);
    // Delete votes and allocations
    const { data: votes } = await supabase.from("votes").select("id").eq("proposal_id", proposalId);
    if (votes && votes.length > 0) {
      const voteIds = votes.map((v: { id: string }) => v.id);
      await supabase.from("vote_allocations").delete().in("vote_id", voteIds);
      await supabase.from("votes").delete().eq("proposal_id", proposalId);
    }
    await supabase.from("proposal_options").delete().eq("proposal_id", proposalId);
    // Delete comments
    await supabase.from("comments").delete().eq("proposal_id", proposalId);

    const { error: err } = await supabase.from("proposals").delete().eq("id", proposalId);
    if (err) setError(err.message);
    else {
      setSuccess("Proposal deleted");
      setProposals(prev => prev.filter(p => p.id !== proposalId));
    }
    setActionLoading(null);
  }

  async function deleteLaw(lawId: string) {
    clearMessages();
    if (!confirm("Are you sure you want to delete this law?")) return;
    setActionLoading(lawId);
    // Delete children first
    await supabase.from("laws").delete().eq("parent_id", lawId);
    const { error: err } = await supabase.from("laws").delete().eq("id", lawId);
    if (err) setError(err.message);
    else {
      setSuccess("Law deleted");
      setLaws(prev => prev.filter(l => l.id !== lawId));
    }
    setActionLoading(null);
  }

  async function closeProposal(proposalId: string) {
    clearMessages();
    setActionLoading(proposalId);
    const { error: err } = await supabase
      .from("proposals")
      .update({ status: "closed" })
      .eq("id", proposalId);
    if (err) setError(err.message);
    else {
      setSuccess("Proposal closed");
      setProposals(prev => prev.map(p => p.id === proposalId ? { ...p, status: "closed" } : p));
    }
    setActionLoading(null);
  }

  async function activateProposal(proposalId: string) {
    clearMessages();
    setActionLoading(proposalId);
    const { error: err } = await supabase
      .from("proposals")
      .update({ status: "active" })
      .eq("id", proposalId);
    if (err) setError(err.message);
    else {
      setSuccess("Proposal activated");
      setProposals(prev => prev.map(p => p.id === proposalId ? { ...p, status: "active" } : p));
    }
    setActionLoading(null);
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0c1220] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-pangea-400 animate-spin" />
      </div>
    );
  }

  if (!authorized) {
    return (
      <div className="min-h-screen bg-[#0c1220]">
        <Navbar userEmail={user?.email} userName={profile?.full_name} userRole={profile?.role} />
        <div className="max-w-lg mx-auto px-4 py-20 text-center">
          <Shield className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-white mb-2">Access denied</h1>
          <p className="text-slate-400 mb-6">Only administrators can access this page.</p>
          <Link href="/dashboard" className="btn-primary inline-flex items-center gap-2 overflow-hidden">
            <ArrowLeft className="w-4 h-4 shrink-0" />
            <span className="truncate">Back to the Agora</span>
          </Link>
        </div>
      </div>
    );
  }

  const statusColor: Record<string, string> = {
    draft: "text-slate-400 bg-slate-700/50",
    curation: "text-amber-300 bg-amber-900/30",
    active: "text-pangea-300 bg-pangea-900/50",
    closed: "text-slate-400 bg-slate-700/50",
    repealed: "text-red-300 bg-red-900/30",
  };

  return (
    <div className="min-h-screen bg-[#0c1220]">
      <Navbar userEmail={user?.email} userName={profile?.full_name} userRole={profile?.role} />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link href="/dashboard" className="p-2 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <Shield className="w-6 h-6 text-red-400" />
              Admin Panel
            </h1>
            <p className="text-sm text-slate-400 mt-0.5">
              Manage users, proposals, and laws of the platform
            </p>
          </div>
        </div>

        {/* Messages */}
        {error && (
          <div className="mb-4 p-3 bg-red-900/30 border border-red-700/50 rounded-lg text-red-300 text-sm flex items-center gap-2">
            <XCircle className="w-4 h-4 shrink-0" /> {error}
          </div>
        )}
        {success && (
          <div className="mb-4 p-3 bg-green-900/30 border border-green-700/50 rounded-lg text-green-300 text-sm flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" /> {success}
          </div>
        )}

        {/* Stats overview */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          <div className="card p-4">
            <Users className="w-5 h-5 text-blue-400 mb-1" />
            <p className="text-2xl font-bold text-white">{users.length}</p>
            <p className="text-xs text-slate-500">Citizens</p>
          </div>
          <div className="card p-4">
            <FileText className="w-5 h-5 text-pangea-400 mb-1" />
            <p className="text-2xl font-bold text-white">{proposals.length}</p>
            <p className="text-xs text-slate-500">Proposals</p>
          </div>
          <div className="card p-4">
            <BookOpen className="w-5 h-5 text-blue-400 mb-1" />
            <p className="text-2xl font-bold text-white">{laws.length}</p>
            <p className="text-xs text-slate-500">Laws</p>
          </div>
          <div className="card p-4">
            <Scale className="w-5 h-5 text-green-400 mb-1" />
            <p className="text-2xl font-bold text-white">{proposals.filter(p => p.status === "active").length}</p>
            <p className="text-xs text-slate-500">Active</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 border-b border-slate-700/50 pb-px">
          {([
            { key: "users", label: "Users", icon: Users },
            { key: "proposals", label: "Proposals", icon: FileText },
            { key: "laws", label: "Laws", icon: BookOpen },
            { key: "stats", label: "Statistics", icon: BarChart3 },
          ] as const).map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => { setActiveTab(key); clearMessages(); }}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium rounded-t-lg transition-colors ${
                activeTab === key
                  ? "text-pangea-300 bg-slate-800/50 border-b-2 border-pangea-400"
                  : "text-slate-500 hover:text-slate-300"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
            </button>
          ))}
        </div>

        {/* Users tab */}
        {activeTab === "users" && (
          <div className="space-y-2">
            {users.map((u) => (
              <div key={u.id} className="card p-4 flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-pangea-800 border border-pangea-600 flex items-center justify-center text-sm text-pangea-300 font-bold">
                  {(u.full_name ?? "?")[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-slate-200 font-medium">{u.full_name ?? "No name"}</p>
                  <p className="text-xs text-slate-500">{u.id.slice(0, 8)}...</p>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                  u.role === "admin" ? "text-red-300 bg-red-900/30 border border-red-700/30" :
                  u.role === "moderator" ? "text-amber-300 bg-amber-900/30 border border-amber-700/30" :
                  "text-slate-400 bg-slate-700/50"
                }`}>
                  {u.role || "citizen"}
                </span>
                {u.id !== user?.id && (
                  <div className="relative">
                    <select
                      value={u.role || "citizen"}
                      onChange={(e) => changeUserRole(u.id, e.target.value as UserRole)}
                      disabled={actionLoading === u.id}
                      className="appearance-none bg-slate-800 border border-slate-600 rounded-lg px-3 py-1.5 pr-8 text-xs text-slate-300 cursor-pointer focus:outline-none focus:border-pangea-500"
                    >
                      <option value="citizen">Citizen</option>
                      <option value="moderator">Moderator</option>
                      <option value="admin">Admin</option>
                    </select>
                    <ChevronDown className="w-3 h-3 text-slate-500 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                )}
                {actionLoading === u.id && <Loader2 className="w-4 h-4 text-pangea-400 animate-spin" />}
              </div>
            ))}
          </div>
        )}

        {/* Proposals tab */}
        {activeTab === "proposals" && (
          <div className="space-y-2">
            {proposals.length === 0 && (
              <div className="card p-8 text-center text-slate-500 text-sm">No proposals found.</div>
            )}
            {proposals.map((p) => (
              <div key={p.id} className="card p-4 flex items-center gap-4">
                <div className="flex-1 min-w-0">
                  <Link href={`/proposals/${p.id}`} className="text-sm text-slate-200 font-medium hover:text-pangea-300 transition-colors">
                    {p.title}
                  </Link>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${statusColor[p.status] || ""}`}>
                      {p.status}
                    </span>
                    {p.proposal_type && p.proposal_type !== "new" && (
                      <span className="text-xs text-purple-400 bg-purple-900/20 px-2 py-0.5 rounded-full">
                        {p.proposal_type}
                      </span>
                    )}
                    <span className="text-xs text-slate-600">{formatDateTime(p.created_at)}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  {p.status === "curation" && (
                    <button
                      onClick={() => activateProposal(p.id)}
                      disabled={actionLoading === p.id}
                      className="p-2 rounded-lg text-green-400 hover:bg-green-900/30 transition-colors"
                      title="Promote to deliberation"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                    </button>
                  )}
                  {p.status === "active" && (
                    <button
                      onClick={() => closeProposal(p.id)}
                      disabled={actionLoading === p.id}
                      className="p-2 rounded-lg text-amber-400 hover:bg-amber-900/30 transition-colors"
                      title="Close deliberation"
                    >
                      <XCircle className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    onClick={() => deleteProposal(p.id)}
                    disabled={actionLoading === p.id}
                    className="p-2 rounded-lg text-red-400 hover:bg-red-900/30 transition-colors"
                    title="Delete proposal"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  {actionLoading === p.id && <Loader2 className="w-4 h-4 text-pangea-400 animate-spin" />}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Laws tab */}
        {activeTab === "laws" && (
          <div className="space-y-2">
            {laws.length === 0 && (
              <div className="card p-8 text-center text-slate-500 text-sm">No laws found.</div>
            )}
            {laws.map((l) => (
              <div key={l.id} className="card p-4 flex items-center gap-4">
                <BookOpen className="w-5 h-5 text-blue-400 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-slate-200 font-medium">{l.title}</p>
                  <div className="flex items-center gap-2 mt-1">
                    {l.code && <span className="text-xs text-blue-400 bg-blue-900/20 px-2 py-0.5 rounded-full">{l.code}</span>}
                    <span className="text-xs text-slate-500">{l.law_type}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${l.status === "active" ? "text-green-300 bg-green-900/20" : "text-red-300 bg-red-900/20"}`}>
                      {l.status}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => deleteLaw(l.id)}
                  disabled={actionLoading === l.id}
                  className="p-2 rounded-lg text-red-400 hover:bg-red-900/30 transition-colors"
                  title="Delete law"
                >
                  {actionLoading === l.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Stats tab */}
        {activeTab === "stats" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="card p-6">
              <h3 className="text-sm font-semibold text-slate-200 mb-4 flex items-center gap-2">
                <FileText className="w-4 h-4 text-pangea-400" />
                Proposals by status
              </h3>
              <div className="space-y-3">
                {(["draft", "curation", "active", "closed", "repealed"] as const).map((status) => {
                  const count = proposals.filter(p => p.status === status).length;
                  const pct = proposals.length > 0 ? (count / proposals.length) * 100 : 0;
                  return (
                    <div key={status}>
                      <div className="flex justify-between text-xs text-slate-400 mb-1">
                        <span className="capitalize">{status}</span>
                        <span className="font-medium">{count} ({pct.toFixed(0)}%)</span>
                      </div>
                      <div className="bg-slate-700 rounded-full h-2">
                        <div
                          className="bg-pangea-500 h-2 rounded-full transition-all duration-500"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="card p-6">
              <h3 className="text-sm font-semibold text-slate-200 mb-4 flex items-center gap-2">
                <Users className="w-4 h-4 text-blue-400" />
                Users by role
              </h3>
              <div className="space-y-3">
                {(["citizen", "moderator", "admin"] as const).map((role) => {
                  const count = users.filter(u => (u.role || "citizen") === role).length;
                  const pct = users.length > 0 ? (count / users.length) * 100 : 0;
                  return (
                    <div key={role}>
                      <div className="flex justify-between text-xs text-slate-400 mb-1">
                        <span className="capitalize">{role}</span>
                        <span className="font-medium">{count} ({pct.toFixed(0)}%)</span>
                      </div>
                      <div className="bg-slate-700 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full transition-all duration-500 ${
                            role === "admin" ? "bg-red-500" : role === "moderator" ? "bg-amber-500" : "bg-blue-500"
                          }`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

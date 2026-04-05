"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import AppShell from "@/components/AppShell";
import { useLanguage } from "@/components/language-provider";
import type { Profile, Proposal, UserRole } from "@/lib/types";
import {
  Shield,
  ShieldCheck,
  Users,
  Hash,
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
  Bug,
  MessageSquare,
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

interface BugReport {
  id: string;
  user_id: string | null;
  category: string;
  title: string;
  description: string | null;
  page_url: string | null;
  status: string;
  admin_notes: string | null;
  created_at: string;
}

export default function AdminPage() {
  const { t } = useLanguage();
  const [user, setUser] = useState<{ id: string; email?: string } | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);

  // Data
  const [users, setUsers] = useState<Profile[]>([]);
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [laws, setLaws] = useState<LawRow[]>([]);
  const [bugReports, setBugReports] = useState<BugReport[]>([]);

  // Total counts (efficient head queries)
  const [totalCounts, setTotalCounts] = useState({ users: 0, proposals: 0, laws: 0, openReports: 0 });

  // UI State
  const [activeTab, setActiveTab] = useState<"users" | "proposals" | "laws" | "reports" | "stats" | "integrity">("users");
  const [integrityStats, setIntegrityStats] = useState<Record<string, unknown> | null>(null);
  const [hashingAll, setHashingAll] = useState(false);
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

    // Load data with pagination limits for scalability
    const PAGE_SIZE = 100;
    const [usersRes, proposalsRes, lawsRes, reportsRes, userCountRes, proposalCountRes, lawCountRes, reportCountRes] = await Promise.all([
      supabase.from("profiles").select("*").order("created_at", { ascending: false }).limit(PAGE_SIZE),
      supabase.from("proposals").select("*").order("created_at", { ascending: false }).limit(PAGE_SIZE),
      supabase.from("laws").select("id, title, code, law_type, status, created_at").order("created_at", { ascending: false }).limit(PAGE_SIZE),
      supabase.from("bug_reports").select("*").order("created_at", { ascending: false }).limit(PAGE_SIZE),
      // Get total counts efficiently (head: true = no data transferred)
      supabase.from("profiles").select("*", { count: "exact", head: true }),
      supabase.from("proposals").select("*", { count: "exact", head: true }),
      supabase.from("laws").select("*", { count: "exact", head: true }),
      supabase.from("bug_reports").select("*", { count: "exact", head: true }).eq("status", "open"),
    ]);

    setUsers(usersRes.data ?? []);
    setProposals(proposalsRes.data ?? []);
    setLaws(lawsRes.data ?? []);
    setBugReports(reportsRes.data ?? []);
    setTotalCounts({
      users: userCountRes.count ?? 0,
      proposals: proposalCountRes.count ?? 0,
      laws: lawCountRes.count ?? 0,
      openReports: reportCountRes.count ?? 0,
    });
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
      setSuccess(`Role updated to ${newRole}`);
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u));
    }
    setActionLoading(null);
  }

  async function deleteProposal(proposalId: string) {
    clearMessages();
    if (!confirm(t("admin.confirmDeleteProposal"))) return;
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
      setSuccess(t("admin.proposalDeleted"));
      setProposals(prev => prev.filter(p => p.id !== proposalId));
    }
    setActionLoading(null);
  }

  async function deleteLaw(lawId: string) {
    clearMessages();
    if (!confirm(t("admin.confirmDeleteLaw"))) return;
    setActionLoading(lawId);
    // Delete children first
    await supabase.from("laws").delete().eq("parent_id", lawId);
    const { error: err } = await supabase.from("laws").delete().eq("id", lawId);
    if (err) setError(err.message);
    else {
      setSuccess(t("admin.lawDeleted"));
      setLaws(prev => prev.filter(l => l.id !== lawId));
    }
    setActionLoading(null);
  }

  async function updateReportStatus(reportId: string, newStatus: string) {
    clearMessages();
    setActionLoading(reportId);
    const { error: err } = await supabase
      .from("bug_reports")
      .update({ status: newStatus })
      .eq("id", reportId);
    if (err) setError(err.message);
    else {
      setSuccess(`Report status: ${newStatus}`);
      setBugReports(prev => prev.map(r => r.id === reportId ? { ...r, status: newStatus } : r));
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
      setSuccess(t("admin.proposalClosed"));
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
      setSuccess(t("admin.proposalActivated"));
      setProposals(prev => prev.map(p => p.id === proposalId ? { ...p, status: "active" } : p));
    }
    setActionLoading(null);
  }

  if (loading) {
    return (
      <AppShell>
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="w-8 h-8 text-fg-primary animate-spin" />
        </div>
      </AppShell>
    );
  }

  if (!authorized) {
    return (
      <AppShell userEmail={user?.email} userName={profile?.full_name} userRole={profile?.role}>
        <div className="max-w-lg mx-auto px-4 py-20 text-center">
          <Shield className="w-16 h-16 text-fg-danger mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-fg mb-2">{t("admin.accessDenied")}</h1>
          <p className="text-fg-muted mb-6">{t("admin.adminOnly")}</p>
          <Link href="/dashboard" className="btn-primary inline-flex items-center gap-2 overflow-hidden">
            <ArrowLeft className="w-4 h-4 shrink-0" />
            <span className="truncate">{t("common.backToDashboard")}</span>
          </Link>
        </div>
      </AppShell>
    );
  }

  const statusColor: Record<string, string> = {
    draft: "text-fg-muted bg-theme-muted",
    curation: "text-amber-300 bg-amber-900/30",
    active: "text-fg-primary bg-pangea-900/50",
    closed: "text-fg-muted bg-theme-muted",
    repealed: "text-fg-danger bg-danger-tint",
  };

  return (
    <AppShell userEmail={user?.email} userName={profile?.full_name} userRole={profile?.role}>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link href="/dashboard" className="p-2 rounded-lg text-fg-muted hover:text-fg hover:bg-theme-card transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-fg flex items-center gap-2">
              <Shield className="w-6 h-6 text-fg-danger" />
              {t("admin.title")}
            </h1>
            <p className="text-sm text-fg-muted mt-0.5">
              {t("admin.subtitle")}
            </p>
          </div>
        </div>

        {/* Messages */}
        {error && (
          <div className="mb-4 p-3 bg-danger-tint border border-theme rounded-lg text-fg-danger text-sm flex items-center gap-2">
            <XCircle className="w-4 h-4 shrink-0" /> {error}
          </div>
        )}
        {success && (
          <div className="mb-4 p-3 bg-green-900/30 border border-green-700/50 rounded-lg text-fg-success text-sm flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" /> {success}
          </div>
        )}

        {/* Stats overview */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          <div className="card p-4">
            <Users className="w-5 h-5 text-blue-400 mb-1" />
            <p className="text-2xl font-bold text-fg">{users.length}</p>
            <p className="text-xs text-fg-muted">{t("admin.citizens")}</p>
          </div>
          <div className="card p-4">
            <FileText className="w-5 h-5 text-fg-primary mb-1" />
            <p className="text-2xl font-bold text-fg">{proposals.length}</p>
            <p className="text-xs text-fg-muted">{t("admin.proposals")}</p>
          </div>
          <div className="card p-4">
            <BookOpen className="w-5 h-5 text-blue-400 mb-1" />
            <p className="text-2xl font-bold text-fg">{laws.length}</p>
            <p className="text-xs text-fg-muted">{t("admin.laws")}</p>
          </div>
          <div className="card p-4">
            <Bug className="w-5 h-5 text-red-400 mb-1" />
            <p className="text-2xl font-bold text-fg">{bugReports.filter(r => r.status === "open").length}</p>
            <p className="text-xs text-fg-muted">{t("admin.openReports")}</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 border-b border-theme pb-px">
          {([
            { key: "users", label: t("admin.users"), icon: Users },
            { key: "proposals", label: t("admin.proposals"), icon: FileText },
            { key: "laws", label: t("admin.laws"), icon: BookOpen },
            { key: "reports", label: t("admin.reports"), icon: Bug },
            { key: "stats", label: t("admin.statistics"), icon: BarChart3 },
            { key: "integrity", label: t("integrity.navTitle"), icon: ShieldCheck },
          ] as const).map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => { setActiveTab(key); clearMessages(); }}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium rounded-t-lg transition-colors ${
                activeTab === key
                  ? "text-fg-primary bg-theme-card border-b-2 border-pangea-400"
                  : "text-fg-muted hover:text-fg"
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
                <div className="w-10 h-10 rounded-full bg-pangea-800 border border-pangea-600 flex items-center justify-center text-sm text-fg-primary font-bold">
                  {(u.full_name ?? "?")[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-fg font-medium">{u.full_name ?? "No name"}</p>
                  <p className="text-xs text-fg-muted">{u.id.slice(0, 8)}...</p>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                  u.role === "admin" ? "text-fg-danger bg-danger-tint border border-theme" :
                  u.role === "moderator" ? "text-amber-300 bg-amber-900/30 border border-theme" :
                  "text-fg-muted bg-theme-muted"
                }`}>
                  {u.role === "admin" ? t("parties.admin") : u.role === "moderator" ? t("admin.moderator") : t("admin.citizen")}
                </span>
                {u.id !== user?.id && (
                  <div className="relative">
                    <select
                      value={u.role || "citizen"}
                      onChange={(e) => changeUserRole(u.id, e.target.value as UserRole)}
                      disabled={actionLoading === u.id}
                      className="appearance-none bg-theme-card border border-theme rounded-lg px-3 py-1.5 pr-8 text-xs text-fg cursor-pointer focus:outline-none focus:border-pangea-500"
                    >
                      <option value="citizen">{t("admin.citizen")}</option>
                      <option value="moderator">{t("admin.moderator")}</option>
                      <option value="admin">{t("parties.admin")}</option>
                    </select>
                    <ChevronDown className="w-3 h-3 text-fg-muted absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                )}
                {actionLoading === u.id && <Loader2 className="w-4 h-4 text-fg-primary animate-spin" />}
              </div>
            ))}
          </div>
        )}

        {/* Proposals tab */}
        {activeTab === "proposals" && (
          <div className="space-y-2">
            {proposals.length === 0 && (
              <div className="card p-8 text-center text-fg-muted text-sm">{t("admin.noProposals")}</div>
            )}
            {proposals.map((p) => (
              <div key={p.id} className="card p-4 flex items-center gap-4">
                <div className="flex-1 min-w-0">
                  <Link href={`/proposals/${p.id}`} className="text-sm text-fg font-medium hover:text-fg-primary transition-colors">
                    {p.title}
                  </Link>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${statusColor[p.status] || ""}`}>
                      {p.status}
                    </span>
                    {p.proposal_type && p.proposal_type !== "new" && (
                      <span className="text-xs text-purple-400 bg-purple-tint px-2 py-0.5 rounded-full">
                        {p.proposal_type}
                      </span>
                    )}
                    <span className="text-xs text-fg-muted">{formatDateTime(p.created_at)}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  {p.status === "curation" && (
                    <button
                      onClick={() => activateProposal(p.id)}
                      disabled={actionLoading === p.id}
                      className="p-2 rounded-lg text-fg-success hover:bg-green-900/30 transition-colors"
                      title={t("admin.promoteToDeliberation")}
                    >
                      <CheckCircle2 className="w-4 h-4" />
                    </button>
                  )}
                  {p.status === "active" && (
                    <button
                      onClick={() => closeProposal(p.id)}
                      disabled={actionLoading === p.id}
                      className="p-2 rounded-lg text-amber-400 hover:bg-amber-900/30 transition-colors"
                      title={t("admin.closeDeliberation")}
                    >
                      <XCircle className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    onClick={() => deleteProposal(p.id)}
                    disabled={actionLoading === p.id}
                    className="p-2 rounded-lg text-fg-danger hover:bg-danger-tint transition-colors"
                    title={t("admin.deleteProposal")}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  {actionLoading === p.id && <Loader2 className="w-4 h-4 text-fg-primary animate-spin" />}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Laws tab */}
        {activeTab === "laws" && (
          <div className="space-y-2">
            {laws.length === 0 && (
              <div className="card p-8 text-center text-fg-muted text-sm">{t("admin.noLaws")}</div>
            )}
            {laws.map((l) => (
              <div key={l.id} className="card p-4 flex items-center gap-4">
                <BookOpen className="w-5 h-5 text-blue-400 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-fg font-medium">{l.title}</p>
                  <div className="flex items-center gap-2 mt-1">
                    {l.code && <span className="text-xs text-blue-400 bg-blue-900/20 px-2 py-0.5 rounded-full">{l.code}</span>}
                    <span className="text-xs text-fg-muted">{l.law_type}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${l.status === "active" ? "text-fg-success bg-success-tint" : "text-fg-danger bg-danger-tint"}`}>
                      {l.status}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => deleteLaw(l.id)}
                  disabled={actionLoading === l.id}
                  className="p-2 rounded-lg text-fg-danger hover:bg-danger-tint transition-colors"
                  title={t("admin.deleteLaw")}
                >
                  {actionLoading === l.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Reports tab */}
        {activeTab === "reports" && (
          <div className="space-y-2">
            {bugReports.length === 0 && (
              <div className="card p-8 text-center text-fg-muted text-sm">{t("admin.noReports")}</div>
            )}
            {bugReports.map((r) => {
              const catColor: Record<string, string> = {
                bug: "text-red-400 bg-red-900/20",
                suggestion: "text-blue-400 bg-blue-900/20",
                question: "text-amber-400 bg-amber-900/20",
                other: "text-fg-muted bg-theme-muted",
              };
              const statusBadge: Record<string, string> = {
                open: "text-red-400 bg-red-900/20",
                in_progress: "text-amber-400 bg-amber-900/20",
                resolved: "text-fg-success bg-success-tint",
                closed: "text-fg-muted bg-theme-muted",
              };
              return (
                <div key={r.id} className="card p-4">
                  <div className="flex items-start gap-3">
                    <Bug className="w-5 h-5 text-fg-muted shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-fg font-medium">{r.title}</p>
                      {r.description && (
                        <p className="text-xs text-fg-muted mt-1 line-clamp-2">{r.description}</p>
                      )}
                      <div className="flex flex-wrap items-center gap-2 mt-2">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${catColor[r.category] || ""}`}>
                          {r.category}
                        </span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${statusBadge[r.status] || ""}`}>
                          {r.status.replace("_", " ")}
                        </span>
                        <span className="text-xs text-fg-muted">{formatDateTime(r.created_at)}</span>
                        {r.page_url && (
                          <span className="text-xs text-fg-muted truncate max-w-[200px]" title={r.page_url}>
                            {r.page_url.replace(/^https?:\/\/[^/]+/, "")}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <div className="relative">
                        <select
                          value={r.status}
                          onChange={(e) => updateReportStatus(r.id, e.target.value)}
                          disabled={actionLoading === r.id}
                          className="appearance-none bg-theme-card border border-theme rounded-lg px-3 py-1.5 pr-8 text-xs text-fg cursor-pointer focus:outline-none focus:border-pangea-500"
                        >
                          <option value="open">{t("admin.statusOpen")}</option>
                          <option value="in_progress">{t("admin.statusInProgress")}</option>
                          <option value="resolved">{t("admin.statusResolved")}</option>
                          <option value="closed">{t("admin.statusClosed")}</option>
                        </select>
                        <ChevronDown className="w-3 h-3 text-fg-muted absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      </div>
                      {actionLoading === r.id && <Loader2 className="w-4 h-4 text-fg-primary animate-spin" />}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Stats tab */}
        {activeTab === "stats" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="card p-6">
              <h3 className="text-sm font-semibold text-fg mb-4 flex items-center gap-2">
                <FileText className="w-4 h-4 text-fg-primary" />
                {t("admin.proposalsByStatus")}
              </h3>
              <div className="space-y-3">
                {(["draft", "curation", "active", "closed", "repealed"] as const).map((status) => {
                  const count = proposals.filter(p => p.status === status).length;
                  const pct = proposals.length > 0 ? (count / proposals.length) * 100 : 0;
                  return (
                    <div key={status}>
                      <div className="flex justify-between text-xs text-fg-muted mb-1">
                        <span className="capitalize">{status}</span>
                        <span className="font-medium">{count} ({pct.toFixed(0)}%)</span>
                      </div>
                      <div className="bg-theme-muted rounded-full h-2">
                        <div
                          className="bg-theme-primary h-2 rounded-full transition-all duration-500"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="card p-6">
              <h3 className="text-sm font-semibold text-fg mb-4 flex items-center gap-2">
                <Users className="w-4 h-4 text-blue-400" />
                {t("admin.usersByRole")}
              </h3>
              <div className="space-y-3">
                {(["citizen", "moderator", "admin"] as const).map((role) => {
                  const count = users.filter(u => (u.role || "citizen") === role).length;
                  const pct = users.length > 0 ? (count / users.length) * 100 : 0;
                  return (
                    <div key={role}>
                      <div className="flex justify-between text-xs text-fg-muted mb-1">
                        <span className="capitalize">{role}</span>
                        <span className="font-medium">{count} ({pct.toFixed(0)}%)</span>
                      </div>
                      <div className="bg-theme-muted rounded-full h-2">
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
        {/* Integrity tab */}
        {activeTab === "integrity" && (
          <IntegrityTab
            supabase={supabase}
            integrityStats={integrityStats}
            setIntegrityStats={setIntegrityStats}
            hashingAll={hashingAll}
            setHashingAll={setHashingAll}
            setSuccess={setSuccess}
            setError={setError}
          />
        )}
      </div>
    </AppShell>
  );
}

/* ── Integrity Tab Component ── */
function IntegrityTab({
  supabase,
  integrityStats,
  setIntegrityStats,
  hashingAll,
  setHashingAll,
  setSuccess,
  setError,
}: {
  supabase: ReturnType<typeof createClient>;
  integrityStats: Record<string, unknown> | null;
  setIntegrityStats: (s: Record<string, unknown> | null) => void;
  hashingAll: boolean;
  setHashingAll: (b: boolean) => void;
  setSuccess: (s: string | null) => void;
  setError: (s: string | null) => void;
}) {
  const { t } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [recentAudit, setRecentAudit] = useState<Array<Record<string, unknown>>>([]);

  useEffect(() => {
    loadIntegrityData();
  }, []);

  async function loadIntegrityData() {
    setLoading(true);
    try {
      const { data: stats } = await supabase.rpc("get_integrity_stats");
      if (stats) setIntegrityStats(stats as Record<string, unknown>);

      const { data: audit } = await supabase
        .from("hash_audit_log")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(20);
      if (audit) setRecentAudit(audit);
    } catch {
      // Non-critical
    } finally {
      setLoading(false);
    }
  }

  async function handleBatchHash() {
    setHashingAll(true);
    setError(null);
    try {
      const { data, error: rpcError } = await supabase.rpc("batch_hash_existing_records");
      if (rpcError) throw rpcError;
      const result = data as Record<string, unknown>;
      setSuccess(
        `Hashed ${result.total || 0} records: ${result.laws_hashed || 0} laws, ${result.proposals_hashed || 0} proposals, ${result.votes_hashed || 0} votes`
      );
      await loadIntegrityData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Batch hashing failed");
    } finally {
      setHashingAll(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-fg-muted" />
      </div>
    );
  }

  const stats = integrityStats || {};
  const hashesByType = (stats.hashes_by_type as Record<string, number>) || {};

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card p-4 text-center">
          <Hash className="w-5 h-5 text-primary mx-auto mb-1" />
          <p className="text-2xl font-bold text-fg">{(stats.total_hashes as number) || 0}</p>
          <p className="text-xs text-fg-muted">{t("integrity.totalHashes")}</p>
        </div>
        <div className="card p-4 text-center">
          <ShieldCheck className="w-5 h-5 text-green-500 mx-auto mb-1" />
          <p className="text-2xl font-bold text-fg">{(stats.recent_verifications as number) || 0}</p>
          <p className="text-xs text-fg-muted">{t("integrity.verificationsToday")}</p>
        </div>
        <div className="card p-4 text-center">
          <Scale className="w-5 h-5 text-amber-500 mx-auto mb-1" />
          <p className="text-2xl font-bold text-fg">{(stats.merkle_trees as number) || 0}</p>
          <p className="text-xs text-fg-muted">{t("integrity.merkleTrees")}</p>
        </div>
        <div className="card p-4 text-center">
          <AlertTriangle className={`w-5 h-5 mx-auto mb-1 ${((stats.recent_mismatches as number) || 0) > 0 ? "text-red-500" : "text-green-500"}`} />
          <p className="text-2xl font-bold text-fg">{(stats.recent_mismatches as number) || 0}</p>
          <p className="text-xs text-fg-muted">{t("integrity.mismatches")}</p>
        </div>
      </div>

      {/* Hashes by Type */}
      {Object.keys(hashesByType).length > 0 && (
        <div className="card p-6">
          <h3 className="text-sm font-semibold text-fg mb-4 flex items-center gap-2">
            <Hash className="w-4 h-4 text-primary" />
            Hashes by Record Type
          </h3>
          <div className="space-y-3">
            {Object.entries(hashesByType).map(([type, count]) => {
              const total = (stats.total_hashes as number) || 1;
              const pct = (count / total) * 100;
              return (
                <div key={type}>
                  <div className="flex justify-between text-xs text-fg-muted mb-1">
                    <span className="capitalize">{type}</span>
                    <span className="font-medium">{count} ({pct.toFixed(0)}%)</span>
                  </div>
                  <div className="bg-theme-muted rounded-full h-2">
                    <div
                      className="bg-theme-primary h-2 rounded-full transition-all duration-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="card p-6">
        <h3 className="text-sm font-semibold text-fg mb-4">Admin Actions</h3>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={handleBatchHash}
            disabled={hashingAll}
            className="px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors flex items-center gap-2"
          >
            {hashingAll ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Hash className="w-4 h-4" />
            )}
            {hashingAll ? "Hashing..." : "Hash All Unhashed Records"}
          </button>
          <Link
            href="/verify"
            className="px-4 py-2.5 rounded-lg border text-sm font-medium hover:bg-muted transition-colors flex items-center gap-2"
          >
            <ShieldCheck className="w-4 h-4" />
            Open Public Verification Page
          </Link>
        </div>
      </div>

      {/* Recent Audit Log */}
      {recentAudit.length > 0 && (
        <div className="card p-6">
          <h3 className="text-sm font-semibold text-fg mb-4">Recent Audit Log</h3>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {recentAudit.map((entry) => (
              <div key={entry.id as string} className="flex items-center gap-3 text-xs p-2 rounded hover:bg-muted/50">
                <div className={`w-2 h-2 rounded-full shrink-0 ${
                  entry.operation === "hash_mismatch" ? "bg-red-500" :
                  entry.operation === "hash_verified" ? "bg-green-500" :
                  "bg-blue-500"
                }`} />
                <span className="font-mono text-fg-muted">{(entry.operation as string) || ""}</span>
                <span className="text-fg-muted capitalize">{(entry.entity_type as string) || ""}</span>
                {typeof entry.content_hash === "string" && entry.content_hash && (
                  <code className="font-mono text-fg-muted truncate max-w-32">
                    {entry.content_hash.slice(0, 16)}...
                  </code>
                )}
                <span className="text-fg-muted ml-auto whitespace-nowrap">
                  {new Date(entry.created_at as string).toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

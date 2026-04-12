"use client";

import { createClient } from "@/lib/supabase/client";
import { useEffect, useState, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import AppShell from "@/components/AppShell";
import GroupTree from "@/components/GroupTree";
import PrivacyName from "@/components/PrivacyName";
import UidBadge from "@/components/UidBadge";
import {
  ArrowLeft,
  Users,
  FolderTree,
  Flag,
  Map,
  Globe,
  Briefcase,
  Layers,
  Crown,
  Star,
  Shield,
  ShieldCheck,
  FileText,
  Wallet,
  Eye,
  UserPlus,
  UserMinus,
  ChevronRight,
  ChevronDown,
  MessageSquare,
  Vote,
  Settings,
  Trash2,
  AlertCircle,
  MoreVertical,
  X,
  Search,
  Check,
  Loader2,
} from "lucide-react";
import type {
  Profile,
  Group,
  GroupMember,
  GroupMemberRole,
  GroupTreeNode,
  GroupVote,
  GroupForumPost,
  GroupAncestor,
  Proposal,
} from "@/lib/types";
import { useLanguage } from "@/components/language-provider";
import GroupDiscussions from "@/components/GroupDiscussions";
import GroupLaws from "@/components/GroupLaws";
import GroupProposals from "@/components/GroupProposals";
import GroupElections from "@/components/GroupElections";
import GroupPositions from "@/components/GroupPositions";
import GroupSettingsPanel from "@/components/GroupSettings";
import {
  ROLE_META,
  hasPermission,
  getAssignableRoles,
  canRemoveMember,
  sortByRole,
  outranks,
} from "@/lib/group-permissions";

type TabId = "info" | "members" | "laws" | "proposals" | "elections" | "discussions" | "subgroups" | "votes" | "settings";

const LUCIDE_ICONS = { Crown, Star, Shield, ShieldCheck, FileText, Wallet, Users, Eye };
function getRoleIcon(role: GroupMemberRole) {
  const meta = ROLE_META[role];
  return LUCIDE_ICONS[meta?.icon as keyof typeof LUCIDE_ICONS] || Users;
}
function getRoleColor(role: GroupMemberRole) {
  return ROLE_META[role]?.colorClass || "text-slate-400 bg-slate-500/15";
}

export default function GroupDetailPage() {
  const supabase = createClient();
  const router = useRouter();
  const params = useParams();
  const groupId = params.id as string;
  const { t } = useLanguage();

  const [user, setUser] = useState<{ id: string } | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isGuest, setIsGuest] = useState(true);
  const [pendingDelegations, setPendingDelegations] = useState(0);

  const [group, setGroup] = useState<Group | null>(null);
  const [members, setMembers] = useState<(Omit<GroupMember, 'profiles'> & { profiles: { full_name: string | null } })[]>([]);
  const [ancestors, setAncestors] = useState<GroupAncestor[]>([]);
  const [children, setChildren] = useState<GroupTreeNode[]>([]);
  const [groupVotes, setGroupVotes] = useState<(GroupVote & { proposals: Proposal })[]>([]);
  const [activeProposals, setActiveProposals] = useState<Proposal[]>([]);
  const [contentCounts, setContentCounts] = useState<{ laws: number; proposals: number; elections: number }>({ laws: 0, proposals: 0, elections: 0 });

  const [currentMember, setCurrentMember] = useState<(Omit<GroupMember, 'profiles'> & { profiles: { full_name: string | null } }) | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabId>("info");
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    const { data: { user: u } } = await supabase.auth.getUser();
    setUser(u);
    setIsGuest(!u);

    if (u) {
      const { data: prof } = await supabase.from("profiles").select("*").eq("id", u.id).single();
      setProfile(prof);
      const { count } = await supabase.from("delegations").select("*", { count: "exact", head: true }).eq("delegate_id", u.id).eq("status", "pending");
      setPendingDelegations(count || 0);
    }

    // Group data
    const { data: g } = await supabase.from("groups").select("*").eq("id", groupId).single();
    if (!g) { setLoading(false); return; }
    setGroup(g as Group);

    // Members (separate query for profiles to avoid FK issue)
    const { data: mems } = await supabase
      .from("group_members")
      .select("*")
      .eq("group_id", groupId)
      .order("role", { ascending: true });

    if (mems) {
      // Fetch profiles separately
      const userIds = mems.map((m: GroupMember) => m.user_id);
      const { data: profiles } = await supabase.from("profiles").select("id, full_name").in("id", userIds);
      const profileMap: Record<string, { id: string; full_name: string | null }> = {};
      (profiles || []).forEach((p: { id: string; full_name: string | null }) => { profileMap[p.id] = p; });

      type EnrichedMember = Omit<GroupMember, 'profiles'> & { profiles: { full_name: string | null } };
      const enriched: EnrichedMember[] = mems.map((m: GroupMember) => ({
        ...m,
        profiles: { full_name: profileMap[m.user_id]?.full_name ?? null },
      }));
      setMembers(enriched);

      if (u) {
        const mine = enriched.find((em) => em.user_id === u.id);
        setCurrentMember(mine || null);
      }
    }

    // Ancestors (breadcrumb)
    const { data: anc } = await supabase.rpc("get_group_ancestors", { p_group_id: groupId });
    if (anc) setAncestors(anc as GroupAncestor[]);

    // Children
    const { data: childData } = await supabase.rpc("get_group_tree", { p_root_id: groupId });
    if (childData) setChildren(childData as GroupTreeNode[]);

    // T09: Content counts for tab badges
    const [
      { count: lawsCount },
      { count: proposalsCount },
      { count: electionsCount },
    ] = await Promise.all([
      supabase.from("laws").select("*", { count: "exact", head: true }).eq("group_id", groupId),
      supabase.from("proposals").select("*", { count: "exact", head: true }).eq("group_id", groupId),
      supabase.from("elections").select("*", { count: "exact", head: true }).eq("group_id", groupId),
    ]);
    setContentCounts({ laws: lawsCount ?? 0, proposals: proposalsCount ?? 0, elections: electionsCount ?? 0 });

    // Group votes
    const { data: votes } = await supabase
      .from("group_votes")
      .select("*, proposals(id, title, status)")
      .eq("group_id", groupId)
      .order("created_at", { ascending: false });
    if (votes) setGroupVotes(votes as (GroupVote & { proposals: Proposal })[]);

    // Active proposals for vote tab
    if (u) {
      const { data: props } = await supabase.from("proposals").select("id, title, status").eq("status", "active");
      if (props) setActiveProposals(props as Proposal[]);
    }

    setLoading(false);
  }, [groupId]);

  useEffect(() => { loadData(); }, [loadData]);

  // Join/Leave group
  async function handleJoin() {
    if (!user) return;
    setJoining(true);
    await supabase.from("group_members").insert({ group_id: groupId, user_id: user.id, role: "member" });
    // Follow group
    await supabase.from("follows").upsert({ follower_id: user.id, target_type: "group", target_id: groupId }, { onConflict: "follower_id,target_type,target_id" });
    loadData();
    setJoining(false);
  }

  async function handleLeave() {
    if (!user || !currentMember) return;
    if (currentMember.role === "founder" || currentMember.role === "co_founder") {
      setError(t("groups.errors.founderCantLeave"));
      return;
    }
    setJoining(true);
    await supabase.from("group_members").delete().eq("group_id", groupId).eq("user_id", user.id);
    await supabase.from("follows").delete().match({ follower_id: user.id, target_type: "group", target_id: groupId });
    loadData();
    setJoining(false);
  }

  // Role dropdown state
  const [roleDropdownOpen, setRoleDropdownOpen] = useState<string | null>(null);

  // T06: Co-founder invite state
  const [coFounderOpen, setCoFounderOpen] = useState(false);
  const [coFounderSearch, setCoFounderSearch] = useState("");
  const [coFounderResults, setCoFounderResults] = useState<{ id: string; full_name: string | null }[]>([]);
  const [coFounderSearching, setCoFounderSearching] = useState(false);
  const [coFounderInviting, setCoFounderInviting] = useState(false);
  const [coFounderSuccess, setCoFounderSuccess] = useState<string | null>(null);

  // T06: Search users for co-founder invite
  async function searchUsersForCoFounder(query: string) {
    setCoFounderSearch(query);
    if (query.length < 2) { setCoFounderResults([]); return; }
    setCoFounderSearching(true);
    const { data } = await supabase
      .from("profiles")
      .select("id, full_name")
      .ilike("full_name", `%${query}%`)
      .limit(8);
    // Filter out current founders/co-founders and self
    const founderIds = new Set(
      members.filter((m) => m.role === "founder" || m.role === "co_founder").map((m) => m.user_id)
    );
    if (user) founderIds.add(user.id);
    setCoFounderResults((data || []).filter((u) => !founderIds.has(u.id)));
    setCoFounderSearching(false);
  }

  // T06: Invite co-founder via RPC
  async function handleInviteCoFounder(targetUserId: string) {
    setCoFounderInviting(true);
    setError(null);
    const { data, error: rpcError } = await supabase.rpc("invite_co_founder", {
      p_group_id: groupId,
      p_target_user_id: targetUserId,
    });
    if (rpcError || !data?.success) {
      const errCode = data?.error || rpcError?.message || "";
      const errMap: Record<string, string> = {
        ALREADY_CO_FOUNDER: t("groups.errors.alreadyCoFounder"),
        USER_NOT_FOUND: t("groups.errors.userNotFound"),
        CANNOT_INVITE_SELF: t("groups.errors.cannotInviteSelf"),
      };
      setError(errMap[errCode] || t("groups.errors.inviteFailed"));
      setCoFounderInviting(false);
      return;
    }
    setCoFounderSuccess(
      data.action === "promoted"
        ? t("groups.coFounder.successPromoted")
        : t("groups.coFounder.successInvited")
    );
    setCoFounderSearch("");
    setCoFounderResults([]);
    setCoFounderInviting(false);
    loadData();
    // Auto-dismiss success after 3s
    setTimeout(() => setCoFounderSuccess(null), 3000);
  }

  // Change member role via RPC (server-side hierarchy enforcement)
  async function handleRoleChange(memberId: string, targetCurrentRole: GroupMemberRole, newRole: GroupMemberRole) {
    if (!myRole) return;
    // Client-side pre-check for UX (server does the real check)
    const assignable = getAssignableRoles(myRole, targetCurrentRole);
    if (!assignable.includes(newRole)) {
      setError(t("groups.errors.cannotAssignRole"));
      return;
    }
    const { data, error: rpcError } = await supabase.rpc("change_group_member_role", {
      p_group_id: groupId,
      p_target_member_id: memberId,
      p_new_role: newRole,
    });
    if (rpcError || !data?.success) {
      setError(data?.error || rpcError?.message || t("groups.errors.cannotAssignRole"));
      return;
    }
    setRoleDropdownOpen(null);
    loadData();
  }

  // Remove member via RPC (server-side hierarchy enforcement)
  async function handleRemoveMember(memberId: string, targetRole: GroupMemberRole) {
    if (!myRole) return;
    if (!canRemoveMember(myRole, targetRole)) {
      setError(t("groups.errors.cannotRemoveMember"));
      return;
    }
    const { data, error: rpcError } = await supabase.rpc("remove_group_member", {
      p_group_id: groupId,
      p_target_member_id: memberId,
    });
    if (rpcError || !data?.success) {
      setError(data?.error || rpcError?.message || t("groups.errors.cannotRemoveMember"));
      return;
    }
    loadData();
  }

  // Group vote
  async function handleGroupVote(proposalId: string, voteType: "yea" | "nay" | "abstain") {
    if (!user) return;
    await supabase.from("group_votes").upsert(
      { group_id: groupId, proposal_id: proposalId, vote_type: voteType, decided_by: user.id },
      { onConflict: "group_id,proposal_id" }
    );
    loadData();
  }

  const myRole = currentMember?.role as GroupMemberRole | undefined;
  const canEditSettings = myRole ? hasPermission(myRole, "edit_settings") : false;
  const canAssign = myRole ? hasPermission(myRole, "assign_roles") : false;
  const canModerate = myRole ? hasPermission(myRole, "moderate_content") : false;
  // Legacy alias used throughout UI
  const isAdmin = canEditSettings;

  const tabs: { id: TabId; labelKey: string; icon: typeof Users; count?: number }[] = [
    { id: "info", labelKey: "groups.tabs.info", icon: Globe },
    { id: "members", labelKey: "groups.tabs.members", icon: Users, count: members.length },
    { id: "laws", labelKey: "groups.tabs.laws", icon: Layers, count: contentCounts.laws },
    { id: "proposals", labelKey: "groups.tabs.proposals", icon: FileText, count: contentCounts.proposals },
    { id: "elections", labelKey: "groups.tabs.elections", icon: Vote, count: contentCounts.elections },
    { id: "discussions", labelKey: "groups.tabs.discussions", icon: MessageSquare },
    { id: "subgroups", labelKey: "groups.tabs.subgroups", icon: FolderTree, count: children.length },
    { id: "votes", labelKey: "groups.tabs.votes", icon: Flag },
    { id: "settings", labelKey: "groups.tabs.settings", icon: Settings },
  ];

  if (loading) {
    return (
      <AppShell isGuest pendingDelegations={0}>
        <div className="flex items-center justify-center py-24">
          <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
        </div>
      </AppShell>
    );
  }

  if (!group) {
    return (
      <AppShell isGuest pendingDelegations={0}>
        <div className="max-w-3xl mx-auto px-4 py-16 text-center">
          <p className="text-lg font-semibold" style={{ color: "var(--foreground)" }}>
            {t("groups.notFound")}
          </p>
          <Link href="/groups" className="text-purple-400 text-sm mt-2 inline-block hover:underline">
            {t("groups.backToGroups")}
          </Link>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell
      userEmail={user ? "" : undefined}
      userName={profile?.full_name}
      userRole={profile?.role}
      isGuest={isGuest}
      pendingDelegations={pendingDelegations}
    >
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        {/* ── Breadcrumb ── */}
        <nav className="flex items-center gap-1.5 text-sm mb-6 flex-wrap" style={{ color: "var(--muted-foreground)" }}>
          <Link href="/groups" className="hover:underline">{t("groups.title")}</Link>
          {ancestors.map((a, i) => (
            <span key={a.id} className="flex items-center gap-1.5">
              <ChevronRight className="w-3.5 h-3.5" />
              {a.id === groupId ? (
                <span style={{ color: "var(--foreground)" }} className="font-medium">{a.logo_emoji} {a.name}</span>
              ) : (
                <Link href={`/groups/${a.id}`} className="hover:underline">{a.logo_emoji} {a.name}</Link>
              )}
            </span>
          ))}
        </nav>

        {/* ── Header ── */}
        <div className="flex flex-col sm:flex-row gap-4 sm:items-start mb-8">
          <div className="text-5xl shrink-0">{group.logo_emoji}</div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-bold" style={{ color: "var(--foreground)" }}>{group.name}</h1>
              {group.uid && <UidBadge uid={group.uid} />}
            </div>
            {group.description && (
              <p className="mt-2 text-sm leading-relaxed" style={{ color: "var(--muted-foreground)" }}>
                {group.description}
              </p>
            )}
            <div className="flex items-center gap-4 mt-3 text-xs" style={{ color: "var(--muted-foreground)" }}>
              <span className="flex items-center gap-1">
                <Users className="w-3.5 h-3.5" /> {members.length} {t("groups.members")}
              </span>
              <span className="flex items-center gap-1">
                <FolderTree className="w-3.5 h-3.5" /> {children.length} {t("groups.subgroups")}
              </span>
              {group.group_type === "jurisdiction" && group.location_name && (
                <span className="flex items-center gap-1">
                  <Map className="w-3.5 h-3.5" /> {group.location_name}
                </span>
              )}
            </div>
          </div>

          {/* Join / Leave button */}
          {!isGuest && (
            <div className="shrink-0">
              {currentMember ? (
                <button
                  onClick={handleLeave}
                  disabled={joining || currentMember.role === "founder" || currentMember.role === "co_founder"}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-lg border text-sm font-medium transition-colors hover:bg-red-500/10 hover:border-red-500/30 hover:text-red-400 disabled:opacity-50"
                  style={{ borderColor: "var(--border)", color: "var(--foreground)" }}
                >
                  <UserMinus className="w-4 h-4" />
                  {t("groups.leave")}
                </button>
              ) : (
                <button
                  onClick={handleJoin}
                  disabled={joining}
                  className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-500 hover:to-purple-600 text-white text-sm font-medium rounded-lg transition-all"
                >
                  <UserPlus className="w-4 h-4" />
                  {joining ? "..." : t("groups.join")}
                </button>
              )}
            </div>
          )}
        </div>

        {error && (
          <div className="flex items-center gap-2 px-4 py-3 mb-6 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
            <AlertCircle className="w-4 h-4 shrink-0" /> {error}
          </div>
        )}

        {/* ── Tabs ── */}
        <div className="flex gap-1 mb-6 overflow-x-auto pb-1" style={{ borderBottom: "1px solid var(--border)" }}>
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors shrink-0 ${
                  active ? "border-purple-500 text-purple-400" : "border-transparent hover:text-purple-300"
                }`}
                style={!active ? { color: "var(--muted-foreground)" } : undefined}
              >
                <Icon className="w-4 h-4" />
                {t(tab.labelKey)}
                {tab.count !== undefined && (
                  <span className="px-1.5 py-0.5 text-[10px] rounded-full bg-[var(--muted)]">{tab.count}</span>
                )}
              </button>
            );
          })}
        </div>

        {/* ── Tab Content ── */}
        <div className="rounded-xl border overflow-hidden" style={{ backgroundColor: "var(--card)", borderColor: "var(--border)" }}>
          {/* INFO TAB */}
          {activeTab === "info" && (
            <div className="p-6 space-y-6">
              {group.group_type === "party" && group.manifesto && (
                <div>
                  <h3 className="text-sm font-semibold mb-2" style={{ color: "var(--foreground)" }}>{t("groups.manifesto")}</h3>
                  <p className="text-sm leading-relaxed" style={{ color: "var(--muted-foreground)" }}>{group.manifesto}</p>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-lg" style={{ backgroundColor: "var(--muted)" }}>
                  <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: "var(--muted-foreground)" }}>{t("groups.form.type")}</p>
                  <p className="text-sm font-medium" style={{ color: "var(--foreground)" }}>{t(`groups.type.${group.group_type}`)}</p>
                </div>
                <div className="p-4 rounded-lg" style={{ backgroundColor: "var(--muted)" }}>
                  <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: "var(--muted-foreground)" }}>{t("groups.created")}</p>
                  <p className="text-sm font-medium" style={{ color: "var(--foreground)" }}>{new Date(group.created_at).toLocaleDateString()}</p>
                </div>
                {group.group_type === "jurisdiction" && (
                  <>
                    <div className="p-4 rounded-lg" style={{ backgroundColor: "var(--muted)" }}>
                      <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: "var(--muted-foreground)" }}>{t("groups.form.jurisdictionType")}</p>
                      <p className="text-sm font-medium" style={{ color: "var(--foreground)" }}>{t(`groups.form.jurisdictionType.${group.jurisdiction_type || "virtual"}`)}</p>
                    </div>
                    {group.location_name && (
                      <div className="p-4 rounded-lg" style={{ backgroundColor: "var(--muted)" }}>
                        <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: "var(--muted-foreground)" }}>{t("groups.form.location")}</p>
                        <p className="text-sm font-medium" style={{ color: "var(--foreground)" }}>{group.location_name}</p>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          )}

          {/* MEMBERS TAB */}
          {activeTab === "members" && (
            <div className="divide-y" style={{ borderColor: "var(--border)" }}>
              {/* T06: Co-Founder Invite (founder only) */}
              {myRole === "founder" && (
                <div className="px-5 py-4 space-y-3" style={{ borderBottom: "1px solid var(--border)" }}>
                  {!coFounderOpen ? (
                    <button
                      onClick={() => setCoFounderOpen(true)}
                      className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white text-sm font-medium rounded-lg transition-all"
                    >
                      <Crown className="w-4 h-4" />
                      {t("groups.coFounder.invite")}
                    </button>
                  ) : (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="text-sm font-semibold" style={{ color: "var(--foreground)" }}>
                            {t("groups.coFounder.invite")}
                          </h4>
                          <p className="text-xs mt-0.5" style={{ color: "var(--muted-foreground)" }}>
                            {t("groups.coFounder.description")}
                          </p>
                        </div>
                        <button
                          onClick={() => { setCoFounderOpen(false); setCoFounderSearch(""); setCoFounderResults([]); setCoFounderSuccess(null); }}
                          className="p-1.5 rounded hover:bg-[var(--muted)] transition-colors"
                        >
                          <X className="w-4 h-4" style={{ color: "var(--muted-foreground)" }} />
                        </button>
                      </div>

                      {coFounderSuccess && (
                        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-green-500/10 border border-green-500/30 text-green-400 text-sm">
                          <Check className="w-4 h-4 shrink-0" /> {coFounderSuccess}
                        </div>
                      )}

                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "var(--muted-foreground)" }} />
                        <input
                          type="text"
                          value={coFounderSearch}
                          onChange={(e) => searchUsersForCoFounder(e.target.value)}
                          placeholder={t("groups.coFounder.searchPlaceholder")}
                          className="w-full pl-10 pr-4 py-2.5 rounded-lg border text-sm bg-transparent outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500/50 transition-colors"
                          style={{ borderColor: "var(--border)", color: "var(--foreground)" }}
                        />
                        {coFounderSearching && (
                          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin" style={{ color: "var(--muted-foreground)" }} />
                        )}
                      </div>

                      {coFounderSearch.length >= 2 && coFounderResults.length === 0 && !coFounderSearching && (
                        <p className="text-xs px-1" style={{ color: "var(--muted-foreground)" }}>
                          {t("groups.coFounder.noResults")}
                        </p>
                      )}

                      {coFounderResults.length > 0 && (
                        <div className="rounded-lg border overflow-hidden" style={{ borderColor: "var(--border)" }}>
                          {coFounderResults.map((u) => (
                            <div
                              key={u.id}
                              className="flex items-center gap-3 px-4 py-2.5 hover:bg-[var(--muted)] transition-colors"
                              style={{ borderBottom: "1px solid var(--border)" }}
                            >
                              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center text-xs font-bold text-white shrink-0">
                                {(u.full_name || "?")[0].toUpperCase()}
                              </div>
                              <span className="flex-1 text-sm font-medium truncate" style={{ color: "var(--foreground)" }}>
                                {u.full_name || "Anonymous"}
                              </span>
                              <button
                                onClick={() => handleInviteCoFounder(u.id)}
                                disabled={coFounderInviting}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-xs font-medium transition-colors disabled:opacity-50"
                              >
                                {coFounderInviting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Crown className="w-3 h-3" />}
                                {t("groups.coFounder.confirm")}
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {sortByRole(members).map((m) => {
                const mRole = m.role as GroupMemberRole;
                const RoleIcon = getRoleIcon(mRole);
                const roleColor = getRoleColor(mRole);
                const assignable = myRole ? getAssignableRoles(myRole, mRole) : [];
                const canKick = myRole ? canRemoveMember(myRole, mRole) : false;
                const showActions = canAssign && m.user_id !== user?.id && assignable.length > 0;
                const isDropdownOpen = roleDropdownOpen === m.id;

                return (
                  <div key={m.id} className="flex items-center gap-4 px-5 py-3.5 relative">
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-purple-600 to-purple-800 flex items-center justify-center text-xs font-bold text-white shrink-0">
                      {(m.profiles?.full_name || "?")[0].toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <PrivacyName userId={m.user_id} fullName={m.profiles?.full_name || null} fallback="Anonymous" className="text-sm font-medium" />
                    </div>
                    <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold uppercase tracking-wider ${roleColor}`}>
                      <RoleIcon className="w-3 h-3" />
                      {t(`groups.role.${m.role}`)}
                    </span>
                    {m.vote_weight !== 1 && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--muted)]" style={{ color: "var(--muted-foreground)" }}>
                        {m.vote_weight}x
                      </span>
                    )}
                    {/* Role management actions */}
                    {(showActions || canKick) && (
                      <div className="relative">
                        <button
                          onClick={() => setRoleDropdownOpen(isDropdownOpen ? null : m.id)}
                          className="p-1.5 rounded hover:bg-[var(--muted)] transition-colors"
                          title={t("groups.manageRole")}
                        >
                          <MoreVertical className="w-4 h-4" style={{ color: "var(--muted-foreground)" }} />
                        </button>
                        {isDropdownOpen && (
                          <div
                            className="absolute right-0 top-full mt-1 w-56 rounded-lg border shadow-xl z-50 py-1"
                            style={{ backgroundColor: "var(--card)", borderColor: "var(--border)" }}
                          >
                            <div className="px-3 py-2 border-b" style={{ borderColor: "var(--border)" }}>
                              <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "var(--muted-foreground)" }}>
                                {t("groups.changeRole")}
                              </p>
                            </div>
                            {assignable.map((r) => {
                              const RIcon = getRoleIcon(r);
                              const rColor = getRoleColor(r);
                              return (
                                <button
                                  key={r}
                                  onClick={() => handleRoleChange(m.id, mRole, r)}
                                  className="w-full flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-[var(--muted)] transition-colors text-left"
                                  style={{ color: "var(--foreground)" }}
                                >
                                  <span className={`flex items-center justify-center w-6 h-6 rounded-full ${rColor}`}>
                                    <RIcon className="w-3 h-3" />
                                  </span>
                                  {t(`groups.role.${r}`)}
                                </button>
                              );
                            })}
                            {canKick && (
                              <>
                                <div className="border-t my-1" style={{ borderColor: "var(--border)" }} />
                                <button
                                  onClick={() => { handleRemoveMember(m.id, mRole); setRoleDropdownOpen(null); }}
                                  className="w-full flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-red-500/10 transition-colors text-left text-red-400"
                                >
                                  <Trash2 className="w-4 h-4" />
                                  {t("groups.removeMember")}
                                </button>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
              {members.length === 0 && (
                <div className="text-center py-12 text-sm" style={{ color: "var(--muted-foreground)" }}>
                  {t("groups.noMembers")}
                </div>
              )}
            </div>
          )}

          {/* LAWS TAB (T09 — Mini-Pangea) */}
          {activeTab === "laws" && (
            <GroupLaws groupId={groupId} groupName={group.name} isMember={!!currentMember} isGuest={isGuest} />
          )}

          {/* PROPOSALS TAB (T09 — Mini-Pangea) */}
          {activeTab === "proposals" && (
            <GroupProposals
              groupId={groupId}
              groupName={group.name}
              isMember={!!currentMember}
              isGuest={isGuest}
            />
          )}

          {/* ELECTIONS TAB (T09 — Mini-Pangea) */}
          {activeTab === "elections" && (
            <div className="space-y-6">
              <div className="px-5 pt-5">
                <GroupPositions
                  groupId={groupId}
                  canManageElections={isAdmin && !isGuest}
                />
              </div>
              <GroupElections
                groupId={groupId}
                groupName={group.name}
                isAdmin={isAdmin}
                isGuest={isGuest}
              />
            </div>
          )}

          {/* SUBGROUPS TAB */}
          {activeTab === "subgroups" && (
            <div className="py-2">
              {children.length > 0 ? (
                <GroupTree nodes={children} rootId={groupId} defaultExpanded />
              ) : (
                <div className="text-center py-12 text-sm" style={{ color: "var(--muted-foreground)" }}>
                  {t("groups.noSubgroups")}
                </div>
              )}
            </div>
          )}

          {/* VOTES TAB */}
          {activeTab === "votes" && (
            <div className="p-6 space-y-6">
              {/* Existing group votes */}
              {groupVotes.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold" style={{ color: "var(--foreground)" }}>{t("groups.officialPositions")}</h3>
                  {groupVotes.map((v) => (
                    <div key={v.id} className="flex items-center gap-3 p-3 rounded-lg" style={{ backgroundColor: "var(--muted)" }}>
                      <span className="flex-1 text-sm" style={{ color: "var(--foreground)" }}>
                        {v.proposals?.title || "—"}
                      </span>
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${
                        v.vote_type === "yea" ? "bg-green-500/15 text-green-400" :
                        v.vote_type === "nay" ? "bg-red-500/15 text-red-400" :
                        "bg-gray-500/15 text-gray-400"
                      }`}>
                        {v.vote_type}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* Set position on proposals (admin only) */}
              {isAdmin && activeProposals.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold" style={{ color: "var(--foreground)" }}>{t("groups.setPosition")}</h3>
                  {activeProposals.map((p) => {
                    const existing = groupVotes.find((v) => v.proposal_id === p.id);
                    return (
                      <div key={p.id} className="flex items-center gap-3 p-3 rounded-lg" style={{ backgroundColor: "var(--muted)" }}>
                        <span className="flex-1 text-sm truncate" style={{ color: "var(--foreground)" }}>{p.title}</span>
                        <div className="flex gap-1.5">
                          {(["yea", "nay", "abstain"] as const).map((vt) => (
                            <button
                              key={vt}
                              onClick={() => handleGroupVote(p.id, vt)}
                              className={`px-2.5 py-1 rounded text-[10px] font-bold uppercase transition-colors ${
                                existing?.vote_type === vt
                                  ? vt === "yea" ? "bg-green-500 text-white" : vt === "nay" ? "bg-red-500 text-white" : "bg-gray-500 text-white"
                                  : "bg-[var(--card)] hover:bg-[var(--muted)]"
                              }`}
                              style={existing?.vote_type !== vt ? { color: "var(--muted-foreground)" } : undefined}
                            >
                              {vt}
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {groupVotes.length === 0 && !isAdmin && (
                <div className="text-center py-12 text-sm" style={{ color: "var(--muted-foreground)" }}>
                  {t("groups.noVotes")}
                </div>
              )}
            </div>
          )}

          {/* DISCUSSIONS TAB (B4 — Group Discussions with voting, threading, mentions) */}
          {activeTab === "discussions" && (
            <GroupDiscussions
              groupId={groupId}
              userId={user?.id}
              isMember={!!currentMember}
              isAdmin={isAdmin}
              groupName={group.name}
            />
          )}

          {/* SETTINGS TAB (T10 — Hierarchical Settings) */}
          {activeTab === "settings" && (
            <GroupSettingsPanel
              groupId={groupId}
              settings={group.settings}
              lockedSettings={group.locked_settings || {}}
              userRole={myRole}
              hasChildren={children.length > 0}
              parentGroupId={group.parent_group_id}
            />
          )}
        </div>
      </div>
    </AppShell>
  );
}

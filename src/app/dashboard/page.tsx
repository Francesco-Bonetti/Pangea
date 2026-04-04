import { createClient } from "@/lib/supabase/server";
import AppShell from "@/components/AppShell";
import ProposalCard from "@/components/ProposalCard";
import StatCard from "@/components/StatCard";
import type { Proposal, ProposalResults, ProposalWithResults } from "@/lib/types";
import {
  Plus,
  Globe,
  FileText,
  Clock,
  CheckCircle2,
  Flame,
  Users,
  BookOpen,
  Vote,
  Flag,
} from "lucide-react";
import Link from "next/link";

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isGuest = !user;

  // Fetch profile (only if authenticated)
  let profile = null;
  if (user) {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();
    profile = data;
  }

  // Fetch public proposals (active, closed, curation)
  const { data: proposals, error } = await supabase
    .from("proposals")
    .select("*")
    .in("status", ["active", "closed", "curation"])
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error loading proposals:", error);
  }

  // Fetch current user's drafts (only if authenticated)
  let drafts: Proposal[] = [];
  if (user) {
    const { data } = await supabase
      .from("proposals")
      .select("*")
      .eq("author_id", user.id)
      .eq("status", "draft")
      .order("created_at", { ascending: false });
    drafts = data ?? [];
  }

  // Enrich proposals with results and signals
  const enrichedProposals: ProposalWithResults[] = await Promise.all(
    (proposals || []).map(async (proposal: Proposal) => {
      if (proposal.status === "curation") {
        const { count } = await supabase
          .from("proposal_signals")
          .select("*", { count: "exact", head: true })
          .eq("proposal_id", proposal.id);

        return {
          ...proposal,
          signal_count: count ?? 0,
        };
      }

      // For active/closed proposals: vote results
      const resultsRes = await supabase.rpc("get_proposal_results", {
        p_proposal_id: proposal.id,
      });

      const results: ProposalResults = resultsRes.data?.[0] ?? {
        yea_count: 0,
        nay_count: 0,
        abstain_count: 0,
      };

      // Distributed results
      const { data: distResults } = await supabase.rpc(
        "get_distributed_proposal_results",
        { p_proposal_id: proposal.id }
      );

      // Check if user has voted (only if authenticated)
      let hasVoted = false;
      if (user) {
        const votedRes = await supabase.rpc("has_user_voted", {
          p_proposal_id: proposal.id,
        });
        hasVoted = votedRes.data ?? false;
      }

      return {
        ...proposal,
        results,
        distributed_results: distResults ?? [],
        has_voted: hasVoted,
      };
    })
  );

  // Categorization
  const activeProposals = enrichedProposals.filter((p) => p.status === "active");
  const curationProposals = enrichedProposals.filter((p) => p.status === "curation");
  const closedProposals = enrichedProposals.filter((p) => p.status === "closed");

  // Count pending delegations for this user
  let pendingDelegations = 0;
  if (user) {
    const { count } = await supabase
      .from("delegations")
      .select("*", { count: "exact", head: true })
      .eq("delegate_id", user.id)
      .eq("status", "pending");
    pendingDelegations = count ?? 0;
  }

  // Global platform statistics
  const platformStatsRes = await supabase.rpc("get_platform_stats");
  const platformStats = platformStatsRes.data?.[0] ?? {
    total_users: 0,
    total_proposals: 0,
    total_votes: 0,
    active_proposals: 0,
    closed_proposals: 0,
  };

  // Recent proposals for the activity feed (last 5)
  const recentProposals = enrichedProposals.slice(0, 5);

  return (
    <AppShell
      userEmail={user?.email}
      userName={profile?.full_name}
      userRole={profile?.role}
      isGuest={isGuest}
      pendingDelegations={pendingDelegations}
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* ── Header ── */}
        <div className="flex items-start sm:items-center justify-between flex-col sm:flex-row gap-4 mb-8">
          <div className="flex-1 min-w-0">
            <h1
              className="text-2xl font-bold flex items-center gap-2"
              style={{ color: "var(--foreground)" }}
            >
              <Globe
                className="w-6 h-6 shrink-0"
                style={{ color: "var(--primary)" }}
                strokeWidth={1.5}
              />
              The Agora
            </h1>
            <p
              className="text-sm mt-1"
              style={{ color: "var(--muted-foreground)" }}
            >
              {isGuest ? (
                <>
                  Welcome to Pangea&apos;s global democracy.{" "}
                  <Link
                    href="/auth"
                    className="hover:underline"
                    style={{ color: "var(--primary)" }}
                  >
                    Sign up
                  </Link>{" "}
                  to participate.
                </>
              ) : (
                <>
                  Welcome,{" "}
                  <span className="font-medium" style={{ color: "var(--foreground)" }}>
                    {profile?.full_name || user.email}
                  </span>
                </>
              )}
            </p>
          </div>
          {!isGuest && (
            <Link
              href="/proposals/new"
              className="btn-primary inline-flex items-center gap-2 text-sm shrink-0"
            >
              <Plus className="w-4 h-4" />
              New Proposal
            </Link>
          )}
        </div>

        {/* ── Bento Grid: Stat Cards ── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <StatCard
            label="Active Citizens"
            value={platformStats.total_users}
            icon={Users}
            trend="+12% this month"
          />
          <StatCard
            label="Open Proposals"
            value={platformStats.active_proposals + (curationProposals?.length ?? 0)}
            icon={FileText}
            trend={`${curationProposals.length} in review`}
          />
          <StatCard
            label="Votes Cast"
            value={platformStats.total_votes}
            icon={Vote}
            trend={`${closedProposals.length} concluded`}
          />
        </div>

        {/* ── Bento Grid: Activity + Quick Links ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-10">
          {/* Recent Activity — spans 2 cols on desktop */}
          <div className="lg:col-span-2">
            <div className="card p-5">
              <h2
                className="text-base font-semibold mb-4 flex items-center gap-2"
                style={{ color: "var(--foreground)" }}
              >
                <Clock className="w-4 h-4" style={{ color: "var(--primary)" }} />
                Recent Activity
              </h2>
              {recentProposals.length > 0 ? (
                <div className="space-y-3">
                  {recentProposals.map((proposal) => {
                    const statusStyles: Record<
                      string,
                      { bg: string; text: string; label: string }
                    > = {
                      active: {
                        bg: "var(--success)",
                        text: "#ffffff",
                        label: "Active",
                      },
                      curation: {
                        bg: "#d97706",
                        text: "#ffffff",
                        label: "Review",
                      },
                      closed: {
                        bg: "var(--muted-foreground)",
                        text: "#ffffff",
                        label: "Closed",
                      },
                    };
                    const st = statusStyles[proposal.status] ?? statusStyles.closed;

                    return (
                      <Link
                        key={proposal.id}
                        href={`/proposals/${proposal.id}`}
                        className="flex items-center gap-3 p-3 rounded-lg transition-colors duration-150"
                        style={{
                          backgroundColor: "transparent",
                        }}
                        onMouseEnter={undefined}
                      >
                        <div className="activity-row flex items-center gap-3 w-full">
                          <span
                            className="text-xs font-medium px-2 py-0.5 rounded-full shrink-0"
                            style={{
                              backgroundColor: st.bg,
                              color: st.text,
                            }}
                          >
                            {st.label}
                          </span>
                          <span
                            className="text-sm font-medium truncate flex-1"
                            style={{ color: "var(--foreground)" }}
                          >
                            {proposal.title}
                          </span>
                          <span
                            className="text-xs shrink-0"
                            style={{ color: "var(--muted-foreground)" }}
                          >
                            {new Date(proposal.created_at).toLocaleDateString(
                              "en-US",
                              { month: "short", day: "numeric" }
                            )}
                          </span>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              ) : (
                <p
                  className="text-sm text-center py-6"
                  style={{ color: "var(--muted-foreground)" }}
                >
                  No recent activity yet.
                </p>
              )}
            </div>
          </div>

          {/* Quick Links — 1 col */}
          <div className="card p-5">
            <h2
              className="text-base font-semibold mb-4 flex items-center gap-2"
              style={{ color: "var(--foreground)" }}
            >
              <Globe className="w-4 h-4" style={{ color: "var(--primary)" }} />
              Quick Links
            </h2>
            <div className="space-y-2">
              <Link
                href="/laws"
                className="flex items-center gap-3 p-3 rounded-lg transition-colors duration-150 hover:opacity-80"
                style={{ backgroundColor: "var(--secondary)" }}
              >
                <BookOpen className="w-4 h-4" style={{ color: "var(--primary)" }} />
                <span className="text-sm font-medium" style={{ color: "var(--foreground)" }}>
                  Pangea Codes
                </span>
              </Link>
              <Link
                href="/parties"
                className="flex items-center gap-3 p-3 rounded-lg transition-colors duration-150 hover:opacity-80"
                style={{ backgroundColor: "var(--secondary)" }}
              >
                <Flag className="w-4 h-4" style={{ color: "var(--primary)" }} />
                <span className="text-sm font-medium" style={{ color: "var(--foreground)" }}>
                  Political Parties
                </span>
              </Link>
              {!isGuest && (
                <Link
                  href="/dashboard/delegations"
                  className="flex items-center gap-3 p-3 rounded-lg transition-colors duration-150 hover:opacity-80"
                  style={{ backgroundColor: "var(--secondary)" }}
                >
                  <Users className="w-4 h-4" style={{ color: "var(--primary)" }} />
                  <span className="text-sm font-medium" style={{ color: "var(--foreground)" }}>
                    Your Delegations
                  </span>
                </Link>
              )}
              {!isGuest && drafts.length > 0 && (
                <a
                  href="#drafts"
                  className="flex items-center gap-3 p-3 rounded-lg transition-colors duration-150 hover:opacity-80"
                  style={{ backgroundColor: "var(--secondary)" }}
                >
                  <FileText className="w-4 h-4" style={{ color: "var(--muted-foreground)" }} />
                  <span className="text-sm font-medium" style={{ color: "var(--foreground)" }}>
                    {drafts.length} {drafts.length === 1 ? "Draft" : "Drafts"}
                  </span>
                </a>
              )}
            </div>
          </div>
        </div>

        {/* ── Proposal Sections ── */}
        <div className="space-y-10">
          {/* 1. Active Votes */}
          <section id="active-votes">
            <h2
              className="text-base font-semibold mb-4 flex items-center gap-2"
              style={{ color: "var(--foreground)" }}
            >
              <Clock className="w-4.5 h-4.5" style={{ color: "var(--primary)" }} />
              Active Votes
              <span
                className="text-xs font-normal"
                style={{ color: "var(--muted-foreground)" }}
              >
                — {activeProposals.length}{" "}
                {activeProposals.length === 1 ? "proposal" : "proposals"} in voting
              </span>
            </h2>
            {activeProposals.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {activeProposals.map((proposal) => (
                  <ProposalCard key={proposal.id} proposal={proposal} />
                ))}
              </div>
            ) : (
              <div className="card p-5 text-center text-sm" style={{ color: "var(--muted-foreground)" }}>
                No proposals currently in voting.
              </div>
            )}
          </section>

          {/* 2. Community Review */}
          <section id="community-review">
            <h2
              className="text-base font-semibold mb-4 flex items-center gap-2"
              style={{ color: "var(--foreground)" }}
            >
              <Flame className="w-4.5 h-4.5" style={{ color: "#d97706" }} />
              Community Review
              <span
                className="text-xs font-normal"
                style={{ color: "var(--muted-foreground)" }}
              >
                — {curationProposals.length} under review
              </span>
            </h2>
            {curationProposals.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {curationProposals.map((proposal) => (
                  <ProposalCard key={proposal.id} proposal={proposal} />
                ))}
              </div>
            ) : (
              <div className="card p-5 text-center text-sm" style={{ color: "var(--muted-foreground)" }}>
                No proposals under community review right now.
              </div>
            )}
          </section>

          {/* 3. Archive */}
          <section id="archive">
            <h2
              className="text-base font-semibold mb-4 flex items-center gap-2"
              style={{ color: "var(--foreground)" }}
            >
              <CheckCircle2 className="w-4.5 h-4.5" style={{ color: "var(--success)" }} />
              Archive
              <span
                className="text-xs font-normal"
                style={{ color: "var(--muted-foreground)" }}
              >
                — {closedProposals.length} concluded{" "}
                {closedProposals.length === 1 ? "vote" : "votes"}
              </span>
            </h2>
            {closedProposals.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {closedProposals.map((proposal) => (
                  <ProposalCard key={proposal.id} proposal={proposal} />
                ))}
              </div>
            ) : (
              <div className="card p-5 text-center text-sm" style={{ color: "var(--muted-foreground)" }}>
                No concluded votes yet.
              </div>
            )}
          </section>

          {/* 4. Drafts (authenticated users only) */}
          {!isGuest && drafts && drafts.length > 0 && (
            <section id="drafts">
              <h2
                className="text-base font-semibold mb-4 flex items-center gap-2"
                style={{ color: "var(--foreground)" }}
              >
                <FileText className="w-4.5 h-4.5" style={{ color: "var(--muted-foreground)" }} />
                Your Drafts
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {drafts.map((proposal: Proposal) => (
                  <ProposalCard key={proposal.id} proposal={proposal} />
                ))}
              </div>
            </section>
          )}

          {/* Empty state */}
          {enrichedProposals.length === 0 && drafts.length === 0 && (
            <div
              className="text-center py-16 card"
            >
              <Globe
                className="w-14 h-14 mx-auto mb-4"
                style={{ color: "var(--muted-foreground)" }}
                strokeWidth={1}
              />
              <h3
                className="text-lg font-semibold mb-2"
                style={{ color: "var(--foreground)" }}
              >
                The Agora is quiet for now
              </h3>
              <p
                className="mb-6 max-w-md mx-auto text-sm"
                style={{ color: "var(--muted-foreground)" }}
              >
                {isGuest
                  ? "Sign up to be the first citizen to propose a law."
                  : "Be the first to propose a law for the Global Democratic Commonwealth of Pangea."}
              </p>
              {!isGuest && (
                <Link
                  href="/proposals/new"
                  className="btn-primary inline-flex items-center gap-2 text-sm"
                >
                  <Plus className="w-4 h-4" />
                  Submit the first proposal
                </Link>
              )}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}

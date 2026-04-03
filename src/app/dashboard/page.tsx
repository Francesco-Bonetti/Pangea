import { createClient } from "@/lib/supabase/server";
import Navbar from "@/components/Navbar";
import GuestBanner from "@/components/GuestBanner";
import ProposalCard from "@/components/ProposalCard";
import type { Proposal, ProposalResults, ProposalWithResults } from "@/lib/types";
import { Plus, Globe, FileText, Clock, CheckCircle2, Flame, Users, BookOpen, Vote, TrendingUp, Flag } from "lucide-react";
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
      const resultsRes = await supabase.rpc("get_proposal_results", { p_proposal_id: proposal.id });

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
        const votedRes = await supabase.rpc("has_user_voted", { p_proposal_id: proposal.id });
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

  return (
    <div className="min-h-screen bg-[#0c1220]">
      <Navbar
        userEmail={user?.email}
        userName={profile?.full_name}
        userRole={profile?.role}
        isGuest={isGuest}
        pendingDelegations={pendingDelegations}
      />
      {isGuest && <GuestBanner />}

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header + Compact stats */}
        <div className="mb-8">
          <div className="flex items-start sm:items-center justify-between flex-col sm:flex-row gap-4 mb-4">
            <div>
              <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                <Globe className="w-6 h-6 text-pangea-400" strokeWidth={1.5} />
                The Agora
              </h1>
              <p className="text-slate-400 text-sm mt-1">
                {isGuest ? (
                  <>Welcome to Pangea&apos;s global democracy. <Link href="/auth" className="text-pangea-400 hover:underline">Sign up</Link> to participate.</>
                ) : (
                  <>
                    Welcome,{" "}
                    <span className="text-slate-200 font-medium">
                      {profile?.full_name || user.email}
                    </span>
                  </>
                )}
              </p>
            </div>
            {!isGuest && (
              <Link href="/proposals/new" className="btn-primary inline-flex items-center gap-2 text-sm shrink-0">
                <Plus className="w-4 h-4" />
                New Proposal
              </Link>
            )}
          </div>

          {/* Compact stats bar */}
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-slate-400 px-1">
            <span className="flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-blue-400" />
              <span className="text-white font-medium">{platformStats.total_users}</span> citizens
            </span>
            <span className="text-slate-700">|</span>
            <span className="flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-slate-500" />
              <span className="text-white font-medium">{platformStats.total_proposals}</span> proposals
            </span>
            <span className="text-slate-700">|</span>
            <span className="flex items-center gap-1.5">
              <Vote className="w-3.5 h-3.5 text-pangea-400" />
              <span className="text-white font-medium">{platformStats.total_votes}</span> votes cast
            </span>
          </div>
        </div>

        {/* Quick links */}
        <div className="flex flex-wrap gap-2 mb-8">
          <Link href="/laws" className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-blue-900/20 text-blue-400 border border-blue-800/30 hover:border-blue-700/50 transition-colors">
            <BookOpen className="w-3.5 h-3.5" />
            Pangea Codes
          </Link>
          <Link href="/parties" className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-amber-900/20 text-amber-400 border border-amber-800/30 hover:border-amber-700/50 transition-colors">
            <Flag className="w-3.5 h-3.5" />
            Political Parties
          </Link>
          {!isGuest && (
            <Link href="/dashboard/delegations" className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-purple-900/20 text-purple-400 border border-purple-800/30 hover:border-purple-700/50 transition-colors">
              <Users className="w-3.5 h-3.5" />
              Your Delegations
            </Link>
          )}
          {!isGuest && drafts.length > 0 && (
            <a href="#drafts" className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800/50 text-slate-400 border border-slate-700/30 hover:border-slate-600/50 transition-colors">
              <FileText className="w-3.5 h-3.5" />
              {drafts.length} {drafts.length === 1 ? "draft" : "drafts"}
            </a>
          )}
        </div>

        {/* ── Sections by type ── */}
        <div className="space-y-10">

          {/* 1. Active Votes */}
          <section id="active-votes">
            <h2 className="text-base font-semibold text-slate-200 mb-4 flex items-center gap-2">
              <Clock className="w-4.5 h-4.5 text-pangea-400" />
              Active Votes
              <span className="text-xs text-slate-500 font-normal">
                — {activeProposals.length} {activeProposals.length === 1 ? "proposal" : "proposals"} in voting
              </span>
            </h2>
            {activeProposals.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {activeProposals.map((proposal) => (
                  <ProposalCard key={proposal.id} proposal={proposal} />
                ))}
              </div>
            ) : (
              <div className="card p-5 text-center text-slate-500 text-sm">
                No proposals currently in voting.
              </div>
            )}
          </section>

          {/* 2. Community Review */}
          <section id="community-review">
            <h2 className="text-base font-semibold text-slate-200 mb-4 flex items-center gap-2">
              <Flame className="w-4.5 h-4.5 text-amber-400" />
              Community Review
              <span className="text-xs text-slate-500 font-normal">
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
              <div className="card p-5 text-center text-slate-500 text-sm">
                No proposals under community review right now.
              </div>
            )}
          </section>

          {/* 3. Archive */}
          <section id="archive">
            <h2 className="text-base font-semibold text-slate-200 mb-4 flex items-center gap-2">
              <CheckCircle2 className="w-4.5 h-4.5 text-green-400" />
              Archive
              <span className="text-xs text-slate-500 font-normal">
                — {closedProposals.length} concluded {closedProposals.length === 1 ? "vote" : "votes"}
              </span>
            </h2>
            {closedProposals.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {closedProposals.map((proposal) => (
                  <ProposalCard key={proposal.id} proposal={proposal} />
                ))}
              </div>
            ) : (
              <div className="card p-5 text-center text-slate-500 text-sm">
                No concluded votes yet.
              </div>
            )}
          </section>

          {/* 4. Drafts (authenticated users only) */}
          {!isGuest && drafts && drafts.length > 0 && (
            <section id="drafts">
              <h2 className="text-base font-semibold text-slate-200 mb-4 flex items-center gap-2">
                <FileText className="w-4.5 h-4.5 text-slate-400" />
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
            <div className="text-center py-16 card">
              <Globe className="w-14 h-14 text-slate-600 mx-auto mb-4" strokeWidth={1} />
              <h3 className="text-lg font-semibold text-slate-300 mb-2">
                The Agora is quiet for now
              </h3>
              <p className="text-slate-400 mb-6 max-w-md mx-auto text-sm">
                {isGuest
                  ? "Sign up to be the first citizen to propose a law."
                  : "Be the first to propose a law for the Global Democratic Commonwealth of Pangea."
                }
              </p>
              {!isGuest && (
                <Link href="/proposals/new" className="btn-primary inline-flex items-center gap-2 text-sm">
                  <Plus className="w-4 h-4" />
                  Submit the first proposal
                </Link>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

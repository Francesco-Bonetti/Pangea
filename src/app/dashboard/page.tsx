import { createClient } from "@/lib/supabase/server";
import AppShell from "@/components/AppShell";
import DashboardClient from "@/components/DashboardClient";
import type { Proposal, ProposalResults, ProposalWithResults } from "@/lib/types";

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

  // Fetch public proposals (active, closed, curation) — paginated
  const { data: proposals, error } = await supabase
    .from("proposals")
    .select("*")
    .in("status", ["active", "closed", "curation"])
    .order("created_at", { ascending: false })
    .limit(100);

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
      .order("created_at", { ascending: false })
      .limit(50);
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

  // Dynamic curation threshold (proportional to active citizens)
  const { data: curationThreshold } = await supabase.rpc("get_curation_threshold");

  return (
    <AppShell
      userEmail={user?.email}
      userName={profile?.full_name}
      userRole={profile?.role}
      isGuest={isGuest}
      pendingDelegations={pendingDelegations}
    >
      <DashboardClient
        isGuest={isGuest}
        userEmail={user?.email}
        fullName={profile?.full_name}
        enrichedProposals={enrichedProposals}
        drafts={drafts}
        platformStats={platformStats}
        curationThreshold={curationThreshold ?? 2}
      />
    </AppShell>
  );
}

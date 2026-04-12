import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import AppShell from "@/components/AppShell";
import ProposalsListClient from "@/components/ProposalsListClient";
import type { Proposal, ProposalWithResults, ProposalResults } from "@/lib/types";

interface Props {
  searchParams: Promise<{ status?: string; group?: string }>;
}

export default async function ProposalsPage({ searchParams }: Props) {
  const params = await searchParams;
  const statusFilter = params.status || "all";
  const groupFilter = params.group || null;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isGuest = !user;

  // Build query based on status filter
  let query = supabase
    .from("proposals")
    .select("*, groups(name, logo_emoji)")
    .order("created_at", { ascending: false })
    .limit(200);

  // T09: filter by group
  if (groupFilter) {
    query = query.eq("group_id", groupFilter);
  }

  if (statusFilter === "draft") {
    if (!user) redirect("/auth");
    query = query.eq("status", "draft").eq("author_id", user.id);
  } else if (statusFilter !== "all") {
    query = query.eq("status", statusFilter);
  } else {
    query = query.in("status", ["active", "closed", "curation"]);
  }

  const { data: proposals } = await query;

  // Enrich proposals
  const enrichedProposals: ProposalWithResults[] = await Promise.all(
    (proposals || []).map(async (proposal: Proposal) => {
      if (proposal.status === "curation") {
        const { count } = await supabase
          .from("proposal_signals")
          .select("*", { count: "exact", head: true })
          .eq("proposal_id", proposal.id);
        return { ...proposal, signal_count: count ?? 0 };
      }

      const resultsRes = await supabase.rpc("get_proposal_results", {
        p_proposal_id: proposal.id,
      });
      let results: ProposalResults = resultsRes.data?.[0] ?? {
        yea_count: 0,
        nay_count: 0,
        abstain_count: 0,
      };

      // V3: Blind voting — server-side defense: strip breakdown for active proposals
      // The RPC already returns zeros, but this is defense-in-depth
      if (proposal.status === "active") {
        const total = Number(results.yea_count) + Number(results.nay_count) + Number(results.abstain_count);
        results = { yea_count: 0, nay_count: 0, abstain_count: 0 };
        // Fetch turnout separately for the card footer
        const { data: turnout } = await supabase.rpc("get_proposal_turnout", {
          p_proposal_id: proposal.id,
        });
        const totalVotes = turnout?.total_votes ?? total;
        let hasVoted = false;
        if (user) {
          const votedRes = await supabase.rpc("has_user_voted", {
            p_proposal_id: proposal.id,
          });
          hasVoted = votedRes.data ?? false;
        }
        return { ...proposal, results, has_voted: hasVoted, total_votes: totalVotes };
      }

      let hasVoted = false;
      if (user) {
        const votedRes = await supabase.rpc("has_user_voted", {
          p_proposal_id: proposal.id,
        });
        hasVoted = votedRes.data ?? false;
      }

      return { ...proposal, results, has_voted: hasVoted };
    })
  );

  const { data: curationThreshold } = await supabase.rpc("get_curation_threshold");

  // T09: Resolve group info for filter banner
  let groupInfo: { id: string; name: string; emoji: string } | null = null;
  if (groupFilter) {
    const { data: g } = await supabase.from("groups").select("id, name, logo_emoji").eq("id", groupFilter).single();
    if (g) groupInfo = { id: g.id, name: g.name, emoji: g.logo_emoji };
  }

  // Get profile for AppShell
  let profile = null;
  if (user) {
    const { data } = await supabase
      .from("profiles")
      .select("full_name, role")
      .eq("id", user.id)
      .single();
    profile = data;
  }

  return (
    <AppShell section="core" sectionName="proposals" userEmail={user?.email} userName={profile?.full_name} userRole={profile?.role} isGuest={isGuest}>
      <Suspense fallback={<div className="flex items-center justify-center py-16"><div className="h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-white/80" /></div>}>
        <ProposalsListClient
          proposals={enrichedProposals}
          currentFilter={statusFilter}
          curationThreshold={curationThreshold ?? 2}
          isGuest={isGuest}
          groupFilter={groupInfo}
        />
      </Suspense>
    </AppShell>
  );
}

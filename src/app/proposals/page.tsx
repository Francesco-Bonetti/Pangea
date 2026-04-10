import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import AppShell from "@/components/AppShell";
import ProposalsListClient from "@/components/ProposalsListClient";
import type { Proposal, ProposalWithResults, ProposalResults } from "@/lib/types";

interface Props {
  searchParams: Promise<{ status?: string }>;
}

export default async function ProposalsPage({ searchParams }: Props) {
  const params = await searchParams;
  const statusFilter = params.status || "all";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isGuest = !user;

  // Build query based on status filter
  let query = supabase
    .from("proposals")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200);

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
      const results: ProposalResults = resultsRes.data?.[0] ?? {
        yea_count: 0,
        nay_count: 0,
        abstain_count: 0,
      };

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
        />
      </Suspense>
    </AppShell>
  );
}

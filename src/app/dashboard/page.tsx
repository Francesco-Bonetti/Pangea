import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Navbar from "@/components/Navbar";
import ProposalCard from "@/components/ProposalCard";
import PlatformStats from "@/components/PlatformStats";
import type { Proposal, ProposalResults, ProposalWithResults } from "@/lib/types";
import { Plus, Globe, FileText, Clock, CheckCircle2 } from "lucide-react";
import Link from "next/link";

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth");

  // Recupera profilo
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  // Recupera proposte attive e chiuse (pubbliche per tutti)
  const { data: proposals, error } = await supabase
    .from("proposals")
    .select("*")
    .in("status", ["active", "closed"])
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Errore caricamento proposte:", error);
  }

  // Recupera bozze dell'utente corrente
  const { data: drafts } = await supabase
    .from("proposals")
    .select("*")
    .eq("author_id", user.id)
    .eq("status", "draft")
    .order("created_at", { ascending: false });

  // Arricchisci proposte con risultati RPC e stato di voto
  const enrichedProposals: ProposalWithResults[] = await Promise.all(
    (proposals || []).map(async (proposal: Proposal) => {
      const [resultsRes, votedRes] = await Promise.all([
        supabase.rpc("get_proposal_results", { p_proposal_id: proposal.id }),
        supabase.rpc("has_user_voted", { p_proposal_id: proposal.id }),
      ]);

      const results: ProposalResults = resultsRes.data?.[0] ?? {
        yea_count: 0,
        nay_count: 0,
        abstain_count: 0,
      };

      return {
        ...proposal,
        results,
        has_voted: votedRes.data ?? false,
      };
    })
  );

  // Stats
  const activeCount = enrichedProposals.filter((p) => p.status === "active").length;
  const closedCount = enrichedProposals.filter((p) => p.status === "closed").length;
  const draftCount = drafts?.length ?? 0;

  // Statistiche globali piattaforma
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
        userEmail={user.email}
        userName={profile?.full_name}
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-10">
          <div className="flex items-center gap-3 mb-2">
            <Globe className="w-8 h-8 text-pangea-400" strokeWidth={1.5} />
            <h1 className="text-3xl font-bold text-white">
              Piazza Telematica
            </h1>
          </div>
          <p className="text-slate-400">
            Benvenuto/a,{" "}
            <span className="text-slate-200 font-medium">
              {profile?.full_name || user.email}
            </span>
            . Partecipa alla democrazia globale Pangea.
          </p>
        </div>

        {/* Statistiche Globali */}
        <PlatformStats
          totalUsers={platformStats.total_users}
          totalProposals={platformStats.total_proposals}
          totalVotes={platformStats.total_votes}
          activeProposals={platformStats.active_proposals}
          closedProposals={platformStats.closed_proposals}
        />

        {/* Stats cards personali */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
          {[
            { label: "In Delibera", value: activeCount, icon: Clock, color: "text-pangea-400", bg: "bg-pangea-900/20" },
            { label: "Deliberate", value: closedCount, icon: CheckCircle2, color: "text-green-400", bg: "bg-green-900/20" },
            { label: "Tue Bozze", value: draftCount, icon: FileText, color: "text-slate-400", bg: "bg-slate-800/50" },
            {
              label: "Totale Proposte",
              value: enrichedProposals.length + draftCount,
              icon: Globe,
              color: "text-amber-400",
              bg: "bg-amber-900/20",
            },
          ].map(({ label, value, icon: Icon, color, bg }) => (
            <div key={label} className={`card p-4 ${bg}`}>
              <div className={`${color} mb-2`}>
                <Icon className="w-5 h-5" />
              </div>
              <p className="text-2xl font-bold text-white">{value}</p>
              <p className="text-xs text-slate-500 mt-0.5">{label}</p>
            </div>
          ))}
        </div>

        {/* Proposals grid */}
        <div className="space-y-8">
          {/* Proposte attive */}
          {enrichedProposals.filter((p) => p.status === "active").length > 0 && (
            <section>
              <h2 className="text-lg font-semibold text-slate-200 mb-4 flex items-center gap-2">
                <Clock className="w-5 h-5 text-pangea-400" />
                Delibere Aperte
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {enrichedProposals
                  .filter((p) => p.status === "active")
                  .map((proposal) => (
                    <ProposalCard key={proposal.id} proposal={proposal} />
                  ))}
              </div>
            </section>
          )}

          {/* Proposte chiuse */}
          {enrichedProposals.filter((p) => p.status === "closed").length > 0 && (
            <section>
              <h2 className="text-lg font-semibold text-slate-200 mb-4 flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-400" />
                Archivio Deliberativo
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {enrichedProposals
                  .filter((p) => p.status === "closed")
                  .map((proposal) => (
                    <ProposalCard key={proposal.id} proposal={proposal} />
                  ))}
              </div>
            </section>
          )}

          {/* Bozze */}
          {drafts && drafts.length > 0 && (
            <section>
              <h2 className="text-lg font-semibold text-slate-200 mb-4 flex items-center gap-2">
                <FileText className="w-5 h-5 text-slate-400" />
                Le tue Bozze
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {drafts.map((proposal: Proposal) => (
                  <ProposalCard key={proposal.id} proposal={proposal} />
                ))}
              </div>
            </section>
          )}

          {/* Empty state */}
          {enrichedProposals.length === 0 && draftCount === 0 && (
            <div className="text-center py-20 card">
              <Globe className="w-16 h-16 text-slate-600 mx-auto mb-4" strokeWidth={1} />
              <h3 className="text-xl font-semibold text-slate-300 mb-2">
                L&apos;Agora è ancora silenziosa
              </h3>
              <p className="text-slate-500 mb-6 max-w-md mx-auto">
                Sii il primo cittadino a proporre una legge per la Repubblica
                Democratica Globale Pangea.
              </p>
              <Link href="/proposals/new" className="btn-primary inline-flex items-center gap-2">
                <Plus className="w-4 h-4" />
                Presenta la prima proposta
              </Link>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

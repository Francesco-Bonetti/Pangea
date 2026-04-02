import { createClient } from "@/lib/supabase/server";
import Navbar from "@/components/Navbar";
import GuestBanner from "@/components/GuestBanner";
import ProposalCard from "@/components/ProposalCard";
import type { Proposal, ProposalResults, ProposalWithResults } from "@/lib/types";
import { Plus, Globe, FileText, Users, BookOpen, Vote } from "lucide-react";
import Link from "next/link";

// Client component for collapsible sections
import SectionBlock from "@/components/SectionBlock";

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isGuest = !user;

  // Recupera profilo (solo se autenticato)
  let profile = null;
  if (user) {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();
    profile = data;
  }

  // Recupera proposte pubbliche (active, closed, curation)
  const { data: proposals, error } = await supabase
    .from("proposals")
    .select("*")
    .in("status", ["active", "closed", "curation"])
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Errore caricamento proposte:", error);
  }

  // Recupera bozze dell'utente corrente (solo se autenticato)
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

  // Arricchisci proposte con risultati e segnali
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

      // Per proposte active/closed: risultati di voto
      const resultsRes = await supabase.rpc("get_proposal_results", { p_proposal_id: proposal.id });

      const results: ProposalResults = resultsRes.data?.[0] ?? {
        yea_count: 0,
        nay_count: 0,
        abstain_count: 0,
      };

      // Risultati distribuiti
      const { data: distResults } = await supabase.rpc(
        "get_distributed_proposal_results",
        { p_proposal_id: proposal.id }
      );

      // Controlla se l'utente ha votato (solo se autenticato)
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

  // Categorizzazione
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

  // Statistiche globali piattaforma
  const platformStatsRes = await supabase.rpc("get_platform_stats");
  const platformStats = platformStatsRes.data?.[0] ?? {
    total_users: 0,
    total_proposals: 0,
    total_votes: 0,
    active_proposals: 0,
    closed_proposals: 0,
  };

  // Costruisci i blocchi con dati serializzabili
  const sections: Array<{
    id: string;
    title: string;
    subtitle: string;
    icon: "clock" | "trending" | "check" | "file";
    color: "pangea" | "amber" | "green" | "slate";
    proposals: ProposalWithResults[];
    defaultOpen: boolean;
    emptyText: string;
  }> = [
    {
      id: "votazione",
      title: "In Votazione",
      subtitle: `${activeProposals.length} ${activeProposals.length === 1 ? "proposta aperta" : "proposte aperte"}`,
      icon: "clock",
      color: "pangea",
      proposals: activeProposals,
      defaultOpen: true,
      emptyText: "Nessuna proposta in votazione al momento.",
    },
    {
      id: "promozione",
      title: "In Attesa di Promozione",
      subtitle: `${curationProposals.length} in raccolta supporto`,
      icon: "trending",
      color: "amber",
      proposals: curationProposals,
      defaultOpen: curationProposals.length > 0,
      emptyText: "Nessuna proposta in attesa di promozione.",
    },
    {
      id: "approvate",
      title: "Approvate di Recente",
      subtitle: `${closedProposals.length} ${closedProposals.length === 1 ? "delibera conclusa" : "delibere concluse"}`,
      icon: "check",
      color: "green",
      proposals: closedProposals,
      defaultOpen: false,
      emptyText: "Nessuna proposta conclusa ancora.",
    },
  ];

  // Aggiungi bozze solo se autenticato e ne ha
  if (!isGuest && drafts.length > 0) {
    sections.push({
      id: "bozze",
      title: "Le tue Bozze",
      subtitle: `${drafts.length} ${drafts.length === 1 ? "bozza" : "bozze"} da completare`,
      icon: "file",
      color: "slate",
      proposals: drafts as ProposalWithResults[],
      defaultOpen: false,
      emptyText: "",
    });
  }

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

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-start sm:items-center justify-between flex-col sm:flex-row gap-4 mb-4">
            <div>
              <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                <Globe className="w-6 h-6 text-pangea-400" strokeWidth={1.5} />
                Piazza Telematica
              </h1>
              <p className="text-slate-400 text-sm mt-1">
                {isGuest ? (
                  <>Benvenuto/a nella democrazia globale Pangea. <Link href="/auth" className="text-pangea-400 hover:underline">Registrati</Link> per partecipare.</>
                ) : (
                  <>
                    Benvenuto/a,{" "}
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
                Nuova Proposta
              </Link>
            )}
          </div>

          {/* Barra statistiche compatta */}
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-slate-400 px-1">
            <span className="flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-blue-400" />
              <span className="text-white font-medium">{platformStats.total_users}</span> cittadini
            </span>
            <span className="text-slate-700">|</span>
            <span className="flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-slate-500" />
              <span className="text-white font-medium">{platformStats.total_proposals}</span> proposte
            </span>
            <span className="text-slate-700">|</span>
            <span className="flex items-center gap-1.5">
              <Vote className="w-3.5 h-3.5 text-pangea-400" />
              <span className="text-white font-medium">{platformStats.total_votes}</span> voti espressi
            </span>
          </div>
        </div>

        {/* Link rapidi */}
        <div className="flex flex-wrap gap-2 mb-8">
          <Link href="/laws" className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-blue-900/20 text-blue-400 border border-blue-800/30 hover:border-blue-700/50 transition-colors">
            <BookOpen className="w-3.5 h-3.5" />
            Codice di Pangea
          </Link>
          {!isGuest && (
            <Link href="/dashboard/delegations" className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-purple-900/20 text-purple-400 border border-purple-800/30 hover:border-purple-700/50 transition-colors">
              <Users className="w-3.5 h-3.5" />
              Le tue Deleghe
            </Link>
          )}
        </div>

        {/* Blocchi collassabili per categoria */}
        <div className="space-y-4">
          {sections.map((section) => (
            <SectionBlock
              key={section.id}
              id={section.id}
              title={section.title}
              subtitle={section.subtitle}
              icon={section.icon}
              color={section.color}
              proposals={section.proposals}
              defaultOpen={section.defaultOpen}
              emptyText={section.emptyText}
            />
          ))}
        </div>

        {/* Empty state globale */}
        {enrichedProposals.length === 0 && drafts.length === 0 && (
          <div className="text-center py-16 card mt-6">
            <Globe className="w-14 h-14 text-slate-600 mx-auto mb-4" strokeWidth={1} />
            <h3 className="text-lg font-semibold text-slate-300 mb-2">
              L&apos;Agora è ancora silenziosa
            </h3>
            <p className="text-slate-500 mb-6 max-w-md mx-auto text-sm">
              {isGuest
                ? "Registrati per essere il primo cittadino a proporre una legge."
                : "Sii il primo a proporre una legge per la Repubblica Democratica Globale Pangea."
              }
            </p>
            {!isGuest && (
              <Link href="/proposals/new" className="btn-primary inline-flex items-center gap-2 text-sm">
                <Plus className="w-4 h-4" />
                Presenta la prima proposta
              </Link>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

import { createClient } from "@/lib/supabase/server";
import Navbar from "@/components/Navbar";
import GuestBanner from "@/components/GuestBanner";
import ProposalCard from "@/components/ProposalCard";
import PlatformStats from "@/components/PlatformStats";
import type { Proposal, ProposalResults, ProposalWithResults } from "@/lib/types";
import { Plus, Globe, FileText, Clock, CheckCircle2, Flame, Users, BookOpen } from "lucide-react";
import Link from "next/link";

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isGuest = !user;

  // Recupera profilo (solo se autenticato)
  let profile: { full_name?: string; role?: string } | null = null;
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
    .in("status", ["active", "closed", "curation", "repealed"])
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

  // Soglia dinamica curatela
  const { data: thresholdData } = await supabase.rpc("get_curation_threshold");
  const curationThreshold = thresholdData ?? 3;

  // Stats
  const activeProposals = enrichedProposals.filter((p) => p.status === "active");
  const curationProposals = enrichedProposals.filter((p) => p.status === "curation");
  const closedProposals = enrichedProposals.filter((p) => p.status === "closed");
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
        userEmail={user?.email}
        userName={profile?.full_name}
        userRole={profile?.role}
        isGuest={isGuest}
      />
      {isGuest && <GuestBanner />}

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
            {isGuest ? (
              <>Benvenuto/a nella democrazia globale Pangea. <Link href="/auth" className="text-pangea-400 hover:underline">Registrati</Link> per partecipare.</>
            ) : (
              <>
                Benvenuto/a,{" "}
                <span className="text-slate-200 font-medium">
                  {profile?.full_name || user.email}
                </span>
                . Partecipa alla democrazia globale Pangea.
              </>
            )}
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

        {/* Navigazione rapida per sezioni */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-10">
          {[
            { label: "In Delibera", value: activeProposals.length, icon: Clock, color: "text-pangea-400", bg: "bg-pangea-900/20", href: "#delibera" },
            { label: "In Curatela", value: curationProposals.length, icon: Flame, color: "text-amber-400", bg: "bg-amber-900/20", href: "#curatela" },
            { label: "Deliberate", value: closedProposals.length, icon: CheckCircle2, color: "text-green-400", bg: "bg-green-900/20", href: "#archivio" },
            { label: "Codice di Pangea", value: "→", icon: BookOpen, color: "text-blue-400", bg: "bg-blue-900/20", href: "/laws" },
            ...(isGuest ? [] : [
              { label: "Tue Bozze", value: draftCount, icon: FileText, color: "text-slate-400", bg: "bg-slate-800/50" },
            ]),
            ...(isGuest ? [] : [
              { label: "Le tue Deleghe", value: "→", icon: Users, color: "text-purple-400", bg: "bg-purple-900/20", href: "/dashboard/delegations" },
            ]),
          ].map(({ label, value, icon: Icon, color, bg, href }) => {
            const isExternal = href?.startsWith("/");
            const Card = (
              <div key={label} className={`card p-4 ${bg} ${href ? "hover:border-slate-600 transition-colors cursor-pointer" : ""}`}>
                <div className={`${color} mb-2`}>
                  <Icon className="w-5 h-5" />
                </div>
                <p className="text-2xl font-bold text-white">{value}</p>
                <p className="text-xs text-slate-500 mt-0.5">{label}</p>
              </div>
            );
            if (isExternal) {
              return <Link key={label} href={href!}>{Card}</Link>;
            }
            if (href) {
              return <a key={label} href={href}>{Card}</a>;
            }
            return <div key={label}>{Card}</div>;
          })}
        </div>

        {/* Sezioni per tipologia */}
        <div className="space-y-10">
          {/* Fase Deliberativa (Attive) */}
          <section id="delibera">
            <h2 className="text-lg font-semibold text-slate-200 mb-4 flex items-center gap-2">
              <Clock className="w-5 h-5 text-pangea-400" />
              Fase Deliberativa
              <span className="text-xs text-slate-500 font-normal ml-1">
                Proposte in votazione attiva
              </span>
            </h2>
            {activeProposals.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {activeProposals.map((proposal) => (
                  <ProposalCard key={proposal.id} proposal={proposal} />
                ))}
              </div>
            ) : (
              <div className="card p-6 text-center text-slate-500 text-sm">
                Nessuna proposta in delibera al momento.
              </div>
            )}
          </section>

          {/* Fase di Curatela */}
          <section id="curatela">
            <h2 className="text-lg font-semibold text-slate-200 mb-4 flex items-center gap-2">
              <Flame className="w-5 h-5 text-amber-400" />
              Mercato di Curatela
              <span className="text-xs text-slate-500 font-normal ml-1">
                Proposte in fase di valutazione — supportale con un segnale
              </span>
            </h2>
            {curationProposals.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {curationProposals.map((proposal) => (
                  <ProposalCard key={proposal.id} proposal={proposal} curationThreshold={curationThreshold} />
                ))}
              </div>
            ) : (
              <div className="card p-6 text-center text-slate-500 text-sm">
                Nessuna proposta in curatela al momento.
              </div>
            )}
          </section>

          {/* Archivio Deliberativo */}
          <section id="archivio">
            <h2 className="text-lg font-semibold text-slate-200 mb-4 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-green-400" />
              Archivio Deliberativo
            </h2>
            {closedProposals.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {closedProposals.map((proposal) => (
                  <ProposalCard key={proposal.id} proposal={proposal} />
                ))}
              </div>
            ) : (
              <div className="card p-6 text-center text-slate-500 text-sm">
                Nessuna legge deliberata ancora.
              </div>
            )}
          </section>

          {/* Bozze (solo utenti autenticati) */}
          {!isGuest && drafts && drafts.length > 0 && (
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
                {isGuest
                  ? "Registrati per essere il primo cittadino a proporre una legge."
                  : "Sii il primo cittadino a proporre una legge per la Repubblica Democratica Globale Pangea."
                }
              </p>
              {!isGuest && (
                <Link href="/proposals/new" className="btn-primary inline-flex items-center gap-2">
                  <Plus className="w-4 h-4" />
                  Presenta la prima proposta
                </Link>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

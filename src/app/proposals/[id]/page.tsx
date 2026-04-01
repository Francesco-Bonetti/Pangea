import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import Navbar from "@/components/Navbar";
import VotingBooth from "@/components/VotingBooth";
import SignalButton from "@/components/SignalButton";
import type { DistributedResult, ProposalOption } from "@/lib/types";
import { ArrowLeft, Calendar, Clock, User, FileText, Tag, Flame } from "lucide-react";
import Link from "next/link";
import { formatDateTime } from "@/lib/utils";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function ProposalDetailPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth");

  // Recupera proposta con categoria
  const { data: proposal, error } = await supabase
    .from("proposals")
    .select("*, categories(id, name)")
    .eq("id", id)
    .single();

  if (error || !proposal) notFound();

  // Recupera profilo autore
  const { data: authorProfile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", proposal.author_id)
    .single();

  // Recupera opzioni deliberative
  const { data: optionsData } = await supabase
    .from("proposal_options")
    .select("*")
    .eq("proposal_id", id)
    .order("created_at");

  const proposalOptions: ProposalOption[] = optionsData ?? [];

  // Risultati distribuiti
  let distributedResults: DistributedResult[] = [];
  if (proposal.status === "active" || proposal.status === "closed") {
    const { data: distResults } = await supabase.rpc(
      "get_distributed_proposal_results",
      { p_proposal_id: id }
    );
    distributedResults = distResults ?? [];
  }

  // Controlla se l'utente ha già votato
  const { data: hasVoted } = await supabase.rpc("has_user_voted", {
    p_proposal_id: id,
  });

  // Segnali (per proposte in curatela)
  let signalCount = 0;
  let hasSignaled = false;
  if (proposal.status === "curation") {
    const { count } = await supabase
      .from("proposal_signals")
      .select("*", { count: "exact", head: true })
      .eq("proposal_id", id);
    signalCount = count ?? 0;

    const { data: userSignal } = await supabase
      .from("proposal_signals")
      .select("id")
      .eq("proposal_id", id)
      .eq("supporter_id", user.id)
      .maybeSingle();
    hasSignaled = !!userSignal;
  }

  // Controlla deleghe attive per la categoria della proposta
  let hasActiveDelegation = false;
  if (proposal.category_id) {
    const { data: delegation } = await supabase
      .from("delegations")
      .select("id")
      .eq("delegator_id", user.id)
      .or(`category_id.eq.${proposal.category_id},category_id.is.null`)
      .limit(1)
      .maybeSingle();
    hasActiveDelegation = !!delegation;
  }

  const isAuthor = proposal.author_id === user.id;
  const categoryName = (proposal as Record<string, unknown>).categories
    ? ((proposal as Record<string, unknown>).categories as { name: string })?.name
    : null;

  return (
    <div className="min-h-screen bg-[#0c1220]">
      <Navbar userEmail={user.email} />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumb */}
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-slate-200 mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Torna alla Piazza
        </Link>

        {/* Proposal Header */}
        <div className="card p-6 sm:p-8 mb-6">
          {/* Status badge */}
          <div className="flex items-center gap-3 mb-4 flex-wrap">
            <span
              className={
                proposal.status === "active"
                  ? "status-active"
                  : proposal.status === "curation"
                  ? "status-curation"
                  : proposal.status === "closed"
                  ? "status-closed"
                  : "status-draft"
              }
            >
              {proposal.status === "active"
                ? "In Delibera"
                : proposal.status === "curation"
                ? "In Curatela"
                : proposal.status === "closed"
                ? "Deliberata"
                : "Bozza"}
            </span>
            {isAuthor && (
              <span className="text-xs text-amber-400 font-medium bg-amber-900/20 px-2 py-1 rounded-full border border-amber-800/30">
                Tua proposta
              </span>
            )}
            {categoryName && (
              <span className="text-xs text-slate-400 font-medium bg-slate-800 px-2 py-1 rounded-full flex items-center gap-1">
                <Tag className="w-3 h-3" />
                {categoryName}
              </span>
            )}
          </div>

          <h1 className="text-2xl sm:text-3xl font-bold text-white leading-snug mb-6">
            {proposal.title}
          </h1>

          {/* Metadata */}
          <div className="flex flex-wrap gap-4 text-sm text-slate-500">
            <div className="flex items-center gap-1.5">
              <User className="w-4 h-4" />
              <span>
                {authorProfile?.full_name ?? "Cittadino"}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <Calendar className="w-4 h-4" />
              <span>{formatDateTime(proposal.created_at)}</span>
            </div>
            {proposal.expires_at && (
              <div className="flex items-center gap-1.5">
                <Clock className="w-4 h-4" />
                <span>
                  Scade: {formatDateTime(proposal.expires_at)}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Testo proposta */}
          <div className="lg:col-span-2 space-y-6">
            {/* Contesto */}
            <div className="card p-6">
              <h2 className="text-lg font-semibold text-slate-200 mb-4 flex items-center gap-2">
                <FileText className="w-5 h-5 text-pangea-400" />
                Contesto e Motivazione
              </h2>
              <div className="prose prose-invert prose-sm max-w-none">
                <p className="text-slate-300 leading-relaxed whitespace-pre-wrap">
                  {proposal.content}
                </p>
              </div>
            </div>

            {/* Dispositivo normativo */}
            {proposal.dispositivo && (
              <div className="card p-6">
                <h2 className="text-lg font-semibold text-slate-200 mb-4">
                  Dispositivo Normativo
                </h2>
                <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-700/50">
                  <p className="text-slate-300 text-sm font-mono leading-relaxed whitespace-pre-wrap">
                    {proposal.dispositivo}
                  </p>
                </div>
              </div>
            )}

            {/* Opzioni deliberative */}
            {proposalOptions.length > 0 && (
              <div className="card p-6">
                <h2 className="text-lg font-semibold text-slate-200 mb-4 flex items-center gap-2">
                  <Flame className="w-5 h-5 text-amber-400" />
                  Opzioni Deliberative
                </h2>
                <div className="space-y-3">
                  {proposalOptions.map((opt, i) => (
                    <div
                      key={opt.id}
                      className="bg-slate-900/50 rounded-lg p-4 border border-slate-700/50"
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs text-slate-500 bg-slate-800 px-2 py-0.5 rounded font-medium">
                          {i + 1}
                        </span>
                        <h3 className="text-sm font-semibold text-slate-200">
                          {opt.title}
                        </h3>
                      </div>
                      {opt.description && (
                        <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                          {opt.description}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar: Cabina Elettorale o Segnali */}
          <div className="lg:col-span-1">
            {proposal.status === "curation" ? (
              /* Mercato di Curatela — SignalButton */
              <div className="sticky top-24">
                <div className="card p-5 mb-4">
                  <h2 className="text-base font-semibold text-slate-200 mb-1 flex items-center gap-2">
                    <Flame className="w-4 h-4 text-amber-400" />
                    Mercato di Curatela
                  </h2>
                  <p className="text-xs text-slate-500">
                    Supporta questa proposta per portarla alla fase deliberativa
                  </p>
                </div>
                <div className="card p-5">
                  <SignalButton
                    proposalId={proposal.id}
                    userId={user.id}
                    initialSignalCount={signalCount}
                    initialHasSignaled={hasSignaled}
                  />
                </div>
              </div>
            ) : (
              /* Cabina Elettorale — VotingBooth con sliders */
              <VotingBooth
                proposal={proposal}
                options={proposalOptions}
                initialResults={distributedResults}
                initialHasVoted={hasVoted ?? false}
                userId={user.id}
                hasActiveDelegation={hasActiveDelegation}
                categoryName={categoryName}
              />
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import Navbar from "@/components/Navbar";
import VotingBooth from "@/components/VotingBooth";
import type { ProposalResults } from "@/lib/types";
import { ArrowLeft, Calendar, Clock, User, FileText } from "lucide-react";
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

  // Recupera proposta
  const { data: proposal, error } = await supabase
    .from("proposals")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !proposal) notFound();

  // Recupera profilo autore
  const { data: authorProfile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", proposal.author_id)
    .single();

  // Recupera risultati tramite RPC (bypass RLS, solo aggregati)
  const { data: resultsData } = await supabase.rpc("get_proposal_results", {
    p_proposal_id: id,
  });

  const results: ProposalResults = resultsData?.[0] ?? {
    yea_count: 0,
    nay_count: 0,
    abstain_count: 0,
  };

  // Controlla se l'utente ha già votato (RPC GDPR-safe)
  const { data: hasVoted } = await supabase.rpc("has_user_voted", {
    p_proposal_id: id,
  });

  const isAuthor = proposal.author_id === user.id;

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
          <div className="flex items-center gap-3 mb-4">
            <span
              className={
                proposal.status === "active"
                  ? "status-active"
                  : proposal.status === "closed"
                  ? "status-closed"
                  : "status-draft"
              }
            >
              {proposal.status === "active"
                ? "In Delibera"
                : proposal.status === "closed"
                ? "Deliberata"
                : "Bozza"}
            </span>
            {isAuthor && (
              <span className="text-xs text-amber-400 font-medium bg-amber-900/20 px-2 py-1 rounded-full border border-amber-800/30">
                Tua proposta
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
          </div>

          {/* Cabina elettorale */}
          <div className="lg:col-span-1">
            <VotingBooth
              proposal={proposal}
              initialResults={results}
              initialHasVoted={hasVoted ?? false}
              userId={user.id}
            />
          </div>
        </div>
      </main>
    </div>
  );
}

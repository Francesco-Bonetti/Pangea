"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Proposal, ProposalResults, VoteType } from "@/lib/types";
import { calcPercentage, getTotalVotes } from "@/lib/utils";
import {
  ThumbsUp,
  ThumbsDown,
  Minus,
  CheckCircle2,
  Lock,
  Shield,
  Users,
  Loader2,
} from "lucide-react";

interface VotingBoothProps {
  proposal: Proposal;
  initialResults: ProposalResults;
  initialHasVoted: boolean;
  userId: string;
}

export default function VotingBooth({
  proposal,
  initialResults,
  initialHasVoted,
  userId,
}: VotingBoothProps) {
  const [results, setResults] = useState<ProposalResults>(initialResults);
  const [hasVoted, setHasVoted] = useState(initialHasVoted);
  const [voting, setVoting] = useState<VoteType | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successType, setSuccessType] = useState<VoteType | null>(null);
  const supabase = createClient();

  const total = getTotalVotes(results);
  const isActive = proposal.status === "active";
  const canVote = isActive && !hasVoted;

  async function castVote(voteType: VoteType) {
    if (!canVote || voting) return;
    setError(null);
    setVoting(voteType);

    try {
      // STEP 1: Inserimento voto nella tabella votes
      const { error: insertError } = await supabase.from("votes").insert({
        proposal_id: proposal.id,
        voter_id: userId,
        vote_type: voteType,
      });

      // Gestione conflitto UNIQUE (doppio voto impossibile a livello DB)
      if (insertError) {
        if (insertError.code === "23505") {
          setError("Hai già partecipato a questa delibera. Il tuo voto è stato registrato.");
          setHasVoted(true);
        } else {
          throw insertError;
        }
        return;
      }

      // STEP 2: Aggiorna risultati tramite RPC (senza ricaricare la pagina)
      const { data: newResults } = await supabase.rpc("get_proposal_results", {
        p_proposal_id: proposal.id,
      });

      if (newResults?.[0]) {
        setResults(newResults[0]);
      }

      setHasVoted(true);
      setSuccessType(voteType);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Errore durante la votazione";
      setError(msg);
    } finally {
      setVoting(null);
    }
  }

  const voteOptions = [
    {
      type: "yea" as VoteType,
      label: "Favorevole",
      icon: ThumbsUp,
      color: "green",
      count: results.yea_count,
      percent: calcPercentage(results.yea_count, total),
      buttonClass: "border-green-700 bg-green-900/20 hover:bg-green-900/40 hover:border-green-500 text-green-400",
      barClass: "bg-green-500",
    },
    {
      type: "nay" as VoteType,
      label: "Contrario",
      icon: ThumbsDown,
      color: "red",
      count: results.nay_count,
      percent: calcPercentage(results.nay_count, total),
      buttonClass: "border-red-800 bg-red-900/20 hover:bg-red-900/40 hover:border-red-500 text-red-400",
      barClass: "bg-red-500",
    },
    {
      type: "abstain" as VoteType,
      label: "Astenuto",
      icon: Minus,
      color: "slate",
      count: results.abstain_count,
      percent: calcPercentage(results.abstain_count, total),
      buttonClass: "border-slate-600 bg-slate-800/50 hover:bg-slate-700/50 hover:border-slate-500 text-slate-400",
      barClass: "bg-slate-500",
    },
  ];

  return (
    <div className="sticky top-24">
      {/* Header */}
      <div className="card p-5 mb-4">
        <h2 className="text-base font-semibold text-slate-200 mb-1 flex items-center gap-2">
          <Shield className="w-4 h-4 text-pangea-400" />
          Cabina Elettorale
        </h2>
        <p className="text-xs text-slate-500">
          I voti sono anonimi e immutabili per garantia democratica
        </p>
      </div>

      {/* Risultati */}
      <div className="card p-5 mb-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-medium text-slate-300">Risultati in tempo reale</h3>
          <div className="flex items-center gap-1 text-xs text-slate-500">
            <Users className="w-3.5 h-3.5" />
            <span>{total} {total === 1 ? "voto" : "voti"}</span>
          </div>
        </div>

        <div className="space-y-3">
          {voteOptions.map(({ type, label, count, percent, barClass }) => (
            <div key={type}>
              <div className="flex justify-between text-xs text-slate-400 mb-1">
                <span>{label}</span>
                <span>{count} ({percent}%)</span>
              </div>
              <div className="bg-slate-700 rounded-full h-2.5">
                <div
                  className={`${barClass} h-2.5 rounded-full transition-all duration-700`}
                  style={{ width: `${percent}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Pulsanti voto */}
      <div className="card p-5">
        {/* Stato: ha votato */}
        {hasVoted && (
          <div className="text-center py-4">
            <CheckCircle2 className="w-10 h-10 text-green-400 mx-auto mb-3" />
            <p className="text-slate-200 font-semibold mb-1">
              {successType === "yea" && "Hai votato Favorevole"}
              {successType === "nay" && "Hai votato Contrario"}
              {successType === "abstain" && "Ti sei Astenuto"}
              {!successType && "Hai già partecipato"}
            </p>
            <p className="text-xs text-slate-500 leading-relaxed">
              Il tuo voto è stato registrato in modo sicuro. La tua preferenza rimane
              riservata e conforme al GDPR.
            </p>
          </div>
        )}

        {/* Stato: proposta chiusa */}
        {!isActive && !hasVoted && (
          <div className="text-center py-4">
            <Lock className="w-10 h-10 text-slate-600 mx-auto mb-3" />
            <p className="text-slate-400 font-medium mb-1">Delibera chiusa</p>
            <p className="text-xs text-slate-600">
              La votazione su questa proposta si è conclusa.
            </p>
          </div>
        )}

        {/* Stato: può votare */}
        {canVote && (
          <>
            <p className="text-sm text-slate-400 mb-4 text-center">
              Esprimi la tua posizione sul disegno di legge
            </p>
            <div className="space-y-3">
              {voteOptions.map(({ type, label, icon: Icon, buttonClass }) => (
                <button
                  key={type}
                  onClick={() => castVote(type)}
                  disabled={!!voting}
                  className={`w-full flex items-center justify-center gap-3 py-3 rounded-xl border-2 font-semibold text-sm transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${buttonClass}`}
                >
                  {voting === type ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Icon className="w-4 h-4" />
                  )}
                  {voting === type ? "Registrando..." : label}
                </button>
              ))}
            </div>
          </>
        )}

        {/* Errore */}
        {error && (
          <div className="mt-4 p-3 bg-red-900/30 border border-red-700/50 rounded-lg text-red-300 text-xs">
            {error}
          </div>
        )}

        {/* Footer GDPR */}
        <div className="mt-4 pt-4 border-t border-slate-700/50">
          <div className="flex items-start gap-2">
            <Shield className="w-3.5 h-3.5 text-slate-600 mt-0.5 shrink-0" />
            <p className="text-xs text-slate-600 leading-relaxed">
              Le preferenze di voto non sono mai accessibili a terze parti.
              Privacy by Design — GDPR Art. 9.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

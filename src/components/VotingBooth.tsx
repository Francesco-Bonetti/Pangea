"use client";

import { useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Proposal, ProposalOption, DistributedResult } from "@/lib/types";
import {
  CheckCircle2,
  Lock,
  Shield,
  Users,
  Loader2,
  AlertTriangle,
  Flame,
  Sliders,
} from "lucide-react";

interface VotingBoothProps {
  proposal: Proposal;
  options: ProposalOption[];
  initialResults: DistributedResult[];
  initialHasVoted: boolean;
  userId: string;
  hasActiveDelegation?: boolean;
  categoryName?: string | null;
}

export default function VotingBooth({
  proposal,
  options,
  initialResults,
  initialHasVoted,
  userId,
  hasActiveDelegation = false,
  categoryName,
}: VotingBoothProps) {
  const [results, setResults] = useState<DistributedResult[]>(initialResults);
  const [hasVoted, setHasVoted] = useState(initialHasVoted);
  const [allocations, setAllocations] = useState<Record<string, number>>(
    () => {
      // Inizializza allocazioni equamente distribuite
      const initial: Record<string, number> = {};
      if (options.length > 0) {
        const equalShare = Math.floor(100 / options.length);
        const remainder = 100 - equalShare * options.length;
        options.forEach((opt, i) => {
          initial[opt.id] = equalShare + (i === 0 ? remainder : 0);
        });
      }
      return initial;
    }
  );
  const [voting, setVoting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();

  const isActive = proposal.status === "active";
  const isCuration = proposal.status === "curation";
  const canVote = isActive && !hasVoted && options.length > 0;

  const totalAllocated = Object.values(allocations).reduce((a, b) => a + b, 0);
  const isValidAllocation = totalAllocated === 100;

  const maxScore = Math.max(...results.map((r) => r.weighted_score), 1);
  const totalVotes = results.length > 0 ? results[0].total_votes : 0;

  const handleSliderChange = useCallback(
    (optionId: string, value: number) => {
      setAllocations((prev) => {
        const otherKeys = Object.keys(prev).filter((k) => k !== optionId);
        const otherTotal = otherKeys.reduce((sum, k) => sum + prev[k], 0);
        const newValue = Math.min(value, 100);

        // Se la somma sforerebbe 100, riduci proporzionalmente gli altri
        if (newValue + otherTotal > 100 && otherTotal > 0) {
          const scale = (100 - newValue) / otherTotal;
          const updated: Record<string, number> = { [optionId]: newValue };
          otherKeys.forEach((k) => {
            updated[k] = Math.round(prev[k] * scale);
          });
          // Correggi arrotondamenti
          const sum = Object.values(updated).reduce((a, b) => a + b, 0);
          if (sum !== 100 && otherKeys.length > 0) {
            updated[otherKeys[0]] += 100 - sum;
          }
          return updated;
        }

        return { ...prev, [optionId]: newValue };
      });
    },
    []
  );

  async function castDistributedVote() {
    if (!canVote || !isValidAllocation || voting) return;
    setError(null);
    setVoting(true);

    try {
      // Step 1: Calcola il peso del voto
      const { data: weight } = await supabase.rpc("calculate_voting_weight", {
        p_proposal_id: proposal.id,
        p_voter_id: userId,
      });

      // Step 2: Inserisci il voto (testata)
      const { data: voteData, error: voteError } = await supabase
        .from("votes")
        .insert({
          proposal_id: proposal.id,
          voter_id: userId,
          vote_type: "yea", // Nel sistema distribuito, il vote_type è un placeholder
          voting_weight: weight ?? 1,
        })
        .select("id")
        .single();

      if (voteError) {
        if (voteError.code === "23505") {
          setHasVoted(true);
          setError("Hai già partecipato a questa delibera.");
          return;
        }
        throw voteError;
      }

      // Step 3: Inserisci le allocazioni percentuali
      const allocationRows = Object.entries(allocations)
        .filter(([, pct]) => pct > 0)
        .map(([optionId, pct]) => ({
          vote_id: voteData.id,
          option_id: optionId,
          allocation_percentage: pct,
        }));

      const { error: allocError } = await supabase
        .from("vote_allocations")
        .insert(allocationRows);

      if (allocError) throw allocError;

      // Step 4: Aggiorna risultati
      const { data: newResults } = await supabase.rpc(
        "get_distributed_proposal_results",
        { p_proposal_id: proposal.id }
      );

      if (newResults) {
        setResults(newResults);
      }

      setHasVoted(true);
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Errore durante la votazione";
      setError(msg);
    } finally {
      setVoting(false);
    }
  }

  return (
    <div className="sticky top-24">
      {/* Header */}
      <div className="card p-5 mb-4">
        <h2 className="text-base font-semibold text-slate-200 mb-1 flex items-center gap-2">
          <Shield className="w-4 h-4 text-pangea-400" />
          {isCuration ? "Mercato di Curatela" : "Cabina Elettorale"}
        </h2>
        <p className="text-xs text-slate-500">
          {isCuration
            ? "Questa proposta è in fase di valutazione comunitaria"
            : "I voti sono anonimi e immutabili per garanzia democratica"}
        </p>
      </div>

      {/* Warning deleghe attive */}
      {hasActiveDelegation && isActive && !hasVoted && (
        <div className="card p-4 mb-4 bg-amber-900/10 border-amber-700/30">
          <div className="flex gap-3">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div className="text-xs text-amber-300">
              <p className="font-medium mb-1">Delega attiva{categoryName ? ` in "${categoryName}"` : ""}</p>
              <p className="text-amber-400/80">
                Votando direttamente, il tuo voto personale avrà la supremazia
                sulla delega assegnata per questa categoria.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Risultati */}
      {results.length > 0 && (
        <div className="card p-5 mb-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-slate-300">
              Risultati in tempo reale
            </h3>
            <div className="flex items-center gap-1 text-xs text-slate-500">
              <Users className="w-3.5 h-3.5" />
              <span>
                {totalVotes} {totalVotes === 1 ? "voto" : "voti"}
              </span>
            </div>
          </div>

          <div className="space-y-3">
            {results.map((r) => {
              const barWidth =
                maxScore > 0 ? (r.weighted_score / maxScore) * 100 : 0;
              return (
                <div key={r.option_id}>
                  <div className="flex justify-between text-xs text-slate-400 mb-1">
                    <span className="truncate mr-2">{r.option_title}</span>
                    <span className="shrink-0 font-medium">
                      {r.weighted_score.toFixed(1)}
                    </span>
                  </div>
                  <div className="bg-slate-700 rounded-full h-2.5">
                    <div
                      className="bg-pangea-500 h-2.5 rounded-full transition-all duration-700"
                      style={{ width: `${barWidth}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Interfaccia di voto — Multiple Sliders */}
      <div className="card p-5">
        {/* Ha votato */}
        {hasVoted && (
          <div className="text-center py-4">
            <CheckCircle2 className="w-10 h-10 text-green-400 mx-auto mb-3" />
            <p className="text-slate-200 font-semibold mb-1">
              Voto registrato
            </p>
            <p className="text-xs text-slate-500 leading-relaxed">
              La tua allocazione è stata registrata in modo sicuro e anonimo.
              Conforme al GDPR.
            </p>
          </div>
        )}

        {/* Proposta chiusa */}
        {proposal.status === "closed" && !hasVoted && (
          <div className="text-center py-4">
            <Lock className="w-10 h-10 text-slate-600 mx-auto mb-3" />
            <p className="text-slate-400 font-medium mb-1">Delibera chiusa</p>
            <p className="text-xs text-slate-600">
              La votazione su questa proposta si è conclusa.
            </p>
          </div>
        )}

        {/* In curatela — non si vota ancora */}
        {isCuration && (
          <div className="text-center py-4">
            <Flame className="w-10 h-10 text-amber-400 mx-auto mb-3" />
            <p className="text-slate-300 font-medium mb-1">Fase di Curatela</p>
            <p className="text-xs text-slate-500 leading-relaxed">
              Questa proposta deve raggiungere la soglia di segnali prima di
              passare alla fase deliberativa. Supportala con un segnale.
            </p>
          </div>
        )}

        {/* Può votare — Sliders */}
        {canVote && (
          <>
            <div className="flex items-center gap-2 mb-4">
              <Sliders className="w-4 h-4 text-pangea-400" />
              <p className="text-sm text-slate-300 font-medium">
                Distribuisci il tuo voto
              </p>
            </div>
            <p className="text-xs text-slate-500 mb-5">
              Assegna il 100% del tuo potere decisionale tra le opzioni. Puoi
              concentrare tutto su una o distribuire proporzionalmente.
            </p>

            <div className="space-y-4">
              {options.map((opt) => {
                const pct = allocations[opt.id] ?? 0;
                return (
                  <div key={opt.id}>
                    <div className="flex justify-between text-sm mb-1.5">
                      <span className="text-slate-300 truncate mr-2">
                        {opt.title}
                      </span>
                      <span
                        className={`font-bold shrink-0 ${
                          pct > 0 ? "text-pangea-300" : "text-slate-600"
                        }`}
                      >
                        {pct}%
                      </span>
                    </div>
                    {opt.description && (
                      <p className="text-xs text-slate-600 mb-2 line-clamp-1">
                        {opt.description}
                      </p>
                    )}
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={pct}
                      onChange={(e) =>
                        handleSliderChange(opt.id, parseInt(e.target.value))
                      }
                      className="w-full h-2 bg-slate-700 rounded-full appearance-none cursor-pointer
                        [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4
                        [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-pangea-400
                        [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:shadow-lg
                        [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:rounded-full
                        [&::-moz-range-thumb]:bg-pangea-400 [&::-moz-range-thumb]:cursor-pointer [&::-moz-range-thumb]:border-0"
                    />
                  </div>
                );
              })}
            </div>

            {/* Totale */}
            <div
              className={`mt-5 pt-4 border-t border-slate-700/50 flex items-center justify-between ${
                isValidAllocation ? "text-green-400" : "text-red-400"
              }`}
            >
              <span className="text-sm font-medium">Totale allocato</span>
              <span className="text-lg font-bold">{totalAllocated}%</span>
            </div>

            {!isValidAllocation && (
              <p className="text-xs text-red-400 mt-1">
                La somma deve essere esattamente 100% per confermare il voto.
              </p>
            )}

            <button
              onClick={castDistributedVote}
              disabled={!isValidAllocation || voting}
              className="w-full mt-4 btn-primary flex items-center justify-center gap-2 py-3"
            >
              {voting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <CheckCircle2 className="w-4 h-4" />
              )}
              {voting ? "Registrando voto..." : "Conferma allocazione"}
            </button>
          </>
        )}

        {/* Nessuna opzione definita */}
        {isActive && !hasVoted && options.length === 0 && (
          <div className="text-center py-4">
            <AlertTriangle className="w-10 h-10 text-slate-600 mx-auto mb-3" />
            <p className="text-slate-400 font-medium mb-1">
              Nessuna opzione deliberativa
            </p>
            <p className="text-xs text-slate-600">
              L&apos;autore non ha ancora definito le opzioni di voto per questa
              proposta.
            </p>
          </div>
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

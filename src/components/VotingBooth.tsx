"use client";

import { useState, useCallback, useEffect } from "react";
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
  RotateCcw,
  ThumbsUp,
  ThumbsDown,
  MinusCircle,
  LogIn,
} from "lucide-react";
import Link from "next/link";

interface VotingBoothProps {
  proposal: Proposal;
  options: ProposalOption[];
  initialResults: DistributedResult[];
  initialHasVoted: boolean;
  userId: string;
  hasActiveDelegation?: boolean;
  categoryName?: string | null;
  isGuest?: boolean;
}

export default function VotingBooth({
  proposal,
  options,
  initialResults,
  initialHasVoted,
  userId,
  hasActiveDelegation = false,
  categoryName,
  isGuest = false,
}: VotingBoothProps) {
  const [results, setResults] = useState<DistributedResult[]>(initialResults);
  const [legacyResults, setLegacyResults] = useState<{yea: number; nay: number; abstain: number} | null>(null);
  const [hasVoted, setHasVoted] = useState(initialHasVoted);
  const [allocations, setAllocations] = useState<Record<string, number>>(
    () => {
      // Initialize evenly distributed allocations
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
  const [revoking, setRevoking] = useState(false);
  const supabase = createClient();

  const isActive = proposal.status === "active";
  const isClosed = proposal.status === "closed";
  const isCuration = proposal.status === "curation";
  const canVote = isActive && !hasVoted && options.length > 0;

  // Fetch legacy results for proposals without distributed options
  useEffect(() => {
    async function fetchLegacyResults() {
      if (options.length > 0) return;
      if (!isActive && !isClosed) return;

      const { data } = await supabase
        .from("votes")
        .select("vote_type")
        .eq("proposal_id", proposal.id);

      if (data) {
        const counts = { yea: 0, nay: 0, abstain: 0 };
        data.forEach((v: { vote_type: string }) => {
          if (v.vote_type === "yea") counts.yea++;
          else if (v.vote_type === "nay") counts.nay++;
          else if (v.vote_type === "abstain") counts.abstain++;
        });
        setLegacyResults(counts);
      }
    }
    fetchLegacyResults();
  }, [options.length, isActive, isClosed, proposal.id, supabase]);

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

        // If the sum would exceed 100, reduce others proportionally
        if (newValue + otherTotal > 100 && otherTotal > 0) {
          const scale = (100 - newValue) / otherTotal;
          const updated: Record<string, number> = { [optionId]: newValue };
          otherKeys.forEach((k) => {
            updated[k] = Math.round(prev[k] * scale);
          });
          // Fix rounding
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
      // Step 1: Calculate voting weight
      const { data: weight } = await supabase.rpc("calculate_voting_weight", {
        p_proposal_id: proposal.id,
        p_voter_id: userId,
      });

      // Step 2: Insert the vote (header)
      const { data: voteData, error: voteError } = await supabase
        .from("votes")
        .insert({
          proposal_id: proposal.id,
          voter_id: userId,
          vote_type: "yea", // In distributed system, vote_type is a placeholder
          voting_weight: weight ?? 1,
        })
        .select("id")
        .single();

      if (voteError) {
        if (voteError.code === "23505") {
          setHasVoted(true);
          setError("You have already participated in this deliberation.");
          return;
        }
        throw voteError;
      }

      // Step 3: Insert percentage allocations
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

      // Step 4: Update results
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
        err instanceof Error ? err.message : "Error during voting";
      setError(msg);
    } finally {
      setVoting(false);
    }
  }

  async function revokeVote() {
    if (!isActive || !hasVoted || revoking) return;
    setError(null);
    setRevoking(true);

    try {
      // Delete the user's vote (cascade will remove vote_allocations)
      const { error: deleteError } = await supabase
        .from("votes")
        .delete()
        .eq("proposal_id", proposal.id)
        .eq("voter_id", userId);

      if (deleteError) throw deleteError;

      // Update results
      const { data: newResults } = await supabase.rpc(
        "get_distributed_proposal_results",
        { p_proposal_id: proposal.id }
      );

      if (newResults) {
        setResults(newResults);
      }

      setHasVoted(false);
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Error revoking vote";
      setError(msg);
    } finally {
      setRevoking(false);
    }
  }

  async function castSimpleVote(voteType: "yea" | "nay" | "abstain") {
    if (!isActive || hasVoted || revoking) return;
    setError(null);
    setRevoking(true);

    try {
      // Calculate voting weight
      const { data: weight } = await supabase.rpc("calculate_voting_weight", {
        p_proposal_id: proposal.id,
        p_voter_id: userId,
      });

      // Insert simple vote (no allocations)
      const { error: voteError } = await supabase
        .from("votes")
        .insert({
          proposal_id: proposal.id,
          voter_id: userId,
          vote_type: voteType,
          voting_weight: weight ?? 1,
        });

      if (voteError) {
        if (voteError.code === "23505") {
          setHasVoted(true);
          setError("You have already participated in this deliberation.");
          return;
        }
        throw voteError;
      }

      // Update legacy results
      const { data: votesData } = await supabase
        .from("votes")
        .select("vote_type")
        .eq("proposal_id", proposal.id);
      if (votesData) {
        const counts = { yea: 0, nay: 0, abstain: 0 };
        votesData.forEach((v: { vote_type: string }) => {
          if (v.vote_type === "yea") counts.yea++;
          else if (v.vote_type === "nay") counts.nay++;
          else if (v.vote_type === "abstain") counts.abstain++;
        });
        setLegacyResults(counts);
      }

      setHasVoted(true);
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Error during voting";
      setError(msg);
    } finally {
      setRevoking(false);
    }
  }

  return (
    <div className="sticky top-24">
      {/* Header */}
      <div className="card p-5 mb-4">
        <h2 className="text-base font-semibold text-slate-200 mb-1 flex items-center gap-2">
          <Shield className="w-4 h-4 text-pangea-400" />
          {isCuration ? "Community Review" : "Voting Booth"}
        </h2>
        <p className="text-xs text-slate-500">
          {isCuration
            ? "This proposal is under community review"
            : "Votes are anonymous. You can change your vote while the proposal is active."}
        </p>
      </div>

      {/* Active delegation warning */}
      {hasActiveDelegation && isActive && !hasVoted && (
        <div className="card p-4 mb-4 bg-amber-900/10 border-amber-700/30">
          <div className="flex gap-3">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div className="text-xs text-amber-300">
              <p className="font-medium mb-1">Active delegation{categoryName ? ` in "${categoryName}"` : ""}</p>
              <p className="text-amber-400/80">
                By voting directly, your personal vote will take precedence
                over the delegation assigned for this category.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Results */}
      {results.length > 0 && (
        <div className="card p-5 mb-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-slate-300">
              Live Results
            </h3>
            <div className="flex items-center gap-1 text-xs text-slate-500">
              <Users className="w-3.5 h-3.5" />
              <span>
                {totalVotes} {totalVotes === 1 ? "vote" : "votes"}
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

      {/* Legacy results (yea/nay/abstain) for proposals without distributed options */}
      {legacyResults && options.length === 0 && (legacyResults.yea > 0 || legacyResults.nay > 0 || legacyResults.abstain > 0) && (
        <div className="card p-5 mb-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-slate-300">
              Results
            </h3>
            <div className="flex items-center gap-1 text-xs text-slate-500">
              <Users className="w-3.5 h-3.5" />
              <span>
                {legacyResults.yea + legacyResults.nay + legacyResults.abstain} votes
              </span>
            </div>
          </div>
          <div className="space-y-3">
            {[
              { label: "In Favor", count: legacyResults.yea, color: "bg-green-500" },
              { label: "Against", count: legacyResults.nay, color: "bg-red-500" },
              { label: "Abstain", count: legacyResults.abstain, color: "bg-slate-500" },
            ].map((item) => {
              const total = legacyResults.yea + legacyResults.nay + legacyResults.abstain;
              const pct = total > 0 ? (item.count / total) * 100 : 0;
              return (
                <div key={item.label}>
                  <div className="flex justify-between text-xs text-slate-400 mb-1">
                    <span>{item.label}</span>
                    <span className="font-medium">{item.count} ({pct.toFixed(0)}%)</span>
                  </div>
                  <div className="bg-slate-700 rounded-full h-2.5">
                    <div
                      className={`${item.color} h-2.5 rounded-full transition-all duration-700`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Voting interface — Multiple Sliders */}
      <div className="card p-5">
        {/* Already voted */}
        {hasVoted && (
          <div className="text-center py-4">
            <CheckCircle2 className="w-10 h-10 text-green-400 mx-auto mb-3" />
            <p className="text-slate-200 font-semibold mb-1">
              Vote recorded
            </p>
            <p className="text-xs text-slate-500 leading-relaxed">
              Your allocation has been securely and anonymously recorded.
              GDPR compliant.
            </p>
            {isActive && (
              <button
                onClick={revokeVote}
                disabled={revoking}
                className="w-full mt-4 btn-primary flex items-center justify-center gap-2 py-2 bg-slate-700 hover:bg-slate-600"
              >
                {revoking ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <RotateCcw className="w-4 h-4" />
                )}
                {revoking ? "Revoking..." : "Change vote"}
              </button>
            )}
          </div>
        )}

        {/* Proposal closed */}
        {proposal.status === "closed" && !hasVoted && (
          <div className="text-center py-4">
            <Lock className="w-10 h-10 text-slate-600 mx-auto mb-3" />
            <p className="text-slate-400 font-medium mb-1">Vote concluded</p>
            <p className="text-xs text-slate-600">
              Voting on this proposal has ended.
            </p>
          </div>
        )}

        {/* Community Review — no voting yet */}
        {isCuration && (
          <div className="text-center py-4">
            <Flame className="w-10 h-10 text-amber-400 mx-auto mb-3" />
            <p className="text-slate-300 font-medium mb-1">Community Review</p>
            <p className="text-xs text-slate-500 leading-relaxed">
              This proposal needs to reach the signal threshold before
              moving to the voting phase. Support it with a signal.
            </p>
          </div>
        )}

        {/* Guest — invite to sign up */}
        {isGuest && isActive && (
          <div className="text-center py-4">
            <LogIn className="w-10 h-10 text-pangea-400 mx-auto mb-3" />
            <p className="text-slate-200 font-semibold mb-1">
              Want to vote?
            </p>
            <p className="text-xs text-slate-500 leading-relaxed mb-4">
              Sign up to participate in the vote and make your voice heard.
            </p>
            <Link href="/auth" className="btn-primary inline-flex items-center gap-2 text-sm">
              <LogIn className="w-4 h-4" />
              Sign up to vote
            </Link>
          </div>
        )}

        {/* Can vote — Sliders */}
        {canVote && !isGuest && (
          <>
            <div className="flex items-center gap-2 mb-4">
              <Sliders className="w-4 h-4 text-pangea-400" />
              <p className="text-sm text-slate-300 font-medium">
                Distribute your vote
              </p>
            </div>
            <p className="text-xs text-slate-500 mb-5">
              Allocate 100% of your decision-making power among the options. You can
              concentrate it all on one or distribute proportionally.
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
              <span className="text-sm font-medium">Total allocated</span>
              <span className="text-lg font-bold">{totalAllocated}%</span>
            </div>

            {!isValidAllocation && (
              <p className="text-xs text-red-400 mt-1">
                The total must be exactly 100% to confirm your vote.
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
              {voting ? "Recording vote..." : "Confirm allocation"}
            </button>
          </>
        )}

        {/* No options defined — Fallback to In Favor/Against/Abstain */}
        {isActive && !hasVoted && options.length === 0 && (
          <div>
            <div className="flex items-center gap-2 mb-4">
              <ThumbsUp className="w-4 h-4 text-pangea-400" />
              <p className="text-sm text-slate-300 font-medium">
                Cast your vote
              </p>
            </div>
            <p className="text-xs text-slate-500 mb-5">
              No voting options have been defined. You can still
              participate by voting In Favor, Against, or Abstain.
            </p>

            <div className="grid grid-cols-3 gap-3">
              <button
                onClick={() => castSimpleVote("yea")}
                disabled={revoking}
                className="btn-primary py-3 flex items-center justify-center gap-2 bg-green-900/20 hover:bg-green-900/40 border border-green-700/30 text-green-300"
              >
                {revoking ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <ThumbsUp className="w-4 h-4" />
                )}
                <span className="text-xs font-medium">In Favor</span>
              </button>

              <button
                onClick={() => castSimpleVote("nay")}
                disabled={revoking}
                className="btn-primary py-3 flex items-center justify-center gap-2 bg-red-900/20 hover:bg-red-900/40 border border-red-700/30 text-red-300"
              >
                {revoking ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <ThumbsDown className="w-4 h-4" />
                )}
                <span className="text-xs font-medium">Against</span>
              </button>

              <button
                onClick={() => castSimpleVote("abstain")}
                disabled={revoking}
                className="btn-primary py-3 flex items-center justify-center gap-2 bg-slate-700 hover:bg-slate-600 border border-slate-600/30 text-slate-300"
              >
                {revoking ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <MinusCircle className="w-4 h-4" />
                )}
                <span className="text-xs font-medium">Abstain</span>
              </button>
            </div>
          </div>
        )}

        {/* Error */}
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
              Voting preferences are never accessible to third parties.
              Privacy by Design — GDPR Art. 9.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

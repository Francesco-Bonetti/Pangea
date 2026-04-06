"use client";

import { useState, useCallback, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useLanguage } from "@/components/language-provider";
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
import AlertDialog from "@/components/AlertDialog";
import { useToast } from "@/components/Toast";

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
  const { translations, t } = useLanguage();
  const [results, setResults] = useState<DistributedResult[]>(initialResults);
  const [legacyResults, setLegacyResults] = useState<{yea: number; nay: number; abstain: number} | null>(null);
  const [hasVoted, setHasVoted] = useState(initialHasVoted);
  const [allocations, setAllocations] = useState<Record<string, number>>(
    () => {
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

  // Positive friction: AlertDialog state
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [pendingVoteType, setPendingVoteType] = useState<"distributed" | "yea" | "nay" | "abstain" | null>(null);
  const [confirmLoading, setConfirmLoading] = useState(false);

  const { toast } = useToast();
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

        if (newValue + otherTotal > 100 && otherTotal > 0) {
          const scale = (100 - newValue) / otherTotal;
          const updated: Record<string, number> = { [optionId]: newValue };
          otherKeys.forEach((k) => {
            updated[k] = Math.round(prev[k] * scale);
          });
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

  // ── Positive Friction: open dialog instead of voting directly ──
  function requestVote(type: "distributed" | "yea" | "nay" | "abstain") {
    setPendingVoteType(type);
    setConfirmDialogOpen(true);
  }

  function cancelVote() {
    setConfirmDialogOpen(false);
    setPendingVoteType(null);
    setConfirmLoading(false);
  }

  async function confirmVote() {
    if (!pendingVoteType) return;
    setConfirmLoading(true);

    try {
      if (pendingVoteType === "distributed") {
        await executeCastDistributedVote();
      } else {
        await executeCastSimpleVote(pendingVoteType);
      }
      setConfirmDialogOpen(false);
      setPendingVoteType(null);
      toast("Your vote has been securely recorded.", "success");
    } catch {
      // Error already handled in the cast functions
      setConfirmDialogOpen(false);
      setPendingVoteType(null);
    } finally {
      setConfirmLoading(false);
    }
  }

  async function executeCastDistributedVote() {
    if (!canVote || !isValidAllocation) return;
    setError(null);
    setVoting(true);

    try {
      const { data: weight } = await supabase.rpc("calculate_voting_weight", {
        p_proposal_id: proposal.id,
        p_voter_id: userId,
      });

      const { data: voteData, error: voteError } = await supabase
        .from("votes")
        .insert({
          proposal_id: proposal.id,
          voter_id: userId,
          vote_type: "yea",
          voting_weight: weight ?? 1,
        })
        .select("id")
        .single();

      if (voteError) {
        if (voteError.code === "23505") {
          setHasVoted(true);
          setError(t("proposals.alreadyVoted"));
          throw voteError;
        }
        throw voteError;
      }

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
        err instanceof Error ? err.message : t("proposals.votingError");
      setError(msg);
      toast(msg, "error");
      throw err;
    } finally {
      setVoting(false);
    }
  }

  async function revokeVote() {
    if (!isActive || !hasVoted || revoking) return;
    setError(null);
    setRevoking(true);

    try {
      const { error: deleteError } = await supabase
        .from("votes")
        .delete()
        .eq("proposal_id", proposal.id)
        .eq("voter_id", userId);

      if (deleteError) throw deleteError;

      const { data: newResults } = await supabase.rpc(
        "get_distributed_proposal_results",
        { p_proposal_id: proposal.id }
      );

      if (newResults) {
        setResults(newResults);
      }

      setHasVoted(false);
      toast(t("proposals.voteRevoked"), "info");
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : t("proposals.revokeError");
      setError(msg);
      toast(msg, "error");
    } finally {
      setRevoking(false);
    }
  }

  async function executeCastSimpleVote(voteType: "yea" | "nay" | "abstain") {
    if (!isActive || hasVoted) return;
    setError(null);
    setRevoking(true);

    try {
      const { data: weight } = await supabase.rpc("calculate_voting_weight", {
        p_proposal_id: proposal.id,
        p_voter_id: userId,
      });

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
          setError(t("proposals.alreadyVoted"));
          throw voteError;
        }
        throw voteError;
      }

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
        err instanceof Error ? err.message : t("proposals.votingError");
      setError(msg);
      toast(msg, "error");
      throw err;
    } finally {
      setRevoking(false);
    }
  }

  // Vote type label for the dialog
  const voteTypeLabels: Record<string, string> = {
    distributed: t("proposals.yourAllocation"),
    yea: "In Favor",
    nay: "Against",
    abstain: "Abstain",
  };

  return (
    <div className="sticky top-24">
      {/* Positive Friction: Vote Confirmation Dialog */}
      <AlertDialog
        open={confirmDialogOpen}
        onClose={cancelVote}
        onConfirm={confirmVote}
        title={t("proposals.irreversibleAction")}
        description={`${t("proposals.irreversibleDesc")}${
          pendingVoteType ? ` (${voteTypeLabels[pendingVoteType]})` : ""
        }`}
        confirmLabel={t("proposals.confirmMyVote")}
        cancelLabel={t("proposals.goBack")}
        confirmVariant="primary"
        loading={confirmLoading}
      />

      {/* Header */}
      <div className="card p-5 mb-4">
        <h2 className="text-base font-semibold text-fg mb-1 flex items-center gap-2">
          <Shield className="w-4 h-4 text-fg-primary" />
          {isCuration ? "Community Review" : "Voting Booth"}
        </h2>
        <p className="text-xs text-fg-muted">
          {isCuration
            ? "This proposal is under community review"
            : "Votes are anonymous. You can change your vote while the proposal is active."}
        </p>
      </div>

      {/* Active delegation warning */}
      {hasActiveDelegation && isActive && !hasVoted && (
        <div className="card p-4 mb-4 bg-warning-tint border-theme">
          <div className="flex gap-3">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" style={{ color: "#d97706" }} />
            <div className="text-xs" style={{ color: "#d97706" }}>
              <p className="font-medium mb-1">Active delegation{categoryName ? ` in "${categoryName}"` : ""}</p>
              <p className="opacity-80">
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
            <h3 className="text-sm font-medium text-fg">
              Live Results
            </h3>
            <div className="flex items-center gap-1 text-xs text-fg-muted">
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
                  <div className="flex justify-between text-xs text-fg-muted mb-1">
                    <span className="truncate mr-2">{r.option_title}</span>
                    <span className="shrink-0 font-medium">
                      {r.weighted_score.toFixed(1)}
                    </span>
                  </div>
                  <div className="bg-theme-muted rounded-full h-2.5">
                    <div
                      className="h-2.5 rounded-full transition-all duration-700"
                      style={{ width: `${barWidth}%`, backgroundColor: "var(--primary)" }}
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
            <h3 className="text-sm font-medium text-fg">
              Results
            </h3>
            <div className="flex items-center gap-1 text-xs text-fg-muted">
              <Users className="w-3.5 h-3.5" />
              <span>
                {legacyResults.yea + legacyResults.nay + legacyResults.abstain} votes
              </span>
            </div>
          </div>
          <div className="space-y-3">
            {[
              { label: "In Favor", count: legacyResults.yea, colorVar: "var(--success)" },
              { label: "Against", count: legacyResults.nay, colorVar: "var(--destructive)" },
              { label: "Abstain", count: legacyResults.abstain, colorVar: "var(--muted-foreground)" },
            ].map((item) => {
              const total = legacyResults.yea + legacyResults.nay + legacyResults.abstain;
              const pct = total > 0 ? (item.count / total) * 100 : 0;
              return (
                <div key={item.label}>
                  <div className="flex justify-between text-xs text-fg-muted mb-1">
                    <span>{item.label}</span>
                    <span className="font-medium">{item.count} ({pct.toFixed(0)}%)</span>
                  </div>
                  <div className="bg-theme-muted rounded-full h-2.5">
                    <div
                      className="h-2.5 rounded-full transition-all duration-700"
                      style={{ width: `${pct}%`, backgroundColor: item.colorVar }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Voting interface */}
      <div className="card p-5">
        {/* Already voted */}
        {hasVoted && (
          <div className="text-center py-4">
            <CheckCircle2 className="w-10 h-10 text-fg-success mx-auto mb-3" />
            <p className="text-fg font-semibold mb-1">
              Vote recorded
            </p>
            <p className="text-xs text-fg-muted leading-relaxed">
              Your allocation has been securely and anonymously recorded.
              GDPR compliant.
            </p>
            {isActive && (
              <button
                onClick={revokeVote}
                disabled={revoking}
                className="w-full mt-4 btn-secondary flex items-center justify-center gap-2 py-2"
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
            <Lock className="w-10 h-10 text-fg-muted mx-auto mb-3" />
            <p className="text-fg-muted font-medium mb-1">Vote concluded</p>
            <p className="text-xs text-fg-muted">
              Voting on this proposal has ended.
            </p>
          </div>
        )}

        {/* Community Review — no voting yet */}
        {isCuration && (
          <div className="text-center py-4">
            <Flame className="w-10 h-10 mx-auto mb-3" style={{ color: "#d97706" }} />
            <p className="text-fg font-medium mb-1">Community Review</p>
            <p className="text-xs text-fg-muted leading-relaxed">
              This proposal needs to reach the signal threshold before
              moving to the voting phase. Support it with a signal.
            </p>
          </div>
        )}

        {/* Guest — invite to sign up */}
        {isGuest && isActive && (
          <div className="text-center py-4">
            <LogIn className="w-10 h-10 text-fg-primary mx-auto mb-3" />
            <p className="text-fg font-semibold mb-1">
              Want to vote?
            </p>
            <p className="text-xs text-fg-muted leading-relaxed mb-4">
              Sign up to participate in the vote and make your voice heard.
            </p>
            <Link href="/auth" className="btn-primary inline-flex items-center gap-2 text-sm">
              <LogIn className="w-4 h-4" />
              Sign up to vote
            </Link>
          </div>
        )}

        {/* Can vote — Distributed sliders */}
        {canVote && !isGuest && (
          <>
            <div className="flex items-center gap-2 mb-4">
              <Sliders className="w-4 h-4 text-fg-primary" />
              <p className="text-sm text-fg font-medium">
                Distribute your vote
              </p>
            </div>
            <p className="text-xs text-fg-muted mb-5">
              Allocate 100% of your decision-making power among the options. You can
              concentrate it all on one or distribute proportionally.
            </p>

            <div className="space-y-4">
              {options.map((opt) => {
                const pct = allocations[opt.id] ?? 0;
                return (
                  <div key={opt.id}>
                    <div className="flex justify-between text-sm mb-1.5">
                      <span className="text-fg truncate mr-2">
                        {opt.title}
                      </span>
                      <span
                        className={`font-bold shrink-0 ${
                          pct > 0 ? "text-fg-primary" : "text-fg-muted"
                        }`}
                      >
                        {pct}%
                      </span>
                    </div>
                    {opt.description && (
                      <p className="text-xs text-fg-muted mb-2 line-clamp-1">
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
                      className="w-full h-2 bg-theme-muted rounded-full appearance-none cursor-pointer
                        [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5
                        [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[color:var(--primary)]
                        [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:shadow-lg
                        [&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:rounded-full
                        [&::-moz-range-thumb]:bg-[color:var(--primary)] [&::-moz-range-thumb]:cursor-pointer [&::-moz-range-thumb]:border-0"
                    />
                  </div>
                );
              })}
            </div>

            {/* Total */}
            <div
              className={`mt-5 pt-4 border-t border-theme flex items-center justify-between ${
                isValidAllocation ? "text-fg-success" : "text-fg-danger"
              }`}
            >
              <span className="text-sm font-medium">Total allocated</span>
              <span className="text-lg font-bold">{totalAllocated}%</span>
            </div>

            {!isValidAllocation && (
              <p className="text-xs text-fg-danger mt-1">
                The total must be exactly 100% to confirm your vote.
              </p>
            )}

            {/* Positive friction: opens AlertDialog instead of voting directly */}
            <button
              onClick={() => requestVote("distributed")}
              disabled={!isValidAllocation || voting}
              className="w-full mt-4 btn-primary flex items-center justify-center gap-2 py-3 min-h-[44px]"
            >
              <CheckCircle2 className="w-4 h-4" />
              Confirm allocation
            </button>
          </>
        )}

        {/* No options defined — Fallback to In Favor/Against/Abstain */}
        {isActive && !hasVoted && options.length === 0 && !isGuest && (
          <div>
            <div className="flex items-center gap-2 mb-4">
              <ThumbsUp className="w-4 h-4 text-fg-primary" />
              <p className="text-sm text-fg font-medium">
                Cast your vote
              </p>
            </div>
            <p className="text-xs text-fg-muted mb-5">
              No voting options have been defined. You can still
              participate by voting In Favor, Against, or Abstain.
            </p>

            {/* Positive friction: opens AlertDialog instead of voting directly */}
            <div className="grid grid-cols-3 gap-3">
              <button
                onClick={() => requestVote("yea")}
                disabled={revoking}
                className="py-3 flex items-center justify-center gap-2 rounded-lg min-h-[44px]
                  bg-success-tint border border-theme text-fg-success font-medium
                  transition-all duration-200 hover:opacity-80 active:scale-95"
              >
                <ThumbsUp className="w-4 h-4" />
                <span className="text-xs">In Favor</span>
              </button>

              <button
                onClick={() => requestVote("nay")}
                disabled={revoking}
                className="py-3 flex items-center justify-center gap-2 rounded-lg min-h-[44px]
                  bg-danger-tint border border-theme text-fg-danger font-medium
                  transition-all duration-200 hover:opacity-80 active:scale-95"
              >
                <ThumbsDown className="w-4 h-4" />
                <span className="text-xs">Against</span>
              </button>

              <button
                onClick={() => requestVote("abstain")}
                disabled={revoking}
                className="py-3 flex items-center justify-center gap-2 rounded-lg min-h-[44px]
                  bg-theme-muted border border-theme text-fg font-medium
                  transition-all duration-200 hover:opacity-80 active:scale-95"
              >
                <MinusCircle className="w-4 h-4" />
                <span className="text-xs">Abstain</span>
              </button>
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="mt-4 p-3 bg-danger-tint border border-theme rounded-lg text-fg-danger text-xs">
            {error}
          </div>
        )}

        {/* Footer GDPR */}
        <div className="mt-4 pt-4 border-t border-theme">
          <div className="flex items-start gap-2">
            <Shield className="w-3.5 h-3.5 text-fg-muted mt-0.5 shrink-0" />
            <p className="text-xs text-fg-muted leading-relaxed">
              Voting preferences are never accessible to third parties.
              Privacy by Design — GDPR Art. 9.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

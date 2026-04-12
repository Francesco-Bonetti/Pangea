"use client";

import { useState, useCallback, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Proposal, ProposalOption, DistributedResult, IdentityTier, UpsertVoteResult, MyProposalVote } from "@/lib/types";
import { TIER_REQUIREMENTS } from "@/lib/types";
import { useLanguage } from "@/components/core/language-provider";
import TierGate, { useTierGate } from "@/components/ui/TierGate";
import { useIdentityTier } from "@/hooks/useIdentityTier";
import { generateVoteSalt, computeVoteHash } from "@/lib/vote-hash";
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
  EyeOff,
} from "lucide-react";
import Link from "next/link";
import AlertDialog from "@/components/ui/AlertDialog";
import { useToast } from "@/components/ui/Toast";
import CooldownTimer from "@/components/ui/CooldownTimer";

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
  const { t } = useLanguage();
  const [results, setResults] = useState<DistributedResult[]>(initialResults);
  const [legacyResults, setLegacyResults] = useState<{yea: number; nay: number; abstain: number} | null>(null);
  const [hasVoted, setHasVoted] = useState(initialHasVoted);
  const [voteIsSealed, setVoteIsSealed] = useState(false);
  const [existingVoteId, setExistingVoteId] = useState<string | null>(null);
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

  // Identity tier gate (DE-04)
  const { tier: userTier, loading: tierLoading } = useIdentityTier(userId);
  const { checkTier, gateOpen, gateAction, gateRequiredTier, closeGate } = useTierGate(userTier);

  // Cooldown state (DE-11)
  const [cooldownReady, setCooldownReady] = useState(true);

  const isActive = proposal.status === "active";
  const isClosed = proposal.status === "closed";
  const isCuration = proposal.status === "curation";
  const canVote = isActive && !hasVoted && options.length > 0;

  // DE-13: Load existing vote for fluid voting
  useEffect(() => {
    async function loadMyVote() {
      if (!userId || isGuest) return;
      const { data } = await supabase.rpc("get_my_proposal_vote", {
        p_proposal_id: proposal.id,
        p_voter_id: userId,
      });
      if (data) {
        const myVote = data as MyProposalVote;
        if (myVote.has_voted) {
          setHasVoted(true);
          setExistingVoteId(myVote.vote_id ?? null);
          setVoteIsSealed(myVote.is_final ?? false);
          // Restore allocations if any
          if (myVote.allocations && myVote.allocations.length > 0) {
            const restored: Record<string, number> = {};
            myVote.allocations.forEach((a) => {
              restored[a.option_id] = a.allocation_percentage;
            });
            setAllocations(restored);
          }
        }
      }
    }
    loadMyVote();
  }, [userId, proposal.id, isGuest, supabase]);

  // Fetch legacy results for proposals without distributed options
  // DE-15: Only fetch breakdown for closed proposals; active shows turnout only
  useEffect(() => {
    async function fetchLegacyResults() {
      if (options.length > 0) return;
      if (!isActive && !isClosed) return;

      if (isActive) {
        // DE-15: During active phase, don't fetch vote breakdown
        setLegacyResults(null);
        return;
      }

      // Closed: show full breakdown
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

  // ── Positive Friction: tier check + confirm dialog ──
  function requestVote(type: "distributed" | "yea" | "nay" | "abstain") {
    // DE-04: Check identity tier before allowing vote
    if (!checkTier(TIER_REQUIREMENTS.vote, "identity.actionVote")) return;
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
      toast(t("voting.voteRecorded"), "success");
    } catch {
      // Error already handled in the cast functions
      setConfirmDialogOpen(false);
      setPendingVoteType(null);
    } finally {
      setConfirmLoading(false);
    }
  }

  async function executeCastDistributedVote() {
    if (!isValidAllocation) return;
    // DE-13: Allow re-vote if not sealed (fluid voting)
    if (voteIsSealed) {
      setError(t("voting.voteSealed"));
      return;
    }
    setError(null);
    setVoting(true);

    try {
      const { data: weight } = await supabase.rpc("calculate_voting_weight", {
        p_proposal_id: proposal.id,
        p_voter_id: userId,
      });

      // DE-14: Generate salt and compute vote hash client-side
      const salt = generateVoteSalt();
      const allocationsForHash = allocations;
      const voteHash = await computeVoteHash("yea", allocationsForHash, salt);

      const allocJson = JSON.stringify(
        Object.entries(allocations)
          .filter(([, pct]) => pct > 0)
          .map(([optionId, pct]) => ({
            option_id: optionId,
            allocation_percentage: pct,
          }))
      );

      // DE-13: Use UPSERT RPC with hash (DE-14)
      const { data: upsertData, error: upsertError } = await supabase.rpc(
        "upsert_proposal_vote",
        {
          p_proposal_id: proposal.id,
          p_voter_id: userId,
          p_vote_type: "yea",
          p_voting_weight: weight ?? 1,
          p_vote_hash: voteHash,
          p_vote_salt: salt,
          p_allocations: allocJson,
        }
      );

      if (upsertError) throw upsertError;

      const result = upsertData as UpsertVoteResult;
      if (!result.success) {
        throw new Error(result.message || result.error || "Vote failed");
      }

      const voteId = result.vote_id!;
      setExistingVoteId(voteId);

      // Insert new allocations (old ones cleared by RPC on update)
      const allocationRows = Object.entries(allocations)
        .filter(([, pct]) => pct > 0)
        .map(([optionId, pct]) => ({
          vote_id: voteId,
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
      // Show different message for update vs create
      if (result.action === "updated") {
        toast(t("voting.voteUpdated"), "success");
      }
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Error during voting";
      setError(msg);
      toast(msg, "error");
      throw err;
    } finally {
      setVoting(false);
    }
  }

  async function executeCastSimpleVote(voteType: "yea" | "nay" | "abstain") {
    if (!isActive) return;
    // DE-13: Allow re-vote if not sealed
    if (voteIsSealed) {
      setError(t("voting.voteSealed"));
      return;
    }
    setError(null);
    setRevoking(true);

    try {
      const { data: weight } = await supabase.rpc("calculate_voting_weight", {
        p_proposal_id: proposal.id,
        p_voter_id: userId,
      });

      // DE-14: Generate salt and compute vote hash client-side
      const salt = generateVoteSalt();
      const voteHash = await computeVoteHash(voteType, null, salt);

      // DE-13: Use UPSERT RPC with hash (DE-14)
      const { data: upsertData, error: upsertError } = await supabase.rpc(
        "upsert_proposal_vote",
        {
          p_proposal_id: proposal.id,
          p_voter_id: userId,
          p_vote_type: voteType,
          p_voting_weight: weight ?? 1,
          p_vote_hash: voteHash,
          p_vote_salt: salt,
        }
      );

      if (upsertError) throw upsertError;

      const result = upsertData as UpsertVoteResult;
      if (!result.success) {
        throw new Error(result.message || result.error || "Vote failed");
      }

      setExistingVoteId(result.vote_id ?? null);

      // DE-15: For active proposals, only fetch turnout (not breakdown)
      if (isActive) {
        const { data: turnoutData } = await supabase.rpc("get_proposal_turnout", {
          p_proposal_id: proposal.id,
        });
        if (turnoutData) {
          setLegacyResults(null); // Hide breakdown during active phase
        }
      } else {
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
      }

      setHasVoted(true);
      if (result.action === "updated") {
        toast(t("voting.voteUpdated"), "success");
      }
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Error during voting";
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
    yea: t("proposals.inFavor"),
    nay: t("proposals.against"),
    abstain: t("proposals.abstainLabel"),
  };

  return (
    <div className="sticky top-24">
      {/* Positive Friction: Vote Confirmation Dialog */}
      {/* DE-04: Identity tier gate popup */}
      <TierGate
        open={gateOpen}
        onClose={closeGate}
        currentTier={userTier}
        requiredTier={gateRequiredTier}
        actionKey={gateAction}
      />

      <AlertDialog
        open={confirmDialogOpen}
        onClose={cancelVote}
        onConfirm={confirmVote}
        title={t("voting.confirmTitle")}
        description={`${t("voting.confirmDesc")}${
          pendingVoteType ? ` (${voteTypeLabels[pendingVoteType]})` : ""
        }`}
        confirmLabel={t("proposals.confirmMyVote")}
        cancelLabel={t("common.goBack")}
        confirmVariant="primary"
        loading={confirmLoading}
      />

      {/* Header */}
      <div className="card p-5 mb-4">
        <h2 className="text-base font-semibold text-fg mb-1 flex items-center gap-2">
          <Shield className="w-4 h-4 text-fg-primary" />
          {isCuration ? t("proposals.communityReview") : t("proposals.votingBooth")}
        </h2>
        <p className="text-xs text-fg-muted">
          {isCuration
            ? t("proposals.underCommunityReview")
            : t("voting.fluidVoteDesc")}
        </p>
      </div>

      {/* Active delegation warning */}
      {hasActiveDelegation && isActive && !hasVoted && (
        <div className="card p-4 mb-4 bg-warning-tint border-theme">
          <div className="flex gap-3">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" style={{ color: "#d97706" }} />
            <div className="text-xs" style={{ color: "#d97706" }}>
              <p className="font-medium mb-1">{t("proposals.activeDelegation")}{categoryName ? ` — "${categoryName}"` : ""}</p>
              <p className="opacity-80">
                {t("proposals.delegationOverrideWarning")}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Results — DE-15/17: Phase-aware display */}
      {results.length > 0 && (
        <div className="card p-5 mb-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-fg">
              {isActive ? t("voting.turnout") : t("proposals.results")}
            </h3>
            <div className="flex items-center gap-1 text-xs text-fg-muted">
              <Users className="w-3.5 h-3.5" />
              <span>
                {totalVotes} {totalVotes === 1 ? "vote" : "votes"}
              </span>
            </div>
          </div>

          {/* DE-15: During active phase, show turnout only + anti-herding message */}
          {isActive && (
            <div className="flex items-center gap-2 p-3 bg-theme-muted rounded-lg mb-3">
              <EyeOff className="w-4 h-4 text-fg-muted shrink-0" />
              <p className="text-xs text-fg-muted">
                {t("voting.showResultsAfter")}
              </p>
            </div>
          )}

          {/* DE-17: Show full results only when proposal is closed */}
          {!isActive && (
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
          )}
        </div>
      )}

      {/* V3: Blind voting — turnout only for legacy active proposals */}
      {isActive && options.length === 0 && !legacyResults && (
        <div className="card p-5 mb-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-fg">
              {t("voting.turnout")}
            </h3>
          </div>
          <div className="flex items-center gap-2 p-3 bg-theme-muted rounded-lg">
            <EyeOff className="w-4 h-4 text-fg-muted shrink-0" />
            <p className="text-xs text-fg-muted">
              {t("voting.showResultsAfter")}
            </p>
          </div>
        </div>
      )}

      {/* Legacy results (yea/nay/abstain) for proposals without distributed options */}
      {legacyResults && options.length === 0 && (legacyResults.yea > 0 || legacyResults.nay > 0 || legacyResults.abstain > 0) && (
        <div className="card p-5 mb-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-fg">
              {t("proposals.results")}
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
              { label: t("proposals.inFavor"), count: legacyResults.yea, colorVar: "var(--success)" },
              { label: t("proposals.against"), count: legacyResults.nay, colorVar: "var(--destructive)" },
              { label: t("proposals.abstainLabel"), count: legacyResults.abstain, colorVar: "var(--muted-foreground)" },
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
            {voteIsSealed ? (
              <>
                <Lock className="w-10 h-10 text-fg-muted mx-auto mb-3" />
                <p className="text-fg font-semibold mb-1">
                  {t("voting.voteSealed")}
                </p>
                <p className="text-xs text-fg-muted leading-relaxed">
                  {t("voting.sealedDesc")}
                </p>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-10 h-10 text-fg-success mx-auto mb-3" />
                <p className="text-fg font-semibold mb-1">
                  {t("voting.voteRecorded")}
                </p>
                <p className="text-xs text-fg-muted leading-relaxed">
                  {t("voting.fluidVoteDesc")}
                </p>
              </>
            )}
            {/* DE-13: Fluid voting — allow changing vote while active & not sealed */}
            {isActive && !voteIsSealed && (
              <button
                onClick={() => {
                  setHasVoted(false);
                  setError(null);
                }}
                disabled={revoking}
                className="w-full mt-4 btn-secondary flex items-center justify-center gap-2 py-2"
              >
                <RotateCcw className="w-4 h-4" />
                {t("voting.changeVote")}
              </button>
            )}
          </div>
        )}

        {/* Proposal closed */}
        {proposal.status === "closed" && !hasVoted && (
          <div className="text-center py-4">
            <Lock className="w-10 h-10 text-fg-muted mx-auto mb-3" />
            <p className="text-fg-muted font-medium mb-1">{t("proposals.voteConcluded")}</p>
            <p className="text-xs text-fg-muted">
              {t("proposals.votingEnded")}
            </p>
          </div>
        )}

        {/* Community Review — no voting yet */}
        {isCuration && (
          <div className="text-center py-4">
            <Flame className="w-10 h-10 mx-auto mb-3" style={{ color: "#d97706" }} />
            <p className="text-fg font-medium mb-1">{t("proposals.communityReview")}</p>
            <p className="text-xs text-fg-muted leading-relaxed">
              {t("proposals.communityReviewDesc")}
            </p>
          </div>
        )}

        {/* Guest — invite to sign up */}
        {isGuest && isActive && (
          <div className="text-center py-4">
            <LogIn className="w-10 h-10 text-fg-primary mx-auto mb-3" />
            <p className="text-fg font-semibold mb-1">
              {t("proposals.wantToVote")}
            </p>
            <p className="text-xs text-fg-muted leading-relaxed mb-4">
              {t("proposals.signUpToVoteDesc")}
            </p>
            <Link href="/auth" className="btn-primary inline-flex items-center gap-2 text-sm">
              <LogIn className="w-4 h-4" />
              {t("proposals.signUpToVote")}
            </Link>
          </div>
        )}

        {/* DE-11: Cooldown timer for voting */}
        {isActive && !hasVoted && !isGuest && (
          <CooldownTimer
            userId={userId}
            actionType="proposal_vote"
            onStatusChange={setCooldownReady}
          />
        )}

        {/* Can vote — Distributed sliders */}
        {canVote && !isGuest && cooldownReady && (
          <>
            <div className="flex items-center gap-2 mb-4">
              <Sliders className="w-4 h-4 text-fg-primary" />
              <p className="text-sm text-fg font-medium">
                {t("proposals.distributeYourVote")}
              </p>
            </div>
            <p className="text-xs text-fg-muted mb-5">
              {t("proposals.distributeVoteDesc")}
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
              <span className="text-sm font-medium">{t("proposals.totalAllocated")}</span>
              <span className="text-lg font-bold">{totalAllocated}%</span>
            </div>

            {!isValidAllocation && (
              <p className="text-xs text-fg-danger mt-1">
                {t("proposals.allocationMustBe100")}
              </p>
            )}

            {/* Positive friction: opens AlertDialog instead of voting directly */}
            <button
              onClick={() => requestVote("distributed")}
              disabled={!isValidAllocation || voting}
              className="w-full mt-4 btn-primary flex items-center justify-center gap-2 py-3 min-h-[44px]"
            >
              <CheckCircle2 className="w-4 h-4" />
              {t("proposals.confirmAllocation")}
            </button>
          </>
        )}

        {/* No options defined — Fallback to In Favor/Against/Abstain */}
        {isActive && !hasVoted && options.length === 0 && !isGuest && cooldownReady && (
          <div>
            <div className="flex items-center gap-2 mb-4">
              <ThumbsUp className="w-4 h-4 text-fg-primary" />
              <p className="text-sm text-fg font-medium">
                {t("proposals.castYourVote")}
              </p>
            </div>
            <p className="text-xs text-fg-muted mb-5">
              {t("proposals.simpleVoteDesc")}
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
                <span className="text-xs">{t("proposals.inFavor")}</span>
              </button>

              <button
                onClick={() => requestVote("nay")}
                disabled={revoking}
                className="py-3 flex items-center justify-center gap-2 rounded-lg min-h-[44px]
                  bg-danger-tint border border-theme text-fg-danger font-medium
                  transition-all duration-200 hover:opacity-80 active:scale-95"
              >
                <ThumbsDown className="w-4 h-4" />
                <span className="text-xs">{t("proposals.against")}</span>
              </button>

              <button
                onClick={() => requestVote("abstain")}
                disabled={revoking}
                className="py-3 flex items-center justify-center gap-2 rounded-lg min-h-[44px]
                  bg-theme-muted border border-theme text-fg font-medium
                  transition-all duration-200 hover:opacity-80 active:scale-95"
              >
                <MinusCircle className="w-4 h-4" />
                <span className="text-xs">{t("proposals.abstainLabel")}</span>
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
              {t("proposals.privacyByDesign")}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

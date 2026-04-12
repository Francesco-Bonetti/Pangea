"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useLanguage } from "@/components/core/language-provider";
import { formatDate } from "@/lib/utils";
import {
  Vote,
  CheckCircle2,
  Clock,
  ChevronDown,
  ChevronUp,
  Radio,
  Globe,
} from "lucide-react";
import TierBadge from "@/components/governance/TierBadge";
import type { LegislativeTier } from "@/types/core";

interface PollProposal {
  id: string;
  title: string;
  status: string;
  author_id: string;
  created_at: string;
  tier: LegislativeTier | null;
  trial_duration_days: number | null;
  vote_count: number;
  user_has_voted: boolean;
}

interface ContentionPanelProps {
  lawId: string;
  lawTitle: string;
  userId?: string | null;
}

/**
 * T23: Contention panel for a law tree node.
 * Shows proposals targeting this node + approval voting controls.
 * Displayed on /laws/[id] detail page when proposals exist.
 */
export default function ContentionPanel({ lawId, lawTitle, userId }: ContentionPanelProps) {
  const { t } = useLanguage();
  const [pollStatus, setPollStatus] = useState<string>("inactive");
  const [pollEnd, setPollEnd] = useState<string | null>(null);
  const [proposals, setProposals] = useState<PollProposal[]>([]);
  const [currentProposalId, setCurrentProposalId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);
  const [votingFor, setVotingFor] = useState<string | null>(null);

  const fetchPoll = useCallback(async () => {
    const supabase = createClient();
    const { data, error } = await supabase.rpc("get_law_node_poll", { p_law_id: lawId });
    if (error || !data) {
      setLoading(false);
      return;
    }
    setPollStatus(data.poll_status);
    setPollEnd(data.poll_end);
    setCurrentProposalId(data.current_proposal_id);
    setProposals(data.proposals ?? []);
    setLoading(false);
  }, [lawId]);

  useEffect(() => { fetchPoll(); }, [fetchPoll]);

  const handleVote = async (proposalId: string, broadcast: boolean) => {
    if (!userId) return;
    setVotingFor(proposalId);
    const supabase = createClient();
    await supabase.rpc("cast_poll_vote", {
      p_law_id: lawId,
      p_proposal_id: proposalId,
      p_broadcast: broadcast,
    });
    await fetchPoll();
    setVotingFor(null);
  };

  // Don't render if no proposals
  if (loading || proposals.length === 0) return null;

  const isPolling = pollStatus === "polling";
  const isVoting = pollStatus === "voting";
  const hasMultiple = proposals.length > 1;

  return (
    <div
      className="rounded-xl border p-4 mb-4"
      style={{
        borderColor: hasMultiple ? "var(--warning)" : "var(--border)",
        backgroundColor: hasMultiple
          ? "color-mix(in srgb, var(--warning) 5%, transparent)"
          : "var(--card)",
      }}
    >
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between gap-2"
      >
        <div className="flex items-center gap-2 text-sm font-medium">
          <Vote className="w-4 h-4" style={{ color: "var(--primary)" }} />
          <span>
            {proposals.length === 1
              ? t("contention.oneProposal")
              : t("contention.multipleProposals").replace("{count}", String(proposals.length))}
          </span>
          {isPolling && (
            <span
              className="text-xs px-2 py-0.5 rounded-full"
              style={{
                backgroundColor: "color-mix(in srgb, var(--warning) 15%, transparent)",
                color: "var(--warning)",
              }}
            >
              <Clock className="w-3 h-3 inline mr-1" />
              {t("contention.pollActive")}
            </span>
          )}
          {isVoting && (
            <span
              className="text-xs px-2 py-0.5 rounded-full"
              style={{
                backgroundColor: "color-mix(in srgb, var(--success) 15%, transparent)",
                color: "var(--success)",
              }}
            >
              {t("contention.votingInProgress")}
            </span>
          )}
        </div>
        {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </button>

      {/* Info text */}
      {!hasMultiple && !expanded && (
        <p className="text-xs mt-1" style={{ color: "var(--muted-foreground)" }}>
          {t("contention.singleProposalHint")}
        </p>
      )}

      {/* Expanded: proposal list + voting */}
      {expanded && (
        <div className="mt-4 space-y-3">
          {/* Poll deadline */}
          {isPolling && pollEnd && (
            <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>
              {t("contention.pollEnds")} {formatDate(pollEnd)}
            </p>
          )}

          {/* Explanation for citizens */}
          {hasMultiple && isPolling && (
            <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>
              {t("contention.approvalVotingExplainer")}
            </p>
          )}

          {/* Proposal list */}
          {proposals.map((p) => {
            const isCurrent = p.id === currentProposalId;
            return (
              <div
                key={p.id}
                className="flex items-center gap-3 p-3 rounded-lg border"
                style={{
                  borderColor: isCurrent ? "var(--primary)" : "var(--border)",
                  backgroundColor: isCurrent
                    ? "color-mix(in srgb, var(--primary) 8%, transparent)"
                    : "transparent",
                }}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium truncate">{p.title}</span>
                    {p.tier && p.tier !== "ordinary" && <TierBadge tier={p.tier} />}
                    {isCurrent && (
                      <span className="text-xs px-1.5 py-0.5 rounded bg-primary/20 text-primary">
                        {t("contention.currentlyVoting")}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-xs" style={{ color: "var(--muted-foreground)" }}>
                    <span>{formatDate(p.created_at)}</span>
                    {isPolling && <span>{p.vote_count} {t("contention.approvals")}</span>}
                  </div>
                </div>

                {/* Vote buttons (only during polling) */}
                {isPolling && userId && !p.user_has_voted && (
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => handleVote(p.id, false)}
                      disabled={votingFor === p.id}
                      className="flex items-center gap-1 px-2 py-1 text-xs rounded-md border hover:bg-primary/10 transition-colors"
                      style={{ borderColor: "var(--border)" }}
                      title={t("contention.voteHere")}
                    >
                      <Radio className="w-3 h-3" />
                      {t("contention.voteHereShort")}
                    </button>
                    <button
                      onClick={() => handleVote(p.id, true)}
                      disabled={votingFor === p.id}
                      className="flex items-center gap-1 px-2 py-1 text-xs rounded-md border hover:bg-primary/10 transition-colors"
                      style={{ borderColor: "var(--border)" }}
                      title={t("contention.voteEverywhere")}
                    >
                      <Globe className="w-3 h-3" />
                      {t("contention.voteEverywhereShort")}
                    </button>
                  </div>
                )}
                {isPolling && p.user_has_voted && (
                  <CheckCircle2 className="w-4 h-4 shrink-0" style={{ color: "var(--success)" }} />
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

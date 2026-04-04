"use client";

import Link from "next/link";
import type { ProposalWithResults } from "@/lib/types";
import { calcPercentage, getTotalVotes, formatDate } from "@/lib/utils";
import { Clock, CheckCircle2, FileText, Users, ChevronRight, Flame, Edit3, Trash2, XCircle } from "lucide-react";

interface ProposalCardProps {
  proposal: ProposalWithResults;
  curationThreshold?: number;
}

export default function ProposalCard({ proposal, curationThreshold = 2 }: ProposalCardProps) {
  const results = proposal.results ?? { yea_count: 0, nay_count: 0, abstain_count: 0 };
  const total = getTotalVotes(results);
  const yeaPercent = calcPercentage(results.yea_count, total);
  const nayPercent = calcPercentage(results.nay_count, total);
  const abstainPercent = calcPercentage(results.abstain_count, total);

  const statusConfig: Record<string, { icon: typeof Clock; label: string; className: string }> = {
    draft: {
      icon: FileText,
      label: "Draft",
      className: "status-draft",
    },
    curation: {
      icon: Flame,
      label: "Community Review",
      className: "status-curation",
    },
    active: {
      icon: Clock,
      label: "Active Vote",
      className: "status-active",
    },
    closed: {
      icon: CheckCircle2,
      label: "Concluded",
      className: "status-closed",
    },
    repealed: {
      icon: XCircle,
      label: "Repealed",
      className: "status-repealed",
    },
  };

  const config = statusConfig[proposal.status] ?? statusConfig.draft;
  const { icon: StatusIcon, label: statusLabel, className: statusClass } = config;

  return (
    <Link
      href={`/proposals/${proposal.id}`}
      className="card p-6 transition-all duration-200 group block overflow-hidden hover:shadow-md"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-4 overflow-hidden">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <span className={`${statusClass} shrink-0`}>
              <StatusIcon className="w-3 h-3 inline mr-1" />
              {statusLabel}
            </span>
            {proposal.proposal_type === "amendment" && (
              <span
                className="text-xs px-2 py-0.5 rounded-full flex items-center gap-1 shrink-0"
                style={{
                  color: "#7c3aed",
                  backgroundColor: "color-mix(in srgb, #7c3aed 12%, transparent)",
                }}
              >
                <Edit3 className="w-3 h-3" /> Amendment
              </span>
            )}
            {proposal.proposal_type === "repeal" && (
              <span
                className="text-xs px-2 py-0.5 rounded-full flex items-center gap-1 shrink-0"
                style={{
                  color: "var(--destructive)",
                  backgroundColor: "color-mix(in srgb, var(--destructive) 12%, transparent)",
                }}
              >
                <Trash2 className="w-3 h-3" /> Repeal
              </span>
            )}
            {proposal.has_voted && (
              <span
                className="text-xs font-medium shrink-0"
                style={{ color: "var(--success)" }}
              >
                ✓ Voted
              </span>
            )}
          </div>
          <h3
            className="font-bold text-lg leading-snug truncate"
            style={{ color: "var(--foreground)" }}
          >
            {proposal.title}
          </h3>
        </div>
        <ChevronRight
          className="w-5 h-5 shrink-0 mt-1 transition-colors"
          style={{ color: "var(--muted-foreground)" }}
        />
      </div>

      {/* Preview */}
      <p
        className="text-base line-clamp-2 mb-5"
        style={{ color: "var(--muted-foreground)" }}
      >
        {proposal.content}
      </p>

      {/* Curation: signal progress bar */}
      {proposal.status === "curation" && typeof proposal.signal_count === "number" && (
        <div className="mb-4">
          <div className="flex justify-between text-xs mb-1 overflow-hidden gap-2">
            <span className="flex items-center gap-1 min-w-0" style={{ color: "var(--muted-foreground)" }}>
              <Flame className="w-3 h-3 shrink-0" style={{ color: "#d97706" }} />
              <span className="truncate">Signals</span>
            </span>
            <span className="shrink-0" style={{ color: "var(--muted-foreground)" }}>
              {proposal.signal_count} / {curationThreshold}
            </span>
          </div>
          <div className="rounded-full h-2.5" style={{ backgroundColor: "var(--muted)" }}>
            <div
              className="h-2.5 rounded-full transition-all duration-500"
              style={{
                width: `${Math.min((proposal.signal_count / curationThreshold) * 100, 100)}%`,
                backgroundColor: "#d97706",
              }}
            />
          </div>
        </div>
      )}

      {/* Stacked vote progress bar (for active/closed proposals with legacy system) */}
      {(proposal.status === "active" || proposal.status === "closed") && total > 0 && (
        <div className="mb-4">
          {/* Stacked horizontal bar */}
          <div
            className="w-full h-3 rounded-full overflow-hidden flex"
            style={{ backgroundColor: "var(--muted)" }}
          >
            {yeaPercent > 0 && (
              <div
                className="h-full transition-all duration-700"
                style={{ width: `${yeaPercent}%`, backgroundColor: "var(--success)" }}
              />
            )}
            {nayPercent > 0 && (
              <div
                className="h-full transition-all duration-700"
                style={{ width: `${nayPercent}%`, backgroundColor: "var(--destructive)" }}
              />
            )}
            {abstainPercent > 0 && (
              <div
                className="h-full transition-all duration-700"
                style={{ width: `${abstainPercent}%`, backgroundColor: "var(--muted-foreground)" }}
              />
            )}
          </div>
          {/* Legend row */}
          <div className="flex items-center gap-4 mt-2 text-xs flex-wrap">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: "var(--success)" }} />
              <span style={{ color: "var(--muted-foreground)" }}>In Favor {yeaPercent}%</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: "var(--destructive)" }} />
              <span style={{ color: "var(--muted-foreground)" }}>Against {nayPercent}%</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: "var(--muted-foreground)" }} />
              <span style={{ color: "var(--muted-foreground)" }}>Abstain {abstainPercent}%</span>
            </span>
          </div>
        </div>
      )}

      {/* Distributed results (Plural Voting) */}
      {(proposal.status === "active" || proposal.status === "closed") &&
        proposal.distributed_results &&
        proposal.distributed_results.length > 0 && (
          <div className="space-y-2 mb-4">
            {proposal.distributed_results.slice(0, 3).map((r) => {
              const maxScore = Math.max(
                ...proposal.distributed_results!.map((dr) => dr.weighted_score),
                1
              );
              const barWidth = (r.weighted_score / maxScore) * 100;
              return (
                <div key={r.option_id} className="flex items-center gap-2">
                  <span
                    className="text-xs w-28 shrink-0 truncate"
                    style={{ color: "var(--primary)" }}
                  >
                    {r.option_title}
                  </span>
                  <div className="flex-1 rounded-full h-2" style={{ backgroundColor: "var(--muted)" }}>
                    <div
                      className="h-2 rounded-full transition-all duration-500"
                      style={{ width: `${barWidth}%`, backgroundColor: "var(--primary)" }}
                    />
                  </div>
                  <span
                    className="text-xs w-12 text-right"
                    style={{ color: "var(--muted-foreground)" }}
                  >
                    {r.weighted_score.toFixed(1)}
                  </span>
                </div>
              );
            })}
          </div>
        )}

      {/* Footer */}
      <div
        className="flex items-center justify-between pt-4 overflow-hidden gap-2"
        style={{ borderTop: "1px solid var(--border)" }}
      >
        <div className="flex items-center gap-1 text-xs min-w-0" style={{ color: "var(--muted-foreground)" }}>
          {proposal.status === "curation" ? (
            <>
              <Flame className="w-3 h-3 shrink-0" />
              <span className="truncate">{proposal.signal_count ?? 0} signals</span>
            </>
          ) : (
            <>
              <Users className="w-3 h-3 shrink-0" />
              <span className="truncate">{total} {total === 1 ? "vote" : "votes"}</span>
            </>
          )}
        </div>
        <span className="text-xs shrink-0" style={{ color: "var(--muted-foreground)" }}>
          {formatDate(proposal.created_at)}
        </span>
      </div>
    </Link>
  );
}

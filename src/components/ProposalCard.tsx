"use client";

import Link from "next/link";
import type { ProposalWithResults } from "@/lib/types";
import { calcPercentage, getTotalVotes, formatDate } from "@/lib/utils";
import { Clock, CheckCircle2, FileText, Users, ChevronRight, Flame } from "lucide-react";

interface ProposalCardProps {
  proposal: ProposalWithResults;
}

export default function ProposalCard({ proposal }: ProposalCardProps) {
  const results = proposal.results ?? { yea_count: 0, nay_count: 0, abstain_count: 0 };
  const total = getTotalVotes(results);
  const yeaPercent = calcPercentage(results.yea_count, total);
  const nayPercent = calcPercentage(results.nay_count, total);
  const abstainPercent = calcPercentage(results.abstain_count, total);

  const statusConfig: Record<string, { icon: typeof Clock; label: string; className: string }> = {
    draft: {
      icon: FileText,
      label: "Bozza",
      className: "status-draft",
    },
    curation: {
      icon: Flame,
      label: "In Curatela",
      className: "status-curation",
    },
    active: {
      icon: Clock,
      label: "In Delibera",
      className: "status-active",
    },
    closed: {
      icon: CheckCircle2,
      label: "Deliberata",
      className: "status-closed",
    },
  };

  const config = statusConfig[proposal.status] ?? statusConfig.draft;
  const { icon: StatusIcon, label: statusLabel, className: statusClass } = config;

  return (
    <Link
      href={`/proposals/${proposal.id}`}
      className="card p-6 hover:border-slate-600 hover:bg-slate-800/70 transition-all duration-200 group block"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <span className={statusClass}>
              <StatusIcon className="w-3 h-3 inline mr-1" />
              {statusLabel}
            </span>
            {proposal.has_voted && (
              <span className="text-xs text-pangea-400 font-medium">
                ✓ Hai votato
              </span>
            )}
          </div>
          <h3 className="font-semibold text-slate-100 text-lg leading-snug group-hover:text-white truncate">
            {proposal.title}
          </h3>
        </div>
        <ChevronRight className="w-5 h-5 text-slate-600 group-hover:text-slate-400 shrink-0 mt-1 transition-colors" />
      </div>

      {/* Preview */}
      <p className="text-sm text-slate-400 line-clamp-2 mb-5">
        {proposal.content}
      </p>

      {/* Curation: signal progress bar */}
      {proposal.status === "curation" && typeof proposal.signal_count === "number" && (
        <div className="mb-4">
          <div className="flex justify-between text-xs text-slate-400 mb-1">
            <span className="flex items-center gap-1">
              <Flame className="w-3 h-3 text-amber-400" />
              Segnali
            </span>
            <span>{proposal.signal_count} / 100</span>
          </div>
          <div className="bg-slate-700 rounded-full h-2">
            <div
              className="bg-amber-500 h-2 rounded-full transition-all duration-500"
              style={{ width: `${Math.min((proposal.signal_count / 100) * 100, 100)}%` }}
            />
          </div>
        </div>
      )}

      {/* Vote bars (solo per proposte active/closed con il sistema legacy) */}
      {(proposal.status === "active" || proposal.status === "closed") && total > 0 && (
        <div className="space-y-2 mb-4">
          <div className="flex items-center gap-2">
            <span className="text-xs text-green-400 w-20 shrink-0">Favorevoli</span>
            <div className="flex-1 bg-slate-700 rounded-full h-2">
              <div
                className="bg-green-500 h-2 rounded-full transition-all duration-500"
                style={{ width: `${yeaPercent}%` }}
              />
            </div>
            <span className="text-xs text-slate-400 w-8 text-right">{yeaPercent}%</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-red-400 w-20 shrink-0">Contrari</span>
            <div className="flex-1 bg-slate-700 rounded-full h-2">
              <div
                className="bg-red-500 h-2 rounded-full transition-all duration-500"
                style={{ width: `${nayPercent}%` }}
              />
            </div>
            <span className="text-xs text-slate-400 w-8 text-right">{nayPercent}%</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 w-20 shrink-0">Astenuti</span>
            <div className="flex-1 bg-slate-700 rounded-full h-2">
              <div
                className="bg-slate-500 h-2 rounded-full transition-all duration-500"
                style={{ width: `${abstainPercent}%` }}
              />
            </div>
            <span className="text-xs text-slate-400 w-8 text-right">{abstainPercent}%</span>
          </div>
        </div>
      )}

      {/* Distributed results (Voto Multiplo) */}
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
                  <span className="text-xs text-pangea-300 w-28 shrink-0 truncate">
                    {r.option_title}
                  </span>
                  <div className="flex-1 bg-slate-700 rounded-full h-2">
                    <div
                      className="bg-pangea-500 h-2 rounded-full transition-all duration-500"
                      style={{ width: `${barWidth}%` }}
                    />
                  </div>
                  <span className="text-xs text-slate-400 w-12 text-right">
                    {r.weighted_score.toFixed(1)}
                  </span>
                </div>
              );
            })}
          </div>
        )}

      {/* Footer */}
      <div className="flex items-center justify-between pt-4 border-t border-slate-700/50">
        <div className="flex items-center gap-1 text-xs text-slate-500">
          {proposal.status === "curation" ? (
            <>
              <Flame className="w-3 h-3" />
              <span>{proposal.signal_count ?? 0} segnali</span>
            </>
          ) : (
            <>
              <Users className="w-3 h-3" />
              <span>{total} {total === 1 ? "voto" : "voti"}</span>
            </>
          )}
        </div>
        <span className="text-xs text-slate-500">
          {formatDate(proposal.created_at)}
        </span>
      </div>
    </Link>
  );
}

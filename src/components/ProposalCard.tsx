"use client";

import Link from "next/link";
import type { ProposalWithResults } from "@/lib/types";
import { calcPercentage, getTotalVotes, formatDate } from "@/lib/utils";
import { Clock, CheckCircle2, FileText, Users, ChevronRight } from "lucide-react";

interface ProposalCardProps {
  proposal: ProposalWithResults;
}

export default function ProposalCard({ proposal }: ProposalCardProps) {
  const results = proposal.results ?? { yea_count: 0, nay_count: 0, abstain_count: 0 };
  const total = getTotalVotes(results);
  const yeaPercent = calcPercentage(results.yea_count, total);
  const nayPercent = calcPercentage(results.nay_count, total);
  const abstainPercent = calcPercentage(results.abstain_count, total);

  const statusConfig = {
    draft: {
      icon: FileText,
      label: "Bozza",
      className: "status-draft",
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

  const { icon: StatusIcon, label: statusLabel, className: statusClass } =
    statusConfig[proposal.status];

  return (
    <Link
      href={`/proposals/${proposal.id}`}
      className="card p-6 hover:border-slate-600 hover:bg-slate-800/70 transition-all duration-200 group block"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
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

      {/* Vote bars (solo per proposte con voti) */}
      {proposal.status !== "draft" && (
        <div className="space-y-2 mb-4">
          {/* Favorevoli */}
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
          {/* Contrari */}
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
          {/* Astenuti */}
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

      {/* Footer */}
      <div className="flex items-center justify-between pt-4 border-t border-slate-700/50">
        <div className="flex items-center gap-1 text-xs text-slate-500">
          <Users className="w-3 h-3" />
          <span>{total} {total === 1 ? "voto" : "voti"}</span>
        </div>
        <span className="text-xs text-slate-500">
          {formatDate(proposal.created_at)}
        </span>
      </div>
    </Link>
  );
}

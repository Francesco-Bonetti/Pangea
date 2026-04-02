"use client";

import { useState } from "react";
import { Clock, TrendingUp, CheckCircle2, FileText, ChevronDown, ChevronRight } from "lucide-react";
import ProposalCard from "@/components/ProposalCard";
import type { ProposalWithResults } from "@/lib/types";

const iconMap = {
  clock: Clock,
  trending: TrendingUp,
  check: CheckCircle2,
  file: FileText,
};

const colorMap = {
  pangea: {
    icon: "text-pangea-400",
    bg: "bg-pangea-900/10 border-pangea-800/30",
    bgHover: "hover:border-pangea-700/50",
    count: "bg-pangea-900/30 text-pangea-300",
  },
  amber: {
    icon: "text-amber-400",
    bg: "bg-amber-900/10 border-amber-800/30",
    bgHover: "hover:border-amber-700/50",
    count: "bg-amber-900/30 text-amber-300",
  },
  green: {
    icon: "text-green-400",
    bg: "bg-green-900/10 border-green-800/30",
    bgHover: "hover:border-green-700/50",
    count: "bg-green-900/30 text-green-300",
  },
  slate: {
    icon: "text-slate-400",
    bg: "bg-slate-800/30 border-slate-700/30",
    bgHover: "hover:border-slate-600/50",
    count: "bg-slate-700/50 text-slate-300",
  },
};

interface SectionBlockProps {
  id: string;
  title: string;
  subtitle: string;
  icon: keyof typeof iconMap;
  color: keyof typeof colorMap;
  proposals: ProposalWithResults[];
  defaultOpen: boolean;
  emptyText: string;
}

export default function SectionBlock({
  id,
  title,
  subtitle,
  icon,
  color,
  proposals,
  defaultOpen,
  emptyText,
}: SectionBlockProps) {
  const [open, setOpen] = useState(defaultOpen);
  const Icon = iconMap[icon];
  const colors = colorMap[color];

  return (
    <section id={id}>
      {/* Header cliccabile */}
      <button
        onClick={() => setOpen(!open)}
        className={`w-full card border ${colors.bg} ${colors.bgHover} p-4 flex items-center gap-3 transition-all duration-200 ${
          open ? "rounded-b-none border-b-0" : ""
        }`}
      >
        <div className="shrink-0">
          {open ? (
            <ChevronDown className={`w-5 h-5 ${colors.icon}`} />
          ) : (
            <ChevronRight className={`w-5 h-5 ${colors.icon}`} />
          )}
        </div>
        <Icon className={`w-5 h-5 ${colors.icon} shrink-0`} />
        <div className="flex-1 text-left">
          <span className="text-base font-semibold text-slate-100">{title}</span>
          <span className="text-xs text-slate-500 ml-2">{subtitle}</span>
        </div>
        <span className={`text-sm font-bold px-2.5 py-0.5 rounded-full ${colors.count}`}>
          {proposals.length}
        </span>
      </button>

      {/* Contenuto espanso */}
      {open && (
        <div className={`card border ${colors.bg} rounded-t-none border-t border-slate-700/20 p-4`}>
          {proposals.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {proposals.map((proposal) => (
                <ProposalCard key={proposal.id} proposal={proposal} />
              ))}
            </div>
          ) : (
            <p className="text-center text-slate-500 text-sm py-4">{emptyText}</p>
          )}
        </div>
      )}
    </section>
  );
}

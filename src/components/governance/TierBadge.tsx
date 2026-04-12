"use client";

import { Scale, Cpu, Monitor, FileText } from "lucide-react";
import { useLanguage } from "@/components/core/language-provider";

export type LegislativeTier = "constitutional" | "core" | "platform" | "ordinary";

const TIER_CONFIG: Record<LegislativeTier, {
  labelKey: string;
  descKey: string;
  approval: number;
  quorum: number;
  doubleVote: boolean;
  icon: typeof Scale;
  color: string;
  bg: string;
  border: string;
}> = {
  constitutional: {
    labelKey: "laws.tier.constitutional",
    descKey: "laws.tier.constitutionalDesc",
    approval: 90,
    quorum: 60,
    doubleVote: false,
    icon: Scale,
    color: "text-amber-400",
    bg: "bg-amber-900/20",
    border: "border-amber-700/50",
  },
  core: {
    labelKey: "laws.tier.core",
    descKey: "laws.tier.coreDesc",
    approval: 80,
    quorum: 50,
    doubleVote: true,
    icon: Cpu,
    color: "text-purple-400",
    bg: "bg-purple-900/20",
    border: "border-purple-700/50",
  },
  platform: {
    labelKey: "laws.tier.platform",
    descKey: "laws.tier.platformDesc",
    approval: 66,
    quorum: 40,
    doubleVote: true,
    icon: Monitor,
    color: "text-blue-400",
    bg: "bg-blue-900/20",
    border: "border-blue-700/50",
  },
  ordinary: {
    labelKey: "laws.tier.ordinary",
    descKey: "laws.tier.ordinaryDesc",
    approval: 51,
    quorum: 30,
    doubleVote: false,
    icon: FileText,
    color: "text-fg-muted",
    bg: "bg-theme-card",
    border: "border-theme/30",
  },
};

interface TierBadgeProps {
  tier: LegislativeTier;
  showThresholds?: boolean;
  className?: string;
}

export default function TierBadge({ tier, showThresholds = false, className = "" }: TierBadgeProps) {
  const { t } = useLanguage();
  const config = TIER_CONFIG[tier];
  const Icon = config.icon;

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${config.bg} ${config.color} border ${config.border} ${className}`}
      title={t(config.descKey)}
    >
      <Icon className="w-3 h-3" />
      {t(config.labelKey)}
      {showThresholds && (
        <span className="ml-1 opacity-75">
          ({config.approval}%/{config.quorum}%{config.doubleVote ? " 2×" : ""})
        </span>
      )}
    </span>
  );
}

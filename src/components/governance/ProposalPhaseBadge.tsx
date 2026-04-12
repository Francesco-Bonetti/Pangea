"use client";

import { useLanguage } from "@/components/core/language-provider";
import { FlaskConical, Vote, Clock } from "lucide-react";

interface ProposalPhaseBadgeProps {
  status: string;
  tier?: string | null;
  trialEndsAt?: string | null;
  className?: string;
}

/**
 * T23: Compact badge showing the current phase of a double-vote proposal.
 * For single-vote proposals (constitutional/ordinary), renders nothing extra.
 * For double-vote proposals (core/platform), shows: "1st Vote" | "Trial (Xd)" | "2nd Vote"
 */
export default function ProposalPhaseBadge({
  status,
  tier,
  trialEndsAt,
  className = "",
}: ProposalPhaseBadgeProps) {
  const { t } = useLanguage();
  const isDouble = tier === "core" || tier === "platform";

  // Only show for double-vote proposals in relevant phases
  if (!isDouble) return null;
  if (!["active", "trial", "second_vote"].includes(status)) return null;

  // Calculate days remaining for trial
  let trialDaysLeft: number | null = null;
  if (status === "trial" && trialEndsAt) {
    const diff = new Date(trialEndsAt).getTime() - Date.now();
    trialDaysLeft = Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  }

  const phaseConfig: Record<string, {
    icon: typeof Clock;
    labelKey: string;
    suffix?: string;
    color: string;
    bg: string;
  }> = {
    active: {
      icon: Vote,
      labelKey: "proposals.phase.firstVote",
      color: "#f59e0b",
      bg: "color-mix(in srgb, #f59e0b 12%, transparent)",
    },
    trial: {
      icon: FlaskConical,
      labelKey: "proposals.phase.trial",
      suffix: trialDaysLeft !== null ? ` (${trialDaysLeft}d)` : "",
      color: "#8b5cf6",
      bg: "color-mix(in srgb, #8b5cf6 12%, transparent)",
    },
    second_vote: {
      icon: Vote,
      labelKey: "proposals.phase.secondVote",
      color: "#3b82f6",
      bg: "color-mix(in srgb, #3b82f6 12%, transparent)",
    },
  };

  const config = phaseConfig[status];
  if (!config) return null;

  const Icon = config.icon;

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${className}`}
      style={{ color: config.color, backgroundColor: config.bg }}
    >
      <Icon className="w-3 h-3" />
      {t(config.labelKey)}{config.suffix ?? ""}
    </span>
  );
}

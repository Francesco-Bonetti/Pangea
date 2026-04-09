"use client";

import { useLanguage } from "@/components/language-provider";
import type { StakingInfo as StakingInfoType } from "@/lib/types";
import { formatCooldown } from "@/hooks/useCooldown";
import {
  Flame,
  Gift,
  TrendingUp,
  Clock,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";

interface StakingInfoProps {
  stakingInfo: StakingInfoType;
  compact?: boolean;
}

/**
 * StakingInfo (DE-20)
 * Visual feedback for Quadratic Staking — shows strike penalty,
 * cooldown days, and free pass status.
 */
export default function StakingInfo({
  stakingInfo,
  compact = false,
}: StakingInfoProps) {
  const { t } = useLanguage();

  if (stakingInfo.type === "none") return null;

  // DE-18: First law free
  if (stakingInfo.type === "first_free") {
    if (compact) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-success-tint text-xs font-medium text-fg-success">
          <Gift className="w-3 h-3" />
          {t("staking.firstFree")}
        </span>
      );
    }

    return (
      <div className="card p-4 mb-4 bg-success-tint border-green-800/30">
        <div className="flex items-center gap-2 mb-2">
          <Gift className="w-4 h-4 text-fg-success" />
          <h3 className="text-sm font-semibold text-fg-success">
            {t("staking.firstFreeTitle")}
          </h3>
        </div>
        <p className="text-xs text-fg-muted leading-relaxed">
          {t("staking.firstFreeDesc")}
        </p>
        <p className="text-xs text-fg-muted leading-relaxed mt-2 italic">
          {t("staking.firstFreeExample")}
        </p>
      </div>
    );
  }

  // DE-20: Quadratic Staking penalty
  if (stakingInfo.type === "quadratic_staking") {
    const days = stakingInfo.total_cooldown_days ?? 0;
    const strikes = stakingInfo.effective_strikes ?? 0;
    const baseDays = stakingInfo.base_days ?? 7;
    const mult = stakingInfo.strike_multiplier ?? 1;

    if (compact) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-warning-tint text-xs font-medium"
          style={{ color: "#d97706" }}>
          <Flame className="w-3 h-3" />
          {t("staking.penaltyCompact")
            .replace("{days}", String(days))
            .replace("{strikes}", String(strikes))}
        </span>
      );
    }

    return (
      <div className="card p-4 mb-4 bg-warning-tint border-amber-800/30">
        <div className="flex items-center gap-2 mb-3">
          <Flame className="w-4 h-4" style={{ color: "#d97706" }} />
          <h3 className="text-sm font-semibold text-fg">
            {t("staking.penaltyTitle")}
          </h3>
        </div>

        {/* Formula visualization */}
        <div className="bg-theme-bg/50 rounded-lg p-3 mb-3">
          <div className="flex items-center justify-center gap-2 text-sm font-mono">
            <span className="text-fg-muted">{baseDays}d</span>
            <span className="text-fg-muted">×</span>
            <span style={{ color: "#d97706" }}>2^{strikes}</span>
            <span className="text-fg-muted">=</span>
            <span className="text-lg font-bold text-fg">
              {days} {t("staking.days")}
            </span>
          </div>
        </div>

        {/* Strike meter */}
        <div className="mb-3">
          <div className="flex items-center justify-between text-xs text-fg-muted mb-1">
            <span>{t("staking.strikeLevel")}</span>
            <span>{strikes}/8</span>
          </div>
          <div className="bg-theme-bg/50 rounded-full h-2 overflow-hidden">
            <div
              className="h-2 rounded-full transition-all"
              style={{
                width: `${(strikes / 8) * 100}%`,
                backgroundColor:
                  strikes <= 2 ? "#eab308" : strikes <= 5 ? "#f97316" : "#ef4444",
              }}
            />
          </div>
        </div>

        <div className="space-y-2 text-xs text-fg-muted">
          <div className="flex items-start gap-2">
            <Clock className="w-3.5 h-3.5 shrink-0 mt-0.5" />
            <span>
              {t("staking.cooldownExplain")
                .replace("{days}", String(days))
                .replace("{formatted}", formatCooldown(days * 86400))}
            </span>
          </div>
          <div className="flex items-start gap-2">
            <TrendingUp className="w-3.5 h-3.5 shrink-0 mt-0.5" />
            <span>{t("staking.decayExplain")}</span>
          </div>
          <div className="flex items-start gap-2">
            <CheckCircle2 className="w-3.5 h-3.5 shrink-0 mt-0.5" />
            <span>{t("staking.resetExplain")}</span>
          </div>
        </div>

        {/* Info box with practical example */}
        <div className="bg-theme-bg/50 rounded-lg p-3 mt-3">
          <p className="text-xs text-fg-muted italic leading-relaxed">
            {t("staking.penaltyExample")}
          </p>
        </div>

        {/* Incubator hint */}
        <div className="flex items-start gap-2 mt-3 text-xs">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-fg-primary" />
          <span className="text-fg-muted">
            {t("staking.incubatorHint")}
          </span>
        </div>
      </div>
    );
  }

  return null;
}

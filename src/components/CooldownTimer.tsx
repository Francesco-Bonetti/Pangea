"use client";

import { useLanguage } from "@/components/language-provider";
import { useCooldown, formatCooldown } from "@/hooks/useCooldown";
import { useIdentityTier } from "@/hooks/useIdentityTier";
import type { CooldownActionType } from "@/lib/types";
import { Timer, ShieldCheck, Clock, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import StakingInfo from "@/components/StakingInfo";

interface CooldownTimerProps {
  userId: string | null;
  actionType: CooldownActionType;
  /** Render children only when action is allowed */
  children?: React.ReactNode;
  /** Callback when cooldown state changes */
  onStatusChange?: (canProceed: boolean) => void;
  /** Compact mode — inline badge instead of full card */
  compact?: boolean;
}

/**
 * CooldownTimer (DE-11)
 * Shows countdown + CTA to upgrade identity tier for shorter cooldowns.
 * Wraps useCooldown hook with visual feedback.
 */
export default function CooldownTimer({
  userId,
  actionType,
  children,
  onStatusChange,
  compact = false,
}: CooldownTimerProps) {
  const { t } = useLanguage();
  const { canProceed, waitSeconds, loading, accessCheck } = useCooldown(userId, actionType);
  const { tier } = useIdentityTier(userId);

  // Extract staking info from cooldown result
  const stakingInfo = accessCheck?.cooldown?.staking_info;

  // Notify parent of status changes
  if (onStatusChange) {
    onStatusChange(canProceed);
  }

  // Loading state
  if (loading) {
    if (compact) {
      return (
        <span className="inline-flex items-center gap-1 text-xs text-fg-muted">
          <Clock className="w-3 h-3 animate-pulse" />
        </span>
      );
    }
    return null;
  }

  // Can proceed — show children or nothing
  if (canProceed) {
    if (compact) {
      return <>{children}</>;
    }
    return <>{children}</>;
  }

  // Blocked — show timer
  const formattedTime = formatCooldown(waitSeconds);
  const showUpgradeCTA = tier !== null && tier < 2;

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-warning-tint text-xs font-medium"
          style={{ color: "#d97706" }}>
          <Timer className="w-3 h-3" />
          {t("cooldown.waitSeconds").replace("{time}", formattedTime)}
        </span>
        {showUpgradeCTA && (
          <Link
            href="/settings?tab=identity"
            className="text-xs text-fg-primary hover:underline"
          >
            {t("cooldown.reduceCTA")}
          </Link>
        )}
      </div>
    );
  }

  // Full card mode
  return (
    <div className="card p-5 mb-4">
      {/* Timer header */}
      <div className="flex items-center gap-2 mb-3">
        <Timer className="w-4 h-4" style={{ color: "#d97706" }} />
        <h3 className="text-sm font-semibold text-fg">
          {t("cooldown.actionBlocked")}
        </h3>
      </div>

      {/* Countdown */}
      <div className="flex items-center justify-center py-4">
        <div className="text-center">
          <div className="text-3xl font-bold text-fg tabular-nums">
            {formattedTime}
          </div>
          <p className="text-xs text-fg-muted mt-1">
            {t("cooldown.waitMessage")}
          </p>
        </div>
      </div>

      {/* Progress bar (visual only) */}
      <div className="bg-theme-muted rounded-full h-1.5 mb-4 overflow-hidden">
        <div
          className="h-1.5 rounded-full transition-all duration-1000"
          style={{
            width: `${Math.max(5, 100 - (waitSeconds / 300) * 100)}%`,
            backgroundColor: "#d97706",
          }}
        />
      </div>

      {/* Info box with practical example */}
      <div className="bg-theme-muted rounded-lg p-3 mb-3">
        <p className="text-xs text-fg-muted leading-relaxed">
          {t("cooldown.actionBlockedDesc")}
        </p>
        <p className="text-xs text-fg-muted leading-relaxed mt-2 italic">
          {t("cooldown.actionBlockedExample")}
        </p>
      </div>

      {/* Staking info (DE-20) */}
      {stakingInfo && stakingInfo.type !== "none" && (
        <div className="mb-3">
          <StakingInfo stakingInfo={stakingInfo} />
        </div>
      )}

      {/* Upgrade CTA for low-tier users */}
      {showUpgradeCTA && (
        <Link
          href="/settings?tab=identity"
          className="flex items-center gap-2 w-full justify-center py-2.5 rounded-lg
            bg-primary-tint text-fg-primary text-sm font-medium
            transition-all duration-200 hover:opacity-80 active:scale-[0.98]"
        >
          <ShieldCheck className="w-4 h-4" />
          {t("cooldown.reduceCTA")}
        </Link>
      )}

      {/* Already high tier — show bonus message */}
      {tier !== null && tier >= 2 && (
        <div className="flex items-center gap-2 text-xs text-fg-success">
          <CheckCircle2 className="w-3.5 h-3.5" />
          {t("cooldown.tierBonus").replace("{tier}", String(tier))}
        </div>
      )}
    </div>
  );
}

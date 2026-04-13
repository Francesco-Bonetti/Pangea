"use client";

import { Sparkles } from "lucide-react";
import { useLanguage } from "@/components/core/language-provider";

interface UnanimityBadgeProps {
  voterCount?: number | null;
  compact?: boolean;
}

/**
 * T25 — Shown when a proposal achieves 100% YES votes (excl. guardian).
 * Unanimity overrides tier_ceiling and locked_settings, but never
 * bypasses reinforced constitutional articles (Art. 3, 5, 6, 11, 12).
 */
export default function UnanimityBadge({ voterCount, compact = false }: UnanimityBadgeProps) {
  const { t } = useLanguage();

  if (compact) {
    return (
      <span
        title={t("proposals.unanimityTooltip")}
        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30"
      >
        <Sparkles className="w-3 h-3" />
        {t("proposals.unanimityBadge")}
      </span>
    );
  }

  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/25">
      <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
      <div>
        <p className="text-xs font-semibold text-amber-300">
          {t("proposals.unanimityBadge")}
          {voterCount != null && voterCount > 0 && (
            <span className="font-normal text-amber-300/70 ml-1">
              ({voterCount} {t("proposals.unanimityVoters")})
            </span>
          )}
        </p>
        <p className="text-[10px] text-amber-300/60 mt-0.5">
          {t("proposals.unanimityDesc")}
        </p>
      </div>
    </div>
  );
}

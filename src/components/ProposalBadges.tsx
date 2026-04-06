"use client";

import { useLanguage } from "@/components/language-provider";
import { Flame } from "lucide-react";

export function AmendmentBadge() {
  const { t } = useLanguage();
  return (
    <span className="text-xs text-purple-400 font-medium bg-purple-tint px-2 py-1 rounded-full border border-purple-800/30">
      {t("laws.amendmentBadge")}
    </span>
  );
}

export function RepealBadge() {
  const { t } = useLanguage();
  return (
    <span className="text-xs text-fg-danger font-medium bg-danger-tint px-2 py-1 rounded-full border border-red-800/30">
      {t("laws.repealBadge")}
    </span>
  );
}

export function YourProposalBadge() {
  const { t } = useLanguage();
  return (
    <span className="text-xs text-amber-400 font-medium bg-warning-tint px-2 py-1 rounded-full border border-amber-800/30">
      {t("proposals.yourProposal")}
    </span>
  );
}

export function CommunityReviewHeader() {
  const { t } = useLanguage();
  return (
    <>
      <h2 className="text-base font-semibold text-fg mb-1 flex items-center gap-2 overflow-hidden">
        <Flame className="w-4 h-4 text-amber-400 shrink-0" />
        <span className="truncate">{t("proposals.communityReview")}</span>
      </h2>
      <p className="text-xs text-fg-muted">
        {t("proposals.supportToAdvance")}
      </p>
    </>
  );
}

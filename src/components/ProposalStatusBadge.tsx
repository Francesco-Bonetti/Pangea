"use client";

import { useLanguage } from "@/components/language-provider";

const STATUS_KEYS: Record<string, { labelKey: string; className: string }> = {
  active: { labelKey: "laws.statusActiveVote", className: "status-active" },
  curation: { labelKey: "laws.statusCommunityReview", className: "status-curation" },
  closed: { labelKey: "laws.statusConcluded", className: "status-closed" },
  repealed: { labelKey: "laws.statusRepealed", className: "status-repealed" },
  draft: { labelKey: "laws.statusDraft", className: "status-draft" },
};

interface ProposalStatusBadgeProps {
  status: string;
}

export default function ProposalStatusBadge({ status }: ProposalStatusBadgeProps) {
  const { t } = useLanguage();
  const config = STATUS_KEYS[status] ?? STATUS_KEYS.draft;
  return <span className={config.className}>{t(config.labelKey)}</span>;
}

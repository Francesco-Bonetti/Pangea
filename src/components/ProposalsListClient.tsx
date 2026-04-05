"use client";

import { FileText, Clock, Flame, CheckCircle2, Filter, Plus } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import ProposalCard from "@/components/ProposalCard";
import type { ProposalWithResults } from "@/lib/types";
import { useLanguage } from "@/components/language-provider";

interface ProposalsListClientProps {
  proposals: ProposalWithResults[];
  currentFilter: string;
  curationThreshold: number;
  isGuest: boolean;
}

const STATUS_TABS = [
  { key: "all", labelKey: "proposals.allProposals", icon: FileText, color: "var(--primary)" },
  { key: "active", labelKey: "dashboard.activeVotes", icon: Clock, color: "var(--primary)" },
  { key: "curation", labelKey: "dashboard.communityReview", icon: Flame, color: "#d97706" },
  { key: "closed", labelKey: "dashboard.archive", icon: CheckCircle2, color: "var(--success)" },
];

function ProposalsListInner({
  proposals,
  currentFilter,
  curationThreshold,
  isGuest,
}: ProposalsListClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useLanguage();

  const handleFilterChange = (status: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (status === "all") {
      params.delete("status");
    } else {
      params.set("status", status);
    }
    router.push(`/proposals?${params.toString()}`);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-fg flex items-center gap-2">
            <FileText className="w-6 h-6" style={{ color: "var(--primary)" }} />
            {t("proposals.allProposals")}
          </h1>
          <p className="text-sm text-fg-muted mt-1">
            {proposals.length} {proposals.length === 1 ? "proposal" : "proposals"}
          </p>
        </div>
        {!isGuest && (
          <Link
            href="/proposals/new"
            className="btn-primary inline-flex items-center gap-2 text-sm"
          >
            <Plus className="w-4 h-4" />
            {t("nav.newProposal")}
          </Link>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="mb-8">
        <div className="flex gap-1 bg-theme-card rounded-lg p-1 overflow-x-auto">
          {STATUS_TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = currentFilter === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => handleFilterChange(tab.key)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-md font-medium text-sm transition-all whitespace-nowrap ${
                  isActive
                    ? "bg-primary-tint border border-[var(--primary)]/30 text-fg-primary"
                    : "hover:bg-theme-muted text-fg-muted hover:text-fg border border-transparent"
                }`}
              >
                <Icon className="w-4 h-4" />
                {t(tab.labelKey)}
              </button>
            );
          })}
        </div>
      </div>

      {/* Proposals Grid */}
      {proposals.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {proposals.map((proposal) => (
            <ProposalCard
              key={proposal.id}
              proposal={proposal}
              curationThreshold={curationThreshold}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-20 card">
          <Filter
            className="w-16 h-16 text-fg-muted mx-auto mb-4"
            strokeWidth={1}
          />
          <h3 className="text-xl font-semibold text-fg mb-2">
            {t("proposals.noProposalsFound")}
          </h3>
          <p className="text-fg-muted text-sm">
            {t("proposals.tryDifferentFilter")}
          </p>
        </div>
      )}
    </div>
  );
}

export default function ProposalsListClient(props: ProposalsListClientProps) {
  return (
    <Suspense fallback={<div className="max-w-6xl mx-auto px-4 py-8"><div className="skeleton-wave h-96 rounded-xl" /></div>}>
      <ProposalsListInner {...props} />
    </Suspense>
  );
}

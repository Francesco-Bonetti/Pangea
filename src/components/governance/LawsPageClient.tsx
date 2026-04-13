"use client";

import LawTree from "@/components/governance/LawTree";
import Link from "next/link";
import { BookOpen, Scale, Shield } from "lucide-react";
import { useLanguage } from "@/components/core/language-provider";
import type { LawNode } from "@/app/laws/page";

interface LawsPageClientProps {
  fullTree: LawNode[];
  activeTree: LawNode[];
  totalCodes: number;
  totalArticles: number;
  activeCodes: number;
  activeArticles: number;
  isAdmin?: boolean;
  isGuest?: boolean;
  groupFilter?: { id: string; name: string; emoji: string } | null;
  activeProposalCounts?: Record<string, number>;
}

export default function LawsPageClient({
  fullTree,
  totalCodes,
  totalArticles,
  activeCodes,
  isAdmin,
  isGuest = false,
  groupFilter,
  activeProposalCounts = {},
}: LawsPageClientProps) {
  const { t } = useLanguage();

  return (
    <>
      {/* T09: Group filter banner */}
      {groupFilter && (
        <div className="flex items-center gap-2 mb-4 px-4 py-2.5 rounded-lg bg-purple-500/10 border border-purple-500/20">
          <span className="text-lg">{groupFilter.emoji}</span>
          <span className="text-sm font-medium text-fg">{groupFilter.name}</span>
          <Link
            href="/laws"
            className="ml-auto text-xs text-purple-400 hover:text-purple-300 hover:underline"
          >
            {t("laws.showAll")}
          </Link>
        </div>
      )}

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="card p-4 bg-blue-900/10 border border-blue-800/20">
          <Scale className="w-5 h-5 text-blue-400 mb-2" />
          <p className="text-2xl font-bold text-fg">{totalCodes}</p>
          <p className="text-xs text-fg-muted">{t("laws.codes")}</p>
        </div>
        <div className="card p-4 bg-pangea-900/10 border border-pangea-800/20">
          <BookOpen className="w-5 h-5 text-fg-primary mb-2" />
          <p className="text-2xl font-bold text-fg">{totalArticles}</p>
          <p className="text-xs text-fg-muted">{t("laws.articles")}</p>
        </div>
        <div className="card p-4 bg-green-900/10 border border-green-800/20">
          <Shield className="w-5 h-5 text-fg-success mb-2" />
          <p className="text-2xl font-bold text-fg">{activeCodes}/{totalCodes}</p>
          <p className="text-xs text-fg-muted">{t("laws.activeCodes")}</p>
        </div>
      </div>

      {/* Law tree — single unified view */}
      <div className="space-y-4">
        {fullTree.map((code) => (
          <LawTree
            key={code.id}
            node={code}
            depth={0}
            showActiveStatus
            isAdmin={isAdmin}
            isGuest={isGuest}
            activeProposalCounts={activeProposalCounts}
          />
        ))}
      </div>

      {fullTree.length === 0 && (
        <div className="text-center py-20 card">
          <BookOpen className="w-16 h-16 text-fg-muted mx-auto mb-4" strokeWidth={1} />
          <h3 className="text-xl font-semibold text-fg mb-2">{t("laws.noLaws")}</h3>
        </div>
      )}
    </>
  );
}

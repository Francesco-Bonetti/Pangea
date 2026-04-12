"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ChevronRight,
  BookOpen,
  FileText,
  Scale,
  Scroll,
  Shield,
  Lock,
  Lightbulb,
  Clock,
  History,
  ChevronLeft,
} from "lucide-react";
import { useLanguage } from "@/components/core/language-provider";
import LawPositions from "@/components/governance/LawPositions";
import IntegrityBadge from "@/components/governance/IntegrityBadge";
import TierBadge from "@/components/governance/TierBadge";
import UidBadge from "@/components/ui/UidBadge";
import type { LawNode } from "@/app/laws/page";

interface BreadcrumbItem {
  id: string;
  title: string;
  article_number: string | null;
  law_type: string;
}

interface LawDetailClientProps {
  law: LawNode;
  breadcrumb: BreadcrumbItem[];
  children: LawNode[];
  prevLaw: { id: string; title: string; article_number: string | null } | null;
  nextLaw: { id: string; title: string; article_number: string | null } | null;
  isAdmin?: boolean;
  isGuest?: boolean;
  hasBootstrapLock?: boolean;
}

const typeConfig: Record<string, { icon: typeof BookOpen; color: string; bg: string; labelKey: string }> = {
  code: { icon: Scale, color: "text-blue-400", bg: "bg-blue-900/20 border-blue-800/30", labelKey: "laws.typeCode" },
  book: { icon: BookOpen, color: "text-fg-primary", bg: "bg-pangea-900/20 border-pangea-800/30", labelKey: "laws.typeBook" },
  title: { icon: Scroll, color: "text-amber-400", bg: "bg-warning-tint border-amber-800/30", labelKey: "laws.typeTitle" },
  chapter: { icon: FileText, color: "text-fg-success", bg: "bg-success-tint border-green-800/30", labelKey: "laws.typeChapter" },
  section: { icon: FileText, color: "text-fg-muted", bg: "bg-theme-card border-theme/30", labelKey: "laws.typeSection" },
  article: { icon: FileText, color: "text-fg", bg: "bg-theme-card/30 border-theme/20", labelKey: "laws.typeArticle" },
};

export default function LawDetailClient({
  law,
  breadcrumb,
  children,
  prevLaw,
  nextLaw,
  isAdmin,
  isGuest,
  hasBootstrapLock,
}: LawDetailClientProps) {
  const [showSimplified, setShowSimplified] = useState(false);
  const { t } = useLanguage();
  const config = typeConfig[law.law_type] || typeConfig.section;
  const Icon = config.icon;
  const isArticle = law.law_type === "article";

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Back link */}
      <Link
        href="/laws"
        className="text-sm text-fg-muted hover:text-fg transition-colors mb-4 inline-flex items-center gap-1"
      >
        <ArrowLeft className="w-3 h-3" />
        {t("laws.backToLaws")}
      </Link>

      {/* Breadcrumb */}
      {breadcrumb.length > 1 && (
        <nav className="flex items-center gap-1 mt-3 mb-6 flex-wrap text-sm">
          {breadcrumb.map((item, idx) => {
            const isLast = idx === breadcrumb.length - 1;
            const itemConfig = typeConfig[item.law_type] || typeConfig.section;
            return (
              <span key={item.id} className="flex items-center gap-1">
                {idx > 0 && <ChevronRight className="w-3 h-3 text-fg-muted shrink-0" />}
                {isLast ? (
                  <span className={`font-medium ${itemConfig.color}`}>
                    {item.article_number ? `${item.article_number} ` : ""}
                    {item.title}
                  </span>
                ) : (
                  <Link
                    href={`/laws/${item.id}`}
                    className="text-fg-muted hover:text-fg transition-colors"
                  >
                    {item.article_number ? `${item.article_number} ` : ""}
                    {item.title}
                  </Link>
                )}
              </span>
            );
          })}
        </nav>
      )}

      {/* Main card */}
      <div className={`card border ${config.bg} mb-6`}>
        <div className="p-6">
          {/* Header */}
          <div className="flex items-start gap-3 mb-4">
            <Icon className={`w-6 h-6 ${config.color} mt-0.5 shrink-0`} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                {law.article_number && (
                  <span className="law-code-ref text-sm shrink-0">
                    {law.article_number}
                  </span>
                )}
                {law.code && (
                  <span className="law-code-ref text-sm shrink-0">
                    {law.code}
                  </span>
                )}
                <span className={`text-xs px-2 py-0.5 rounded-full ${config.bg}`}>
                  {t(config.labelKey)}
                </span>
                {law.is_active ? (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-green-900/30 text-fg-success">
                    {t("laws.active")}
                  </span>
                ) : (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-theme-muted text-fg-muted">
                    {t("laws.notYetActive")}
                  </span>
                )}
                {hasBootstrapLock && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-amber-900/30 text-amber-400 inline-flex items-center gap-1">
                    <Lock className="w-3 h-3" />
                    {t("laws.bootstrapLocked")}
                  </span>
                )}
                {law.tier && (
                  <TierBadge tier={law.tier} />
                )}
                {law.law_type === "article" && (
                  <IntegrityBadge entityType="law" entityId={law.id} compact />
                )}
                {law.uid && <UidBadge uid={law.uid} size="xs" clickable={false} />}
              </div>
              <h1 className="text-2xl font-bold text-fg">{law.title}</h1>
            </div>
          </div>

          {/* Summary */}
          {law.summary && (
            <p className="text-fg-muted leading-relaxed mb-4">{law.summary}</p>
          )}

          {/* Content */}
          {law.content && (
            <div className="mt-4">
              {law.simplified_content && (
                <div className="flex items-center gap-2 mb-3">
                  <button
                    onClick={() => setShowSimplified(false)}
                    className={`text-xs px-3 py-1.5 rounded-md transition-all ${
                      !showSimplified
                        ? "bg-blue-600/20 text-blue-300 border border-blue-500/30"
                        : "text-fg-muted hover:text-fg bg-theme-muted/30"
                    }`}
                  >
                    {t("laws.technical")}
                  </button>
                  <button
                    onClick={() => setShowSimplified(true)}
                    className={`text-xs px-3 py-1.5 rounded-md transition-all inline-flex items-center gap-1 ${
                      showSimplified
                        ? "bg-amber-600/20 text-amber-300 border border-amber-500/30"
                        : "text-fg-muted hover:text-fg bg-theme-muted/30"
                    }`}
                  >
                    <Lightbulb className="w-3 h-3" />
                    {t("laws.simplified")}
                  </button>
                </div>
              )}

              {showSimplified && law.simplified_content ? (
                <div className="bg-warning-tint border border-amber-800/20 rounded-lg p-4">
                  <div className="flex items-center gap-1.5 mb-2">
                    <Lightbulb className="w-4 h-4 text-amber-400" />
                    <span className="text-sm font-medium text-amber-400">
                      {t("laws.simplifiedExplanation")}
                    </span>
                  </div>
                  <p className="text-sm text-amber-200/80 leading-relaxed whitespace-pre-wrap">
                    {law.simplified_content}
                  </p>
                </div>
              ) : (
                <div className="law-content whitespace-pre-wrap">{law.content}</div>
              )}
            </div>
          )}

          {/* Meta */}
          <div className="flex items-center gap-3 mt-4 pt-3 border-t border-theme/20 flex-wrap">
            {law.updated_at && (
              <div className="flex items-center gap-1.5">
                <Clock className="w-3 h-3 text-fg-muted" />
                <span className="text-xs text-fg-muted">
                  {t("laws.lastUpdated")}{" "}
                  {new Date(law.updated_at).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  })}
                </span>
              </div>
            )}
            <Link
              href={`/laws/${law.id}/history`}
              className="flex items-center gap-1 text-xs text-fg-muted hover:text-blue-400 transition-colors"
            >
              <History className="w-3 h-3" />
              {t("laws.versionHistory")}
            </Link>
          </div>

          {/* Positions */}
          {isArticle && (
            <div className="mt-4 pt-3 border-t border-theme/20">
              <LawPositions lawId={law.id} isAdmin={isAdmin} />
            </div>
          )}
        </div>
      </div>

      {/* Children */}
      {children.length > 0 && (
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-fg mb-3 flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-fg-muted" />
            {t("laws.contents")}
            <span className="text-xs text-fg-muted bg-theme-card px-2 py-0.5 rounded">
              {children.length} {children.length === 1 ? t("laws.element") : t("laws.elements")}
            </span>
          </h2>
          <div className="space-y-2">
            {children.map((child) => {
              const childConfig = typeConfig[child.law_type] || typeConfig.section;
              const ChildIcon = childConfig.icon;
              return (
                <Link
                  key={child.id}
                  href={`/laws/${child.id}`}
                  className={`card border ${childConfig.bg} p-4 flex items-start gap-3 hover:border-theme transition-all group`}
                >
                  <ChildIcon className={`w-4 h-4 ${childConfig.color} mt-0.5 shrink-0`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      {child.article_number && (
                        <span className="law-code-ref text-xs shrink-0">
                          {child.article_number}
                        </span>
                      )}
                      <span className="font-medium text-fg group-hover:text-blue-300 transition-colors">
                        {child.title}
                      </span>
                      {!child.is_active && (
                        <span className="text-xs px-1.5 py-0.5 rounded bg-theme-muted text-fg-muted">
                          {t("laws.notYetActive")}
                        </span>
                      )}
                    </div>
                    {child.summary && (
                      <p className="text-sm text-fg-muted mt-0.5 line-clamp-2">{child.summary}</p>
                    )}
                  </div>
                  <ChevronRight className="w-4 h-4 text-fg-muted group-hover:text-fg shrink-0 mt-0.5" />
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* Prev/Next navigation */}
      {(prevLaw || nextLaw) && (
        <div className="flex items-stretch gap-3 mt-8">
          {prevLaw ? (
            <Link
              href={`/laws/${prevLaw.id}`}
              className="flex-1 card border border-theme/20 p-4 hover:border-theme transition-all group"
            >
              <div className="flex items-center gap-2">
                <ChevronLeft className="w-4 h-4 text-fg-muted group-hover:text-fg" />
                <div className="min-w-0">
                  <span className="text-xs text-fg-muted">{t("laws.previous")}</span>
                  <p className="text-sm font-medium text-fg truncate group-hover:text-blue-300 transition-colors">
                    {prevLaw.article_number ? `${prevLaw.article_number} ` : ""}
                    {prevLaw.title}
                  </p>
                </div>
              </div>
            </Link>
          ) : (
            <div className="flex-1" />
          )}
          {nextLaw ? (
            <Link
              href={`/laws/${nextLaw.id}`}
              className="flex-1 card border border-theme/20 p-4 hover:border-theme transition-all group text-right"
            >
              <div className="flex items-center justify-end gap-2">
                <div className="min-w-0">
                  <span className="text-xs text-fg-muted">{t("laws.next")}</span>
                  <p className="text-sm font-medium text-fg truncate group-hover:text-blue-300 transition-colors">
                    {nextLaw.article_number ? `${nextLaw.article_number} ` : ""}
                    {nextLaw.title}
                  </p>
                </div>
                <ChevronRight className="w-4 h-4 text-fg-muted group-hover:text-fg" />
              </div>
            </Link>
          ) : (
            <div className="flex-1" />
          )}
        </div>
      )}
    </div>
  );
}

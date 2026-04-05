"use client";

import { useState } from "react";
import {
  ChevronRight,
  ChevronDown,
  BookOpen,
  FileText,
  Scale,
  Scroll,
  Lightbulb,
  Clock,
  History,
} from "lucide-react";
import Link from "next/link";
import type { LawNode } from "@/app/laws/page";
import LawPositions from "@/components/LawPositions";
import { useLanguage } from "@/components/language-provider";

interface LawTreeProps {
  node: LawNode;
  depth: number;
  showActiveStatus?: boolean;
  isAdmin?: boolean;
}

const typeKeys: Record<string, { icon: typeof BookOpen; color: string; bg: string; inactiveBg: string; labelKey: string }> = {
  code: {
    icon: Scale,
    color: "text-blue-400",
    bg: "bg-blue-900/20 border-blue-800/30",
    inactiveBg: "bg-theme-card/40 border-theme/20",
    labelKey: "laws.typeCode",
  },
  book: {
    icon: BookOpen,
    color: "text-fg-primary",
    bg: "bg-pangea-900/20 border-pangea-800/30",
    inactiveBg: "bg-theme-card/30 border-theme/20",
    labelKey: "laws.typeBook",
  },
  title: {
    icon: Scroll,
    color: "text-amber-400",
    bg: "bg-warning-tint border-amber-800/30",
    inactiveBg: "bg-theme-card/30 border-theme/20",
    labelKey: "laws.typeTitle",
  },
  chapter: {
    icon: FileText,
    color: "text-fg-success",
    bg: "bg-success-tint border-green-800/30",
    inactiveBg: "bg-theme-card/30 border-theme/20",
    labelKey: "laws.typeChapter",
  },
  section: {
    icon: FileText,
    color: "text-fg-muted",
    bg: "bg-theme-card border-theme/30",
    inactiveBg: "bg-theme-card/30 border-theme/20",
    labelKey: "laws.typeSection",
  },
  article: {
    icon: FileText,
    color: "text-fg",
    bg: "bg-theme-card/30 border-theme/20",
    inactiveBg: "bg-theme-base border-theme/10",
    labelKey: "laws.typeArticle",
  },
};

export default function LawTree({ node, depth, showActiveStatus, isAdmin }: LawTreeProps) {
  const [expanded, setExpanded] = useState(depth === 0);
  const [showSimplified, setShowSimplified] = useState(false);
  const { t } = useLanguage();
  const hasChildren = node.children && node.children.length > 0;
  const isArticle = node.law_type === "article";
  const hasContent = !!node.content;
  const isExpandable = hasChildren || (isArticle && hasContent);
  const config = typeKeys[node.law_type] || typeKeys.section;
  const Icon = config.icon;
  const isInactive = !node.is_active;
  const bgClass = isInactive ? config.inactiveBg : config.bg;

  return (
    <div className={depth === 0 ? "" : "ml-4 sm:ml-6"}>
      {/* Node header */}
      <div
        className={`card border ${bgClass} transition-all duration-200 ${
          isExpandable ? "cursor-pointer hover:border-theme" : ""
        } ${expanded && (hasChildren || hasContent) ? "rounded-b-none border-b-0" : ""} ${
          isInactive && showActiveStatus ? "opacity-70" : ""
        }`}
        onClick={() => {
          if (isExpandable) setExpanded(!expanded);
        }}
      >
        <div className="p-4 flex items-start gap-3">
          {/* Expand/collapse indicator */}
          <div className="mt-0.5 shrink-0">
            {isExpandable ? (
              expanded ? (
                <ChevronDown className={`w-4 h-4 ${isInactive ? "text-fg-muted" : config.color}`} />
              ) : (
                <ChevronRight className={`w-4 h-4 ${isInactive ? "text-fg-muted" : config.color}`} />
              )
            ) : (
              <Icon className={`w-4 h-4 ${isInactive ? "text-fg-muted" : config.color}`} />
            )}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              {node.article_number && (
                <span className="text-xs font-medium text-fg-muted bg-theme-muted px-1.5 py-0.5 rounded shrink-0">
                  {node.article_number}
                </span>
              )}
              {node.code && depth === 0 && (
                <span className="text-xs font-medium text-fg-muted bg-theme-muted px-1.5 py-0.5 rounded shrink-0">
                  {node.code}
                </span>
              )}
              <h3
                className={`font-semibold ${
                  depth === 0
                    ? `text-lg ${isInactive ? "text-fg-muted" : "text-fg"}`
                    : depth === 1
                    ? `text-base ${isInactive ? "text-fg-muted" : "text-fg"}`
                    : `text-sm ${isInactive ? "text-fg-muted" : "text-fg"}`
                }`}
              >
                {node.title}
              </h3>

              {/* Active/Inactive badge */}
              {showActiveStatus && node.law_type === "code" && (
                <span
                  className={`text-xs px-2 py-0.5 rounded-full ${
                    isInactive
                      ? "bg-theme-muted text-fg-muted"
                      : "bg-green-900/30 text-fg-success"
                  }`}
                >
                  {isInactive ? t("laws.notYetActive") : t("laws.active")}
                </span>
              )}
            </div>

            {/* Summary */}
            {node.summary && !expanded && (
              <p className={`text-sm mt-1 leading-relaxed ${isInactive ? "text-fg-muted" : "text-fg-muted"}`}>
                {node.summary}
              </p>
            )}

            {/* Children count when collapsed */}
            {hasChildren && !expanded && (
              <p className="text-xs text-fg-muted mt-1">
                {node.children!.length} {node.children!.length === 1 ? t("laws.element") : t("laws.elements")}
              </p>
            )}
          </div>

          {/* Simplified content toggle button */}
          {node.simplified_content && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowSimplified(!showSimplified);
              }}
              className={`shrink-0 p-1.5 rounded-md transition-all ${
                showSimplified
                  ? "bg-amber-500/20 text-amber-400"
                  : "bg-theme-muted/30 text-fg-muted hover:text-amber-400 hover:bg-amber-500/10"
              }`}
              title={showSimplified ? t("laws.showTechnical") : t("laws.showSimplified")}
            >
              <Lightbulb className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Simplified explanation (shown inline when toggle is on) */}
        {showSimplified && node.simplified_content && (
          <div className="px-4 pb-4 pl-11">
            <div className="bg-warning-tint border border-amber-800/20 rounded-lg p-3">
              <div className="flex items-center gap-1.5 mb-1.5">
                <Lightbulb className="w-3.5 h-3.5 text-amber-400" />
                <span className="text-xs font-medium text-amber-400">{t("laws.simplifiedExplanation")}</span>
              </div>
              <p className="text-sm text-amber-200/80 leading-relaxed">
                {node.simplified_content}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Article content when expanded */}
      {expanded && hasContent && isArticle && (
        <div className={`card border ${isInactive ? "border-theme/10" : "border-theme/20"} rounded-t-none border-t-0 bg-theme-base`}>
          <div className="p-4 pl-11">
            <p className={isInactive ? "text-sm leading-relaxed whitespace-pre-wrap text-fg-muted" : "law-content"}>
              {node.content}
            </p>
            <div className="flex items-center gap-3 mt-3 pt-2 border-t border-theme/30">
              {node.updated_at && (
                <div className="flex items-center gap-1.5">
                  <Clock className="w-3 h-3 text-fg-muted" />
                  <span className="text-xs text-fg-muted">
                    {t("laws.lastUpdated")} {new Date(node.updated_at).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}
                  </span>
                </div>
              )}
              <Link
                href={`/laws/${node.id}/history`}
                onClick={(e) => e.stopPropagation()}
                className="flex items-center gap-1 text-xs text-fg-muted hover:text-blue-400 transition-colors ml-auto"
              >
                <History className="w-3 h-3" />
                {t("laws.versionHistory")}
              </Link>
            </div>

            {/* Law Positions */}
            <div className="mt-3 pt-3 border-t border-theme/30" onClick={(e) => e.stopPropagation()}>
              <LawPositions lawId={node.id} isAdmin={isAdmin} />
            </div>
          </div>
        </div>
      )}

      {/* Non-article content when expanded */}
      {expanded && hasContent && !isArticle && !hasChildren && (
        <div className={`card border ${isInactive ? "border-theme/10" : "border-theme/20"} rounded-t-none border-t-0 bg-theme-base`}>
          <div className="p-4 pl-11">
            <p className={`text-sm leading-relaxed whitespace-pre-wrap ${isInactive ? "text-fg-muted" : "text-fg"}`}>
              {node.content}
            </p>
            {/* Law Positions */}
            <div className="mt-3 pt-3 border-t border-theme/30" onClick={(e) => e.stopPropagation()}>
              <LawPositions lawId={node.id} isAdmin={isAdmin} />
            </div>
          </div>
        </div>
      )}

      {/* Children when expanded */}
      {expanded && hasChildren && (
        <div className={`card border ${bgClass} rounded-t-none border-t border-theme/20 pb-2 pt-1`}>
          <div className="space-y-2 px-2">
            {node.children!.map((child) => (
              <LawTree key={child.id} node={child} depth={depth + 1} showActiveStatus={showActiveStatus} isAdmin={isAdmin} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

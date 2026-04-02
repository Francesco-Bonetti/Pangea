"use client";

import { useState } from "react";
import { ChevronRight, ChevronDown, BookOpen, FileText, Scale, Scroll } from "lucide-react";
import type { LawNode } from "@/app/laws/page";

interface LawTreeProps {
  node: LawNode;
  depth: number;
}

const typeConfig: Record<string, { icon: typeof BookOpen; color: string; bg: string; label: string }> = {
  code: { icon: Scale, color: "text-blue-400", bg: "bg-blue-900/20 border-blue-800/30", label: "Codice" },
  book: { icon: BookOpen, color: "text-pangea-400", bg: "bg-pangea-900/20 border-pangea-800/30", label: "Libro" },
  title: { icon: Scroll, color: "text-amber-400", bg: "bg-amber-900/20 border-amber-800/30", label: "Titolo" },
  chapter: { icon: FileText, color: "text-green-400", bg: "bg-green-900/20 border-green-800/30", label: "Capitolo" },
  section: { icon: FileText, color: "text-slate-400", bg: "bg-slate-800/50 border-slate-700/30", label: "Sezione" },
  article: { icon: FileText, color: "text-slate-300", bg: "bg-slate-800/30 border-slate-700/20", label: "Articolo" },
};

export default function LawTree({ node, depth }: LawTreeProps) {
  const [expanded, setExpanded] = useState(depth === 0); // Codici radice aperti di default
  const hasChildren = node.children && node.children.length > 0;
  const isArticle = node.law_type === "article";
  const config = typeConfig[node.law_type] || typeConfig.section;
  const Icon = config.icon;

  return (
    <div className={depth === 0 ? "" : "ml-4 sm:ml-6"}>
      {/* Nodo header */}
      <div
        className={`card border ${config.bg} transition-all duration-200 ${
          hasChildren || isArticle ? "cursor-pointer hover:border-slate-500" : ""
        } ${expanded && hasChildren ? "rounded-b-none border-b-0" : ""}`}
        onClick={() => {
          if (hasChildren || isArticle) setExpanded(!expanded);
        }}
      >
        <div className="p-4 flex items-start gap-3">
          {/* Expand/collapse indicator */}
          <div className="mt-0.5 shrink-0">
            {hasChildren ? (
              expanded ? (
                <ChevronDown className={`w-4 h-4 ${config.color}`} />
              ) : (
                <ChevronRight className={`w-4 h-4 ${config.color}`} />
              )
            ) : (
              <Icon className={`w-4 h-4 ${config.color}`} />
            )}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              {node.article_number && (
                <span className="text-xs font-medium text-slate-500 bg-slate-700/50 px-1.5 py-0.5 rounded shrink-0">
                  {node.article_number}
                </span>
              )}
              {node.code && depth === 0 && (
                <span className="text-xs font-medium text-slate-500 bg-slate-700/50 px-1.5 py-0.5 rounded shrink-0">
                  {node.code}
                </span>
              )}
              <h3 className={`font-semibold ${
                depth === 0 ? "text-lg text-white" :
                depth === 1 ? "text-base text-slate-200" :
                "text-sm text-slate-300"
              }`}>
                {node.title}
              </h3>
            </div>

            {/* Summary (per nodi non-articolo) */}
            {node.summary && !isArticle && (
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                {node.summary}
              </p>
            )}

            {/* Conteggio figli */}
            {hasChildren && !expanded && (
              <p className="text-xs text-slate-600 mt-1">
                {node.children!.length} {node.children!.length === 1 ? "elemento" : "elementi"}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Contenuto articolo espanso */}
      {expanded && isArticle && node.content && (
        <div className="card border border-slate-700/20 rounded-t-none border-t-0 bg-slate-900/50">
          <div className="p-4 pl-11">
            <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">
              {node.content}
            </p>
          </div>
        </div>
      )}

      {/* Figli espansi */}
      {expanded && hasChildren && (
        <div className={`card border ${config.bg} rounded-t-none border-t border-slate-700/20 pb-2 pt-1`}>
          <div className="space-y-2 px-2">
            {node.children!.map((child) => (
              <LawTree key={child.id} node={child} depth={depth + 1} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

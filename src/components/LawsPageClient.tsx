"use client";

import { useState } from "react";
import LawTree from "@/components/LawTree";
import { BookOpen, Globe, Scale, Shield, Eye } from "lucide-react";
import { useLanguage } from "@/components/language-provider";

interface LawNode {
  id: string;
  parent_id: string | null;
  title: string;
  summary: string | null;
  content: string | null;
  simplified_content: string | null;
  code: string | null;
  article_number: string | null;
  law_type: string;
  status: string;
  is_active: boolean;
  order_index: number;
  updated_at: string | null;
  jurisdiction_id: string | null;
  children?: LawNode[];
}

interface LawsPageClientProps {
  fullTree: LawNode[];
  activeTree: LawNode[];
  totalCodes: number;
  totalArticles: number;
  activeCodes: number;
  activeArticles: number;
  isAdmin?: boolean;
}

export default function LawsPageClient({
  fullTree,
  activeTree,
  totalCodes,
  totalArticles,
  activeCodes,
  activeArticles,
  isAdmin,
}: LawsPageClientProps) {
  const [activeTab, setActiveTab] = useState<"living" | "operative">("living");
  const { t } = useLanguage();

  return (
    <>
      {/* Tab Navigation */}
      <div className="mb-8">
        <div className="flex gap-1 bg-theme-card rounded-lg p-1">
          <button
            onClick={() => setActiveTab("living")}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-md font-medium text-sm transition-all ${
              activeTab === "living"
                ? "bg-blue-600/20 border border-blue-500/30 text-blue-300"
                : "hover:bg-theme-muted text-fg-muted hover:text-fg border border-transparent"
            }`}
          >
            <BookOpen className="w-4 h-4" />
            {t("laws.livingCodes")}
            <span className={`text-xs px-2 py-0.5 rounded-full ${
              activeTab === "living" ? "bg-blue-500/20" : "bg-theme-muted"
            }`}>
              {totalCodes} {t("laws.codes").toLowerCase()} &middot; {totalArticles} {t("laws.articles").toLowerCase()}
            </span>
          </button>
          <button
            onClick={() => setActiveTab("operative")}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-md font-medium text-sm transition-all ${
              activeTab === "operative"
                ? "bg-green-600/20 border border-green-500/30 text-fg-success"
                : "hover:bg-theme-muted text-fg-muted hover:text-fg border border-transparent"
            }`}
          >
            <Shield className="w-4 h-4" />
            {t("laws.operativeLaws")}
            <span className={`text-xs px-2 py-0.5 rounded-full ${
              activeTab === "operative" ? "bg-green-500/20" : "bg-theme-muted"
            }`}>
              {activeCodes} {t("laws.codes").toLowerCase()} &middot; {activeArticles} {t("laws.articles").toLowerCase()}
            </span>
          </button>
        </div>
      </div>

      {/* Living Codes Tab */}
      {activeTab === "living" && (
        <section>
          <div className="flex items-center gap-3 mb-4">
            <BookOpen className="w-6 h-6 text-blue-400" />
            <h2 className="text-xl font-bold text-fg">{t("laws.livingCodes")}</h2>
            <span className="text-xs text-fg-muted bg-theme-card px-2 py-1 rounded">
              {t("laws.completeCollection")}
            </span>
          </div>
          <div className="card border border-blue-800/20 bg-blue-900/5 p-4 mb-6">
            <p className="text-sm text-fg-muted leading-relaxed">
              <Eye className="w-4 h-4 inline mr-1 text-blue-400" />
              {t("laws.livingCodesDesc")}
            </p>
          </div>

          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="card p-4 bg-blue-900/10">
              <Scale className="w-5 h-5 text-blue-400 mb-2" />
              <p className="text-2xl font-bold text-fg">{totalCodes}</p>
              <p className="text-xs text-fg-muted">{t("laws.codes")}</p>
            </div>
            <div className="card p-4 bg-pangea-900/10">
              <BookOpen className="w-5 h-5 text-fg-primary mb-2" />
              <p className="text-2xl font-bold text-fg">{totalArticles}</p>
              <p className="text-xs text-fg-muted">{t("laws.articles")}</p>
            </div>
            <div className="card p-4 bg-green-900/10">
              <Globe className="w-5 h-5 text-fg-success mb-2" />
              <p className="text-2xl font-bold text-fg">
                {activeCodes}/{totalCodes}
              </p>
              <p className="text-xs text-fg-muted">{t("laws.activeCodes")}</p>
            </div>
          </div>

          <div className="space-y-4">
            {fullTree.map((code) => (
              <LawTree key={code.id} node={code} depth={0} showActiveStatus isAdmin={isAdmin} />
            ))}
          </div>
        </section>
      )}

      {/* Operative Laws Tab */}
      {activeTab === "operative" && (
        <section>
          <div className="flex items-center gap-3 mb-4">
            <Shield className="w-6 h-6 text-fg-success" />
            <h2 className="text-xl font-bold text-fg">{t("laws.operativeLaws")}</h2>
            <span className="text-xs text-fg-success bg-green-900/30 px-2 py-1 rounded">
              {t("laws.currentlyInForce")}
            </span>
          </div>
          <div className="card border border-green-800/20 bg-green-900/5 p-4 mb-6">
            <p className="text-sm text-fg-muted leading-relaxed">
              <Shield className="w-4 h-4 inline mr-1 text-fg-success" />
              {t("laws.operativeDesc")}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="card p-4 bg-green-900/10">
              <Scale className="w-5 h-5 text-fg-success mb-2" />
              <p className="text-2xl font-bold text-fg">{activeCodes}</p>
              <p className="text-xs text-fg-muted">{t("laws.activeCodes")}</p>
            </div>
            <div className="card p-4 bg-green-900/10">
              <BookOpen className="w-5 h-5 text-fg-success mb-2" />
              <p className="text-2xl font-bold text-fg">{activeArticles}</p>
              <p className="text-xs text-fg-muted">{t("laws.activeArticles")}</p>
            </div>
          </div>

          <div className="space-y-4">
            {activeTree.map((code) => (
              <LawTree key={code.id} node={code} depth={0} showActiveStatus isAdmin={isAdmin} />
            ))}
          </div>

          {activeTree.length === 0 && (
            <div className="text-center py-20 card">
              <Shield className="w-16 h-16 text-fg-muted mx-auto mb-4" strokeWidth={1} />
              <h3 className="text-xl font-semibold text-fg mb-2">
                {t("laws.noOperativeLaws")}
              </h3>
              <p className="text-fg-muted">
                {t("laws.operativeWillAppear")}
              </p>
            </div>
          )}
        </section>
      )}
    </>
  );
}

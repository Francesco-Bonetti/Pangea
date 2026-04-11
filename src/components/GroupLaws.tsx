"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { Scale, BookOpen, FileText, ChevronRight, Plus } from "lucide-react";
import { useLanguage } from "@/components/language-provider";
import UidBadge from "@/components/UidBadge";
import TranslatedContent from "@/components/TranslatedContent";

interface LawItem {
  id: string;
  uid?: string | null;
  title: string;
  summary: string | null;
  code: string | null;
  article_number: string | null;
  law_type: string;
  status: string;
  is_active: boolean;
  parent_id: string | null;
  updated_at: string | null;
}

interface GroupLawsProps {
  groupId: string;
  groupName: string;
  isMember: boolean;
  isGuest: boolean;
}

export default function GroupLaws({ groupId, groupName, isMember, isGuest }: GroupLawsProps) {
  const { t } = useLanguage();
  const supabase = createClient();
  const [laws, setLaws] = useState<LawItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "active" | "repealed">("all");

  useEffect(() => {
    loadLaws();
  }, [groupId, filter]);

  async function loadLaws() {
    setLoading(true);
    let query = supabase
      .from("laws")
      .select("id, uid, title, summary, code, article_number, law_type, status, is_active, parent_id, updated_at")
      .or(`group_id.eq.${groupId},jurisdiction_id.eq.${groupId}`)
      .order("order_index", { ascending: true });

    if (filter === "active") {
      query = query.eq("is_active", true);
    } else if (filter === "repealed") {
      query = query.eq("is_active", false);
    }

    const { data } = await query;
    setLaws((data as LawItem[]) || []);
    setLoading(false);
  }

  // Separate root laws (codes) from articles
  const codes = laws.filter((l) => l.law_type === "code" || !l.parent_id);
  const articles = laws.filter((l) => l.law_type !== "code" && l.parent_id);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-5 space-y-4">
      {/* Header + filter */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Scale className="w-5 h-5 text-blue-400" />
          <span className="text-sm font-semibold" style={{ color: "var(--foreground)" }}>
            {laws.length} {laws.length === 1 ? t("groups.miniPangea.law") : t("groups.miniPangea.laws")}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex gap-1">
            {(["all", "active", "repealed"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  filter === f
                    ? "bg-blue-500/20 text-blue-300 border border-blue-500/30"
                    : "hover:bg-[var(--muted)]"
                }`}
                style={filter !== f ? { color: "var(--muted-foreground)" } : undefined}
              >
                {t(`groups.miniPangea.filter.${f}`)}
              </button>
            ))}
          </div>
          {/* T09 Step 3: New law proposal button */}
          {isMember && !isGuest && (
            <Link
              href={`/proposals/new?groupId=${groupId}`}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 text-xs font-medium rounded-md border border-purple-500/30 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              {t("groups.miniPangea.newProposal")}
            </Link>
          )}
        </div>
      </div>

      {/* Laws list */}
      {laws.length === 0 ? (
        <div className="text-center py-12">
          <Scale className="w-10 h-10 mx-auto mb-3 opacity-30" style={{ color: "var(--muted-foreground)" }} />
          <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>
            {t("groups.miniPangea.noLaws")}
          </p>
          {isMember && !isGuest && (
            <Link
              href={`/proposals/new?groupId=${groupId}`}
              className="inline-flex items-center gap-1.5 mt-3 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white text-sm font-medium rounded-lg transition-colors"
            >
              <Plus className="w-4 h-4" />
              {t("groups.miniPangea.createFirst")}
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-1.5">
          {codes.map((law) => {
            const childArticles = articles.filter((a) => a.parent_id === law.id);
            return (
              <div key={law.id}>
                {/* Code (root law) */}
                <Link
                  href={`/laws/${law.id}`}
                  className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-[var(--muted)] transition-colors group"
                >
                  <BookOpen className="w-4 h-4 shrink-0 text-blue-400" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      {law.code && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-500/15 text-blue-300 shrink-0">
                          {law.code}
                        </span>
                      )}
                      <span className="text-sm font-medium truncate" style={{ color: "var(--foreground)" }}>
                        {law.title}
                      </span>
                    </div>
                    {law.summary && (
                      <p className="text-xs mt-0.5 truncate" style={{ color: "var(--muted-foreground)" }}>
                        {law.summary}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {!law.is_active && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-500/15 text-red-400">
                        {t("groups.miniPangea.repealed")}
                      </span>
                    )}
                    {childArticles.length > 0 && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--muted)]" style={{ color: "var(--muted-foreground)" }}>
                        {childArticles.length} art.
                      </span>
                    )}
                    <ChevronRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: "var(--muted-foreground)" }} />
                  </div>
                </Link>
              </div>
            );
          })}

          {/* Standalone articles (no parent code) */}
          {articles.filter((a) => !codes.find((c) => c.id === a.parent_id)).map((law) => (
            <Link
              key={law.id}
              href={`/laws/${law.id}`}
              className="flex items-center gap-3 px-4 py-2.5 rounded-lg hover:bg-[var(--muted)] transition-colors group"
            >
              <FileText className="w-4 h-4 shrink-0" style={{ color: "var(--muted-foreground)" }} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  {law.article_number && (
                    <span className="text-[10px] font-mono" style={{ color: "var(--muted-foreground)" }}>
                      Art. {law.article_number}
                    </span>
                  )}
                  <span className="text-sm truncate" style={{ color: "var(--foreground)" }}>
                    {law.title}
                  </span>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: "var(--muted-foreground)" }} />
            </Link>
          ))}
        </div>
      )}

      {/* Link to full laws page filtered by group */}
      {laws.length > 0 && (
        <div className="pt-2 border-t" style={{ borderColor: "var(--border)" }}>
          <Link
            href={`/laws?group=${groupId}`}
            className="text-sm text-purple-400 hover:text-purple-300 transition-colors flex items-center gap-1"
          >
            {t("groups.miniPangea.viewAllLaws")}
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      )}
    </div>
  );
}

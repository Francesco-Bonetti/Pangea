"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { Vote, Plus, Users, Calendar, Trophy, Clock, ChevronRight } from "lucide-react";
import { useLanguage } from "@/components/core/language-provider";
import UidBadge from "@/components/ui/UidBadge";
import type { Election, ElectionStatus } from "@/lib/types";

interface GroupElectionsProps {
  groupId: string;
  groupName: string;
  isAdmin: boolean;
  isGuest: boolean;
}

function getStatusStyle(status: ElectionStatus): { colorClass: string; bgClass: string } {
  switch (status) {
    case "upcoming": return { colorClass: "text-blue-400", bgClass: "bg-blue-500/15 border-blue-500/30" };
    case "candidature": return { colorClass: "text-amber-400", bgClass: "bg-amber-500/15 border-amber-500/30" };
    case "voting": return { colorClass: "text-green-400", bgClass: "bg-green-500/15 border-green-500/30" };
    case "closed": return { colorClass: "text-slate-400", bgClass: "bg-slate-500/15 border-slate-500/30" };
    case "cancelled": return { colorClass: "text-red-400", bgClass: "bg-red-500/15 border-red-500/30" };
    default: return { colorClass: "text-slate-400", bgClass: "bg-slate-500/15" };
  }
}

function getPhaseText(election: Election, t: (key: string) => string): string | null {
  const now = Date.now();
  if (election.status === "candidature") {
    const days = Math.ceil((new Date(election.candidature_end).getTime() - now) / (1000 * 60 * 60 * 24));
    return days > 0 ? `${days}d ${t("groups.miniPangea.left")}` : t("groups.miniPangea.closingSoon");
  }
  if (election.status === "voting") {
    const days = Math.ceil((new Date(election.voting_end).getTime() - now) / (1000 * 60 * 60 * 24));
    return days > 0 ? `${days}d ${t("groups.miniPangea.left")}` : t("groups.miniPangea.closingSoon");
  }
  if (election.status === "upcoming") {
    return new Date(election.candidature_start).toLocaleDateString("en-US", { month: "short", day: "numeric" });
  }
  return null;
}

export default function GroupElections({ groupId, groupName, isAdmin, isGuest }: GroupElectionsProps) {
  const { t } = useLanguage();
  const supabase = createClient();
  const [elections, setElections] = useState<Election[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadElections();
  }, [groupId]);

  async function loadElections() {
    setLoading(true);
    const { data } = await supabase
      .from("elections")
      .select("*")
      .eq("group_id", groupId)
      .order("created_at", { ascending: false })
      .limit(20);

    // Get candidate counts
    if (data && data.length > 0) {
      const ids = data.map((e: Election) => e.id);
      const { data: cands } = await supabase
        .from("candidates")
        .select("election_id")
        .in("election_id", ids)
        .in("status", ["registered", "approved"]);

      const countMap: Record<string, number> = {};
      cands?.forEach((c: { election_id: string }) => {
        countMap[c.election_id] = (countMap[c.election_id] || 0) + 1;
      });
      data.forEach((e: Election) => { e.candidate_count = countMap[e.id] || 0; });
    }

    setElections((data as Election[]) || []);
    setLoading(false);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-5 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Vote className="w-5 h-5 text-green-400" />
          <span className="text-sm font-semibold" style={{ color: "var(--foreground)" }}>
            {elections.length} {elections.length === 1 ? t("groups.miniPangea.election") : t("groups.miniPangea.elections")}
          </span>
        </div>
        {isAdmin && !isGuest && (
          <Link
            href={`/elections/new?groupId=${groupId}`}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600/20 hover:bg-green-600/30 text-green-300 text-xs font-medium rounded-md border border-green-500/30 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            {t("groups.miniPangea.newElection")}
          </Link>
        )}
      </div>

      {/* Elections list */}
      {elections.length === 0 ? (
        <div className="text-center py-12">
          <Vote className="w-10 h-10 mx-auto mb-3 opacity-30" style={{ color: "var(--muted-foreground)" }} />
          <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>
            {t("groups.miniPangea.noElections")}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {elections.map((e) => {
            const style = getStatusStyle(e.status);
            const phase = getPhaseText(e, t);
            return (
              <Link
                key={e.id}
                href={`/elections/${e.id}`}
                className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-[var(--muted)] transition-colors group"
              >
                <span className={`flex items-center justify-center w-8 h-8 rounded-lg shrink-0 border ${style.bgClass}`}>
                  <Vote className={`w-4 h-4 ${style.colorClass}`} />
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate" style={{ color: "var(--foreground)" }}>
                    {e.title}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className={`text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded border ${style.bgClass} ${style.colorClass}`}>
                      {t(`elections.${e.status}`)}
                    </span>
                    <span className="flex items-center gap-0.5 text-[10px]" style={{ color: "var(--muted-foreground)" }}>
                      <Users className="w-3 h-3" /> {e.candidate_count || 0}
                    </span>
                    {phase && (
                      <span className="text-[10px]" style={{ color: "var(--muted-foreground)" }}>
                        {phase}
                      </span>
                    )}
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" style={{ color: "var(--muted-foreground)" }} />
              </Link>
            );
          })}
        </div>
      )}

      {/* View all */}
      {elections.length > 0 && (
        <div className="pt-2 border-t" style={{ borderColor: "var(--border)" }}>
          <Link
            href={`/elections?group=${groupId}`}
            className="text-sm text-purple-400 hover:text-purple-300 transition-colors flex items-center gap-1"
          >
            {t("groups.miniPangea.viewAllElections")}
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      )}
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { FileText, Clock, Flame, CheckCircle2, Plus, ChevronRight, ArrowUpCircle } from "lucide-react";
import { useLanguage } from "@/components/core/language-provider";
import UidBadge from "@/components/ui/UidBadge";
import type { Proposal, ProposalStatus } from "@/lib/types";

interface GroupProposalsProps {
  groupId: string;
  groupName: string;
  isMember: boolean;
  isGuest: boolean;
}

const STATUS_CONFIG: Record<ProposalStatus, { icon: typeof FileText; colorClass: string }> = {
  draft: { icon: FileText, colorClass: "text-slate-400 bg-slate-500/15" },
  curation: { icon: Flame, colorClass: "text-amber-400 bg-amber-500/15" },
  active: { icon: Clock, colorClass: "text-blue-400 bg-blue-500/15" },
  closed: { icon: CheckCircle2, colorClass: "text-green-400 bg-green-500/15" },
  repealed: { icon: FileText, colorClass: "text-red-400 bg-red-500/15" },
};

export default function GroupProposals({ groupId, groupName, isMember, isGuest }: GroupProposalsProps) {
  const { t } = useLanguage();
  const supabase = createClient();
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | ProposalStatus>("all");

  useEffect(() => {
    loadProposals();
  }, [groupId, filter]);

  async function loadProposals() {
    setLoading(true);
    let query = supabase
      .from("proposals")
      .select("*")
      .eq("group_id", groupId)
      .order("created_at", { ascending: false })
      .limit(50);

    if (filter !== "all") {
      query = query.eq("status", filter);
    }

    const { data } = await query;
    setProposals((data as Proposal[]) || []);
    setLoading(false);
  }

  function getTimeLeft(expiresAt: string | null): string | null {
    if (!expiresAt) return null;
    const diff = new Date(expiresAt).getTime() - Date.now();
    if (diff <= 0) return t("groups.miniPangea.expired");
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    if (days > 0) return `${days}d ${hours}h`;
    return `${hours}h`;
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
          <FileText className="w-5 h-5 text-purple-400" />
          <span className="text-sm font-semibold" style={{ color: "var(--foreground)" }}>
            {proposals.length} {proposals.length === 1 ? t("groups.miniPangea.proposal") : t("groups.miniPangea.proposals")}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {/* Filter pills */}
          <div className="flex gap-1">
            {(["all", "active", "curation", "closed"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  filter === f
                    ? "bg-purple-500/20 text-purple-300 border border-purple-500/30"
                    : "hover:bg-[var(--muted)]"
                }`}
                style={filter !== f ? { color: "var(--muted-foreground)" } : undefined}
              >
                {t(`groups.miniPangea.filter.${f}`)}
              </button>
            ))}
          </div>
          {/* New Proposal button */}
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

      {/* Proposals list */}
      {proposals.length === 0 ? (
        <div className="text-center py-12">
          <FileText className="w-10 h-10 mx-auto mb-3 opacity-30" style={{ color: "var(--muted-foreground)" }} />
          <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>
            {t("groups.miniPangea.noProposals")}
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
          {proposals.map((p) => {
            const cfg = STATUS_CONFIG[p.status] || STATUS_CONFIG.draft;
            const Icon = cfg.icon;
            const timeLeft = p.status === "active" ? getTimeLeft(p.expires_at) : null;

            return (
              <Link
                key={p.id}
                href={`/proposals/${p.id}`}
                className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-[var(--muted)] transition-colors group"
              >
                <span className={`flex items-center justify-center w-8 h-8 rounded-lg shrink-0 ${cfg.colorClass}`}>
                  <Icon className="w-4 h-4" />
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate" style={{ color: "var(--foreground)" }}>
                    {p.title}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className={`text-[10px] font-semibold uppercase ${cfg.colorClass} px-1.5 py-0.5 rounded`}>
                      {t(`groups.miniPangea.filter.${p.status}`)}
                    </span>
                    {timeLeft && (
                      <span className="text-[10px]" style={{ color: "var(--muted-foreground)" }}>
                        {timeLeft}
                      </span>
                    )}
                    {p.signal_count !== undefined && p.signal_count > 0 && (
                      <span className="flex items-center gap-0.5 text-[10px]" style={{ color: "var(--muted-foreground)" }}>
                        <ArrowUpCircle className="w-3 h-3" /> {p.signal_count}
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

      {/* View all link */}
      {proposals.length > 0 && (
        <div className="pt-2 border-t" style={{ borderColor: "var(--border)" }}>
          <Link
            href={`/proposals?group=${groupId}`}
            className="text-sm text-purple-400 hover:text-purple-300 transition-colors flex items-center gap-1"
          >
            {t("groups.miniPangea.viewAllProposals")}
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      )}
    </div>
  );
}

"use client";

import {
  Plus,
  Globe,
  FileText,
  Clock,
  CheckCircle2,
  Flame,
  Users,
  BookOpen,
  Vote,
  Flag,
} from "lucide-react";
import Link from "next/link";
import ProposalCard from "@/components/ProposalCard";
import StatCard from "@/components/StatCard";
import type { Proposal, ProposalWithResults } from "@/lib/types";
import { useLanguage } from "@/components/language-provider";

interface DashboardClientProps {
  isGuest: boolean;
  userEmail?: string;
  fullName?: string | null;
  enrichedProposals: ProposalWithResults[];
  drafts: Proposal[];
  platformStats: {
    total_users: number;
    total_proposals: number;
    total_votes: number;
    active_proposals: number;
    closed_proposals: number;
  };
  curationThreshold?: number;
}

export default function DashboardClient({
  isGuest,
  userEmail,
  fullName,
  enrichedProposals,
  drafts,
  platformStats,
  curationThreshold = 2,
}: DashboardClientProps) {
  const { t } = useLanguage();

  const activeProposals = enrichedProposals.filter((p) => p.status === "active");
  const curationProposals = enrichedProposals.filter((p) => p.status === "curation");
  const closedProposals = enrichedProposals.filter((p) => p.status === "closed");
  const recentProposals = enrichedProposals.slice(0, 5);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* ── Header ── */}
      <div className="flex items-start sm:items-center justify-between flex-col sm:flex-row gap-4 mb-8">
        <div className="flex-1 min-w-0">
          <h1
            className="text-2xl font-bold flex items-center gap-2"
            style={{ color: "var(--foreground)" }}
          >
            <Globe
              className="w-6 h-6 shrink-0"
              style={{ color: "var(--primary)" }}
              strokeWidth={1.5}
            />
            Pangea
          </h1>
          <p
            className="text-sm mt-1"
            style={{ color: "var(--muted-foreground)" }}
          >
            {isGuest ? (
              <>
                {t("dashboard.welcomeTo")}{" "}
                <Link
                  href="/auth"
                  className="hover:underline"
                  style={{ color: "var(--primary)" }}
                >
                  {t("dashboard.signUp")}
                </Link>{" "}
                {t("dashboard.signUpToParticipate")}
              </>
            ) : (
              <>
                {t("dashboard.welcome")},{" "}
                <span className="font-medium" style={{ color: "var(--foreground)" }}>
                  {fullName || userEmail}
                </span>
              </>
            )}
          </p>
        </div>
        {!isGuest && (
          <Link
            href="/proposals/new"
            className="btn-primary inline-flex items-center gap-2 text-sm shrink-0"
          >
            <Plus className="w-4 h-4" />
            {t("nav.newProposal")}
          </Link>
        )}
      </div>

      {/* ── Bento Grid: Stat Cards ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <StatCard
          label={t("dashboard.activeCitizens")}
          value={platformStats.total_users}
          icon={Users}
          trend={t("dashboard.growth12")}
        />
        <StatCard
          label={t("dashboard.openProposals")}
          value={platformStats.active_proposals + (curationProposals?.length ?? 0)}
          icon={FileText}
          trend={`${curationProposals.length} ${t("dashboard.inReviewShort")}`}
        />
        <StatCard
          label={t("dashboard.votesCast")}
          value={platformStats.total_votes}
          icon={Vote}
          trend={`${closedProposals.length} ${t("dashboard.concluded")}`}
        />
      </div>

      {/* ── Bento Grid: Activity + Quick Links ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-10">
        {/* Recent Activity — spans 2 cols on desktop */}
        <div className="lg:col-span-2">
          <div className="card p-5">
            <h2
              className="text-base font-semibold mb-4 flex items-center gap-2"
              style={{ color: "var(--foreground)" }}
            >
              <Clock className="w-4 h-4" style={{ color: "var(--primary)" }} />
              {t("dashboard.recentActivity")}
            </h2>
            {recentProposals.length > 0 ? (
              <div className="space-y-3">
                {recentProposals.map((proposal) => {
                  const statusStyles: Record<
                    string,
                    { bg: string; text: string; label: string }
                  > = {
                    active: {
                      bg: "var(--success)",
                      text: "#ffffff",
                      label: t("dashboard.active"),
                    },
                    curation: {
                      bg: "#d97706",
                      text: "#ffffff",
                      label: t("dashboard.review"),
                    },
                    closed: {
                      bg: "var(--muted-foreground)",
                      text: "#ffffff",
                      label: t("dashboard.closed"),
                    },
                  };
                  const st = statusStyles[proposal.status] ?? statusStyles.closed;

                  return (
                    <Link
                      key={proposal.id}
                      href={`/proposals/${proposal.id}`}
                      className="flex items-center gap-3 p-3 rounded-lg transition-colors duration-150"
                      style={{
                        backgroundColor: "transparent",
                      }}
                    >
                      <div className="activity-row flex items-center gap-3 w-full">
                        <span
                          className="text-xs font-medium px-2 py-0.5 rounded-full shrink-0"
                          style={{
                            backgroundColor: st.bg,
                            color: st.text,
                          }}
                        >
                          {st.label}
                        </span>
                        <span
                          className="text-sm font-medium truncate flex-1"
                          style={{ color: "var(--foreground)" }}
                        >
                          {proposal.title}
                        </span>
                        <span
                          className="text-xs shrink-0"
                          style={{ color: "var(--muted-foreground)" }}
                        >
                          {new Date(proposal.created_at).toLocaleDateString(
                            "en-US",
                            { month: "short", day: "numeric" }
                          )}
                        </span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            ) : (
              <p
                className="text-sm text-center py-6"
                style={{ color: "var(--muted-foreground)" }}
              >
                {t("dashboard.noRecentActivity")}
              </p>
            )}
          </div>
        </div>

        {/* Quick Links — 1 col */}
        <div className="card p-5">
          <h2
            className="text-base font-semibold mb-4 flex items-center gap-2"
            style={{ color: "var(--foreground)" }}
          >
            <Globe className="w-4 h-4" style={{ color: "var(--primary)" }} />
            {t("dashboard.quickLinks")}
          </h2>
          <div className="space-y-2">
            <Link
              href="/laws"
              className="flex items-center gap-3 p-3 rounded-lg transition-colors duration-150 hover:opacity-80"
              style={{ backgroundColor: "var(--secondary)" }}
            >
              <BookOpen className="w-4 h-4" style={{ color: "var(--primary)" }} />
              <span className="text-sm font-medium" style={{ color: "var(--foreground)" }}>
                {t("dashboard.pangeaCodes")}
              </span>
            </Link>
            <Link
              href="/parties"
              className="flex items-center gap-3 p-3 rounded-lg transition-colors duration-150 hover:opacity-80"
              style={{ backgroundColor: "var(--secondary)" }}
            >
              <Flag className="w-4 h-4" style={{ color: "var(--primary)" }} />
              <span className="text-sm font-medium" style={{ color: "var(--foreground)" }}>
                {t("dashboard.politicalParties")}
              </span>
            </Link>
            {!isGuest && (
              <Link
                href="/dashboard/delegations"
                className="flex items-center gap-3 p-3 rounded-lg transition-colors duration-150 hover:opacity-80"
                style={{ backgroundColor: "var(--secondary)" }}
              >
                <Users className="w-4 h-4" style={{ color: "var(--primary)" }} />
                <span className="text-sm font-medium" style={{ color: "var(--foreground)" }}>
                  {t("dashboard.yourDelegationsLink")}
                </span>
              </Link>
            )}
            {!isGuest && drafts.length > 0 && (
              <a
                href="#drafts"
                className="flex items-center gap-3 p-3 rounded-lg transition-colors duration-150 hover:opacity-80"
                style={{ backgroundColor: "var(--secondary)" }}
              >
                <FileText className="w-4 h-4" style={{ color: "var(--muted-foreground)" }} />
                <span className="text-sm font-medium" style={{ color: "var(--foreground)" }}>
                  {drafts.length} {t("dashboard.draftCount")}
                </span>
              </a>
            )}
          </div>
        </div>
      </div>

      {/* ── Proposal Sections ── */}
      <div className="space-y-10">
        {/* 1. Active Votes */}
        <section id="active-votes">
          <h2
            className="text-base font-semibold mb-4 flex items-center gap-2"
            style={{ color: "var(--foreground)" }}
          >
            <Clock className="w-4.5 h-4.5" style={{ color: "var(--primary)" }} />
            {t("dashboard.activeVotes")}
            <span
              className="text-xs font-normal"
              style={{ color: "var(--muted-foreground)" }}
            >
              — {activeProposals.length} {t("dashboard.inVoting")}
            </span>
          </h2>
          {activeProposals.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {activeProposals.map((proposal) => (
                <ProposalCard key={proposal.id} proposal={proposal} curationThreshold={curationThreshold} />
              ))}
            </div>
          ) : (
            <div className="card p-5 text-center text-sm" style={{ color: "var(--muted-foreground)" }}>
              {t("dashboard.noActiveVotes")}
            </div>
          )}
        </section>

        {/* 2. Community Review */}
        <section id="community-review">
          <h2
            className="text-base font-semibold mb-4 flex items-center gap-2"
            style={{ color: "var(--foreground)" }}
          >
            <Flame className="w-4.5 h-4.5" style={{ color: "#d97706" }} />
            {t("dashboard.communityReview")}
            <span
              className="text-xs font-normal"
              style={{ color: "var(--muted-foreground)" }}
            >
              — {curationProposals.length} {t("dashboard.underReview")}
            </span>
          </h2>
          {curationProposals.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {curationProposals.map((proposal) => (
                <ProposalCard key={proposal.id} proposal={proposal} curationThreshold={curationThreshold} />
              ))}
            </div>
          ) : (
            <div className="card p-5 text-center text-sm" style={{ color: "var(--muted-foreground)" }}>
              {t("dashboard.noCommunityReview")}
            </div>
          )}
        </section>

        {/* 3. Archive */}
        <section id="archive">
          <h2
            className="text-base font-semibold mb-4 flex items-center gap-2"
            style={{ color: "var(--foreground)" }}
          >
            <CheckCircle2 className="w-4.5 h-4.5" style={{ color: "var(--success)" }} />
            {t("dashboard.archive")}
            <span
              className="text-xs font-normal"
              style={{ color: "var(--muted-foreground)" }}
            >
              — {closedProposals.length} {t("dashboard.concludedVotes")}
            </span>
          </h2>
          {closedProposals.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {closedProposals.map((proposal) => (
                <ProposalCard key={proposal.id} proposal={proposal} curationThreshold={curationThreshold} />
              ))}
            </div>
          ) : (
            <div className="card p-5 text-center text-sm" style={{ color: "var(--muted-foreground)" }}>
              {t("dashboard.noConcluded")}
            </div>
          )}
        </section>

        {/* 4. Drafts (authenticated users only) */}
        {!isGuest && drafts && drafts.length > 0 && (
          <section id="drafts">
            <h2
              className="text-base font-semibold mb-4 flex items-center gap-2"
              style={{ color: "var(--foreground)" }}
            >
              <FileText className="w-4.5 h-4.5" style={{ color: "var(--muted-foreground)" }} />
              {t("dashboard.yourDrafts")}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {drafts.map((proposal: Proposal) => (
                <ProposalCard key={proposal.id} proposal={proposal} curationThreshold={curationThreshold} />
              ))}
            </div>
          </section>
        )}

        {/* Empty state */}
        {enrichedProposals.length === 0 && drafts.length === 0 && (
          <div className="text-center py-16 card">
            <Globe
              className="w-14 h-14 mx-auto mb-4"
              style={{ color: "var(--muted-foreground)" }}
              strokeWidth={1}
            />
            <h3
              className="text-lg font-semibold mb-2"
              style={{ color: "var(--foreground)" }}
            >
              {t("dashboard.pangeaQuiet")}
            </h3>
            <p
              className="mb-6 max-w-md mx-auto text-sm"
              style={{ color: "var(--muted-foreground)" }}
            >
              {isGuest
                ? t("dashboard.signUpFirst")
                : t("dashboard.beFirst")}
            </p>
            {!isGuest && (
              <Link
                href="/proposals/new"
                className="btn-primary inline-flex items-center gap-2 text-sm"
              >
                <Plus className="w-4 h-4" />
                {t("dashboard.submitFirst")}
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

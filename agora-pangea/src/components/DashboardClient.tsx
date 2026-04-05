"use client";

import { useState } from "react";
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
  ChevronDown,
  ChevronRight,
  ArrowRight,
} from "lucide-react";
import Link from "next/link";
import ProposalCard from "@/components/ProposalCard";
import StatCard from "@/components/StatCard";
import TranslatedContent from "@/components/TranslatedContent";
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
                      className="activity-row flex items-center gap-3 p-3 rounded-lg"
                    >
                      <div className="flex items-center gap-3 w-full">
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
                          <TranslatedContent
                            text={proposal.title}
                            contentType="proposal_title"
                            contentId={proposal.id}
                            compact
                          />
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

      {/* ── Proposal Macro Sections ── */}
      <ProposalSections
        activeProposals={activeProposals}
        curationProposals={curationProposals}
        closedProposals={closedProposals}
        drafts={drafts}
        isGuest={isGuest}
        curationThreshold={curationThreshold}
        enrichedProposals={enrichedProposals}
        t={t}
      />
    </div>
  );
}

/* ── Collapsible Macro Section Component ── */
const PREVIEW_COUNT = 6;

interface MacroSectionProps {
  id: string;
  icon: React.ReactNode;
  title: string;
  count: number;
  subtitle: string;
  accentColor: string;
  proposals: (ProposalWithResults | Proposal)[];
  curationThreshold: number;
  emptyMessage: string;
  filterStatus?: string;
}

function MacroSection({
  id,
  icon,
  title,
  count,
  subtitle,
  accentColor,
  proposals,
  curationThreshold,
  emptyMessage,
  filterStatus,
}: MacroSectionProps) {
  const [expanded, setExpanded] = useState(true);
  const showViewAll = proposals.length > PREVIEW_COUNT;
  const displayed = expanded ? proposals.slice(0, PREVIEW_COUNT) : [];

  return (
    <section id={id}>
      {/* Section header — clickable to collapse/expand */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 mb-4 group text-left"
      >
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {expanded ? (
            <ChevronDown className="w-4 h-4 shrink-0" style={{ color: accentColor }} />
          ) : (
            <ChevronRight className="w-4 h-4 shrink-0" style={{ color: accentColor }} />
          )}
          {icon}
          <h2
            className="text-base font-semibold"
            style={{ color: "var(--foreground)" }}
          >
            {title}
          </h2>
          <span
            className="text-xs font-semibold px-2 py-0.5 rounded-full shrink-0"
            style={{
              backgroundColor: `color-mix(in srgb, ${accentColor} 15%, transparent)`,
              color: accentColor,
            }}
          >
            {count}
          </span>
          <span
            className="text-xs font-normal hidden sm:inline"
            style={{ color: "var(--muted-foreground)" }}
          >
            {subtitle}
          </span>
        </div>
      </button>

      {/* Proposals grid */}
      {expanded && (
        <>
          {displayed.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {displayed.map((proposal) => (
                <ProposalCard
                  key={proposal.id}
                  proposal={proposal}
                  curationThreshold={curationThreshold}
                />
              ))}
            </div>
          ) : (
            <div
              className="card p-5 text-center text-sm"
              style={{ color: "var(--muted-foreground)" }}
            >
              {emptyMessage}
            </div>
          )}

          {/* View All link */}
          {showViewAll && filterStatus && (
            <div className="mt-4 text-center">
              <Link
                href={`/proposals?status=${filterStatus}`}
                className="inline-flex items-center gap-1.5 text-sm font-medium transition-colors hover:opacity-80"
                style={{ color: accentColor }}
              >
                View all {count} proposals
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          )}
        </>
      )}
    </section>
  );
}

/* ── Proposal Sections Container ── */
function ProposalSections({
  activeProposals,
  curationProposals,
  closedProposals,
  drafts,
  isGuest,
  curationThreshold,
  enrichedProposals,
  t,
}: {
  activeProposals: ProposalWithResults[];
  curationProposals: ProposalWithResults[];
  closedProposals: ProposalWithResults[];
  drafts: Proposal[];
  isGuest: boolean;
  curationThreshold: number;
  enrichedProposals: ProposalWithResults[];
  t: (key: string) => string;
}) {
  return (
    <div className="space-y-10">
      {/* 1. Active Votes */}
      <MacroSection
        id="active-votes"
        icon={<Clock className="w-4.5 h-4.5" style={{ color: "var(--primary)" }} />}
        title={t("dashboard.activeVotes")}
        count={activeProposals.length}
        subtitle={t("dashboard.inVoting")}
        accentColor="var(--primary)"
        proposals={activeProposals}
        curationThreshold={curationThreshold}
        emptyMessage={t("dashboard.noActiveVotes")}
        filterStatus="active"
      />

      {/* 2. Community Review */}
      <MacroSection
        id="community-review"
        icon={<Flame className="w-4.5 h-4.5" style={{ color: "#d97706" }} />}
        title={t("dashboard.communityReview")}
        count={curationProposals.length}
        subtitle={t("dashboard.underReview")}
        accentColor="#d97706"
        proposals={curationProposals}
        curationThreshold={curationThreshold}
        emptyMessage={t("dashboard.noCommunityReview")}
        filterStatus="curation"
      />

      {/* 3. Archive */}
      <MacroSection
        id="archive"
        icon={<CheckCircle2 className="w-4.5 h-4.5" style={{ color: "var(--success)" }} />}
        title={t("dashboard.archive")}
        count={closedProposals.length}
        subtitle={t("dashboard.concludedVotes")}
        accentColor="var(--success)"
        proposals={closedProposals}
        curationThreshold={curationThreshold}
        emptyMessage={t("dashboard.noConcluded")}
        filterStatus="closed"
      />

      {/* 4. Drafts (authenticated users only) */}
      {!isGuest && drafts && drafts.length > 0 && (
        <MacroSection
          id="drafts"
          icon={<FileText className="w-4.5 h-4.5" style={{ color: "var(--muted-foreground)" }} />}
          title={t("dashboard.yourDrafts")}
          count={drafts.length}
          subtitle=""
          accentColor="var(--muted-foreground)"
          proposals={drafts}
          curationThreshold={curationThreshold}
          emptyMessage=""
          filterStatus="draft"
        />
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
  );
}

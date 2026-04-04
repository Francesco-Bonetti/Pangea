"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { Vote, Plus, Users, Calendar, Trophy, Clock, ChevronRight, MapPin, Flag } from "lucide-react";
import type { Election, ElectionStatus } from "@/lib/types";

const STATUS_CONFIG: Record<ElectionStatus, { label: string; color: string; bg: string }> = {
  upcoming: { label: "Upcoming", color: "text-blue-400", bg: "bg-blue-500/20 border-blue-500/30" },
  candidature: { label: "Open for Candidates", color: "text-amber-400", bg: "bg-amber-500/20 border-amber-500/30" },
  voting: { label: "Voting Open", color: "text-fg-success", bg: "bg-green-500/20 border-green-500/30" },
  closed: { label: "Closed", color: "text-fg-muted", bg: "bg-slate-500/20 border-slate-500/30" },
  cancelled: { label: "Cancelled", color: "text-fg-danger", bg: "bg-red-500/20 border-red-500/30" },
};

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function getPhaseInfo(election: Election) {
  const now = new Date();
  if (election.status === "candidature") {
    const end = new Date(election.candidature_end);
    const diff = end.getTime() - now.getTime();
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    return days > 0 ? `${days} day${days !== 1 ? "s" : ""} left to register` : "Closing soon";
  }
  if (election.status === "voting") {
    const end = new Date(election.voting_end);
    const diff = end.getTime() - now.getTime();
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    return days > 0 ? `${days} day${days !== 1 ? "s" : ""} left to vote` : "Closing soon";
  }
  if (election.status === "upcoming") {
    return `Starts ${formatDate(election.candidature_start)}`;
  }
  return null;
}

interface ElectionsClientProps {
  isAdmin: boolean;
}

export default function ElectionsClient({ isAdmin }: ElectionsClientProps) {
  const supabase = createClient();
  const [elections, setElections] = useState<Election[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | ElectionStatus>("all");

  useEffect(() => {
    loadElections();
  }, [filter]);

  async function loadElections() {
    setLoading(true);
    let query = supabase
      .from("elections")
      .select("*, profiles:created_by(full_name), jurisdictions(name, logo_emoji), parties!elections_party_id_fkey(name, logo_emoji)")
      .order("created_at", { ascending: false });

    if (filter !== "all") {
      query = query.eq("status", filter);
    }

    const { data } = await query;

    // Get candidate counts
    if (data && data.length > 0) {
      const electionIds = data.map((e: Election) => e.id);
      const { data: candidates } = await supabase
        .from("candidates")
        .select("election_id")
        .in("election_id", electionIds)
        .in("status", ["registered", "approved"]);

      const countMap: Record<string, number> = {};
      candidates?.forEach((c: { election_id: string }) => {
        countMap[c.election_id] = (countMap[c.election_id] || 0) + 1;
      });

      data.forEach((e: Election) => {
        e.candidate_count = countMap[e.id] || 0;
      });
    }

    setElections((data as Election[]) || []);
    setLoading(false);
  }

  const filters: { key: "all" | ElectionStatus; label: string }[] = [
    { key: "all", label: "All" },
    { key: "voting", label: "Voting" },
    { key: "candidature", label: "Candidates" },
    { key: "upcoming", label: "Upcoming" },
    { key: "closed", label: "Closed" },
  ];

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-fg flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gradient-to-br from-purple-600 to-purple-700">
              <Vote className="w-6 h-6 text-fg" />
            </div>
            Elections
          </h1>
          <p className="text-fg-muted mt-2">
            Vote for candidates, run for office, and shape the governance of Pangea.
          </p>
        </div>
        {isAdmin && (
          <Link
            href="/elections/new"
            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-500 hover:to-purple-600 text-fg text-sm font-medium rounded-lg transition-all duration-150 hover:scale-105 active:scale-95 shadow-lg"
          >
            <Plus className="w-4 h-4" />
            New Election
          </Link>
        )}
      </div>

      {/* Info Box */}
      <div className="mb-6 p-4 bg-purple-500/10 border border-purple-500/20 rounded-lg">
        <p className="text-sm text-purple-300">
          <strong>How elections work:</strong> Each election goes through phases — first candidates register, then citizens vote.
          Your vote is private and weighted by any delegations you hold. For example, if 3 citizens delegated their vote to you, your vote counts as 4.
        </p>
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {filters.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`px-4 py-2 text-sm rounded-lg border transition-all duration-150 ${
              filter === f.key
                ? "bg-purple-600 border-purple-500 text-fg"
                : "bg-theme-card border-theme text-fg-muted hover:text-fg hover:border-theme"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Elections List */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 bg-theme-card rounded-xl animate-pulse" />
          ))}
        </div>
      ) : elections.length === 0 ? (
        <div className="text-center py-16 bg-theme-card/30 rounded-xl border border-theme">
          <Vote className="w-12 h-12 text-fg-muted mx-auto mb-3" />
          <p className="text-fg-muted text-lg">No elections found</p>
          <p className="text-fg-muted text-sm mt-1">
            {filter !== "all" ? "Try a different filter" : "Elections will appear here when created by administrators"}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {elections.map((election) => {
            const config = STATUS_CONFIG[election.status];
            const phaseInfo = getPhaseInfo(election);
            return (
              <Link
                key={election.id}
                href={`/elections/${election.id}`}
                className="block bg-theme-card border border-theme rounded-xl p-5 hover:border-purple-500/50 hover:bg-theme-card transition-all duration-200 group"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    {/* Title + Status */}
                    <div className="flex items-center gap-3 flex-wrap mb-2">
                      <h3 className="text-lg font-semibold text-fg group-hover:text-purple-300 transition-colors">
                        {election.title}
                      </h3>
                      <span className={`px-2.5 py-0.5 text-xs font-medium rounded-full border ${config.bg} ${config.color}`}>
                        {config.label}
                      </span>
                    </div>

                    {/* Position */}
                    <div className="flex items-center gap-2 mb-3">
                      <Trophy className="w-4 h-4 text-amber-500" />
                      <span className="text-sm text-fg">{election.position_name}</span>
                      {election.max_winners > 1 && (
                        <span className="text-xs text-fg-muted">({election.max_winners} seats)</span>
                      )}
                    </div>

                    {/* Description */}
                    {election.description && (
                      <p className="text-sm text-fg-muted mb-3 line-clamp-2">{election.description}</p>
                    )}

                    {/* Meta */}
                    <div className="flex items-center gap-4 flex-wrap text-xs text-fg-muted">
                      <span className="flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5" />
                        {election.candidate_count || 0} candidate{(election.candidate_count || 0) !== 1 ? "s" : ""}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5" />
                        {formatDate(election.voting_start)} — {formatDate(election.voting_end)}
                      </span>
                      {election.jurisdictions && (
                        <span className="flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5" />
                          {election.jurisdictions.logo_emoji} {election.jurisdictions.name}
                        </span>
                      )}
                      {election.parties && (
                        <span className="flex items-center gap-1.5">
                          <Flag className="w-3.5 h-3.5" />
                          {election.parties.logo_emoji} {election.parties.name}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Right: phase info + arrow */}
                  <div className="flex flex-col items-end gap-2 shrink-0">
                    {phaseInfo && (
                      <span className="flex items-center gap-1.5 text-xs text-fg-muted">
                        <Clock className="w-3.5 h-3.5" />
                        {phaseInfo}
                      </span>
                    )}
                    <ChevronRight className="w-5 h-5 text-fg-muted group-hover:text-purple-400 transition-colors mt-2" />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

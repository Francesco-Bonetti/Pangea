import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import AppShell from "@/components/AppShell";
import ElectionVotingBooth from "@/components/ElectionVotingBooth";
import Link from "next/link";
import { ArrowLeft, Calendar, Trophy, MapPin, Flag, User, Clock } from "lucide-react";
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
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function ElectionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Fetch election (no profiles join — created_by FK points to auth.users, not profiles)
  const { data: election } = await supabase
    .from("elections")
    .select("*, jurisdictions(name, logo_emoji), parties!elections_party_id_fkey(name, logo_emoji)")
    .eq("id", id)
    .single();

  if (!election) notFound();

  // Fetch creator name separately
  let creatorName = "Admin";
  if (election.created_by) {
    const { data: creatorProfile } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", election.created_by)
      .single();
    if (creatorProfile?.full_name) creatorName = creatorProfile.full_name;
  }

  // User data
  let userName: string | null = null;
  let userEmail: string | null = null;
  let userRole = "citizen";
  let pendingDelegations = 0;

  if (user) {
    userEmail = user.email ?? null;
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, role")
      .eq("id", user.id)
      .single();
    userName = profile?.full_name ?? null;
    userRole = profile?.role ?? "citizen";

    const { count } = await supabase
      .from("delegations")
      .select("*", { count: "exact", head: true })
      .eq("delegate_id", user.id)
      .eq("status", "pending");
    pendingDelegations = count ?? 0;
  }

  const config = STATUS_CONFIG[(election as Election).status];

  // Timeline phases
  const phases = [
    { label: "Candidature Opens", date: election.candidature_start, active: election.status === "candidature" },
    { label: "Candidature Closes", date: election.candidature_end, active: false },
    { label: "Voting Opens", date: election.voting_start, active: election.status === "voting" },
    { label: "Voting Closes", date: election.voting_end, active: false },
  ];

  return (
    <AppShell
      userEmail={userEmail}
      userName={userName}
      userRole={userRole}
      isGuest={!user}
      pendingDelegations={pendingDelegations}
    >
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Back */}
        <Link
          href="/elections"
          className="inline-flex items-center gap-2 text-sm text-fg-muted hover:text-fg transition-colors mb-6 overflow-hidden"
        >
          <ArrowLeft className="w-4 h-4 shrink-0" />
          <span className="truncate">Back to Elections</span>
        </Link>

        {/* Header */}
        <div className="bg-theme-card border border-theme rounded-xl p-6 mb-6 overflow-hidden">
          <div className="flex items-start justify-between gap-4 mb-4 overflow-hidden">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-3 flex-wrap mb-2 overflow-hidden">
                <h1 className="text-2xl font-bold text-fg truncate">{election.title}</h1>
                <span className={`px-3 py-1 text-xs font-medium rounded-full border shrink-0 ${config.bg} ${config.color}`}>
                  {config.label}
                </span>
              </div>

              <div className="flex items-center gap-2 mb-3 flex-wrap">
                <Trophy className="w-5 h-5 text-amber-500 shrink-0" />
                <span className="text-base text-fg font-medium">{election.position_name}</span>
                {election.max_winners > 1 && (
                  <span className="text-sm text-fg-muted shrink-0">({election.max_winners} seats)</span>
                )}
              </div>
            </div>
          </div>

          {/* Description */}
          {election.description && (
            <p className="text-fg-muted mb-4 leading-relaxed">{election.description}</p>
          )}

          {/* Meta */}
          <div className="flex items-center gap-4 flex-wrap text-sm text-fg-muted overflow-hidden">
            {election.jurisdictions && (
              <span className="flex items-center gap-1.5 shrink-0">
                <MapPin className="w-4 h-4 shrink-0" />
                <span className="truncate">{election.jurisdictions.logo_emoji} {election.jurisdictions.name}</span>
              </span>
            )}
            {election.parties && (
              <span className="flex items-center gap-1.5 shrink-0">
                <Flag className="w-4 h-4 shrink-0" />
                <span className="truncate">{election.parties.logo_emoji} {election.parties.name}</span>
              </span>
            )}
            <span className="flex items-center gap-1.5 shrink-0">
              <User className="w-4 h-4 shrink-0" />
              <span className="truncate">Created by {creatorName}</span>
            </span>
          </div>
        </div>

        {/* Timeline */}
        <div className="bg-theme-card border border-theme rounded-xl p-5 mb-6 overflow-hidden">
          <h3 className="text-sm font-semibold text-fg uppercase tracking-wider mb-4 flex items-center gap-2 overflow-hidden">
            <Clock className="w-4 h-4 shrink-0" />
            <span className="truncate">Election Timeline</span>
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {phases.map((phase, i) => {
              const isPast = new Date(phase.date) < new Date();
              return (
                <div
                  key={i}
                  className={`flex items-center gap-3 p-3 rounded-lg border ${
                    phase.active
                      ? "border-purple-500/50 bg-purple-500/10"
                      : isPast
                      ? "border-theme bg-theme-base opacity-60"
                      : "border-theme bg-theme-base"
                  }`}
                >
                  <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                    phase.active ? "bg-purple-500 animate-pulse" : isPast ? "bg-theme-muted" : "bg-slate-500"
                  }`} />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-fg-muted truncate">{phase.label}</p>
                    <p className="text-sm text-fg truncate">{formatDate(phase.date)}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Voting Booth / Candidates / Results */}
        <ElectionVotingBooth
          election={election as Election}
          userId={user?.id ?? null}
          isGuest={!user}
        />
      </div>
    </AppShell>
  );
}

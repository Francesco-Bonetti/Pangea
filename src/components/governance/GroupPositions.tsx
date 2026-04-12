"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { ShieldCheck, Vote, User, ChevronRight, Loader2 } from "lucide-react";
import { useLanguage } from "@/components/core/language-provider";
import Link from "next/link";

interface PositionHolder {
  user_id: string;
  full_name: string;
  avatar_url: string | null;
  started_at: string;
  election_id: string | null;
}

interface GroupPosition {
  id: string;
  position_key: string;
  display_name: string;
  description: string;
  role_to_assign: string;
  required_members: number;
  max_holders: number;
  is_active: boolean;
  current_member_count: number;
  threshold_met: boolean;
  current_holders: PositionHolder[];
}

interface GroupPositionsProps {
  groupId: string;
  canManageElections: boolean;
}

export default function GroupPositions({ groupId, canManageElections }: GroupPositionsProps) {
  const { t } = useLanguage();
  const supabase = createClient();
  const [positions, setPositions] = useState<GroupPosition[]>([]);
  const [activeElectionMap, setActiveElectionMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [startingElection, setStartingElection] = useState<string | null>(null);

  useEffect(() => {
    loadPositions();
  }, [groupId]);

  async function loadPositions() {
    setLoading(true);

    // Get positions via RPC
    const { data, error } = await supabase.rpc("get_group_positions", {
      p_group_id: groupId,
    });

    if (error || !data) {
      setLoading(false);
      return;
    }

    setPositions(data as GroupPosition[]);

    // Check for active elections linked to these positions
    const positionIds = (data as GroupPosition[]).map((p) => p.id);
    if (positionIds.length > 0) {
      const { data: activeElections } = await supabase
        .from("elections")
        .select("id, position_id")
        .in("position_id", positionIds)
        .in("status", ["upcoming", "candidature", "voting"]);

      const map: Record<string, string> = {};
      activeElections?.forEach((e: { id: string; position_id: string }) => {
        map[e.position_id] = e.id;
      });
      setActiveElectionMap(map);
    }

    setLoading(false);
  }

  async function handleStartElection(positionId: string) {
    setStartingElection(positionId);

    const { data, error } = await supabase.rpc("create_position_election", {
      p_group_id: groupId,
      p_position_id: positionId,
      p_candidature_days: 3,
      p_voting_days: 5,
    });

    if (error) {
      alert(error.message);
      setStartingElection(null);
      return;
    }

    const result = data as { success: boolean; election_id?: string; error?: string };
    if (!result.success) {
      alert(result.error || "Failed to create election");
      setStartingElection(null);
      return;
    }

    // Reload positions and redirect to election
    if (result.election_id) {
      window.location.href = `/elections/${result.election_id}`;
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-5 h-5 animate-spin" style={{ color: "var(--muted-foreground)" }} />
      </div>
    );
  }

  if (positions.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 px-1">
        <ShieldCheck className="w-4 h-4 text-cyan-400" />
        <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--muted-foreground)" }}>
          {t("positions.title")}
        </span>
      </div>

      {positions.map((pos) => {
        const hasHolder = pos.current_holders.length > 0;
        const activeElectionId = activeElectionMap[pos.id];
        const canStart = canManageElections && !hasHolder && !activeElectionId;

        return (
          <div
            key={pos.id}
            className="rounded-lg border p-4"
            style={{ borderColor: "var(--border)", background: "var(--card)" }}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-cyan-400 shrink-0" />
                  <span className="text-sm font-semibold" style={{ color: "var(--foreground)" }}>
                    {pos.display_name}
                  </span>
                </div>
                <p className="text-xs mt-1" style={{ color: "var(--muted-foreground)" }}>
                  {pos.description}
                </p>
              </div>

              {/* Action area */}
              <div className="shrink-0">
                {hasHolder ? (
                  // Show current holder
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-cyan-500/10 border border-cyan-500/20">
                    <User className="w-3.5 h-3.5 text-cyan-400" />
                    <span className="text-xs font-medium text-cyan-300">
                      {pos.current_holders[0].full_name}
                    </span>
                  </div>
                ) : activeElectionId ? (
                  // Link to active election
                  <Link
                    href={`/elections/${activeElectionId}`}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-green-500/10 border border-green-500/20 text-green-300 text-xs font-medium hover:bg-green-500/20 transition-colors"
                  >
                    <Vote className="w-3.5 h-3.5" />
                    {t("positions.electionInProgress")}
                    <ChevronRight className="w-3 h-3" />
                  </Link>
                ) : canStart ? (
                  // Start election button
                  <button
                    onClick={() => handleStartElection(pos.id)}
                    disabled={startingElection === pos.id}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/30 text-purple-300 text-xs font-medium transition-colors disabled:opacity-50"
                  >
                    {startingElection === pos.id ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Vote className="w-3.5 h-3.5" />
                    )}
                    {t("positions.startElection")}
                  </button>
                ) : (
                  // Vacant, no permission
                  <span className="text-xs px-3 py-1.5 rounded-md bg-slate-500/10 border border-slate-500/20" style={{ color: "var(--muted-foreground)" }}>
                    {t("positions.vacant")}
                  </span>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

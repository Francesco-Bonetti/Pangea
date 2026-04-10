"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useLanguage } from "@/components/language-provider";
import {
  Briefcase,
  UserCheck,
  UserPlus,
  Crown,
  Loader2,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  CheckCircle2,
  X,
} from "lucide-react";

interface Position {
  id: string;
  title: string;
  description: string | null;
  max_holders: number;
  requires_election: boolean;
  election_id: string | null;
}

interface Holder {
  id: string;
  position_id: string;
  user_id: string;
  elected_at: string;
  term_expires_at: string | null;
  status: string;
  user_name?: string;
  citizen_code?: string;
}

interface Candidate {
  id: string;
  position_id: string;
  user_id: string;
  statement: string | null;
  applied_at: string;
  status: string;
  user_name?: string;
}

interface LawPositionsProps {
  lawId: string;
  isAdmin?: boolean;
}

export default function LawPositions({ lawId, isAdmin = false }: LawPositionsProps) {
  const { t } = useLanguage();
  const supabase = createClient();
  const [positions, setPositions] = useState<Position[]>([]);
  const [holders, setHolders] = useState<Record<string, Holder[]>>({});
  const [candidates, setCandidates] = useState<Record<string, Candidate[]>>({});
  const [expanded, setExpanded] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState<string | null>(null);
  const [statement, setStatement] = useState("");
  const [showApplyForm, setShowApplyForm] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Admin form
  const [showNewPosition, setShowNewPosition] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newMax, setNewMax] = useState(1);

  useEffect(() => {
    loadPositions();
    loadUser();
  }, [lawId]);

  async function loadUser() {
    const { data: { user } } = await supabase.auth.getUser();
    setUserId(user?.id || null);
  }

  async function loadPositions() {
    setLoading(true);

    const { data: posData } = await supabase
      .from("law_positions")
      .select("*")
      .eq("law_id", lawId)
      .order("created_at");

    const positionsArr = (posData || []) as Position[];
    setPositions(positionsArr);

    // Load holders for each position
    const holdersMap: Record<string, Holder[]> = {};
    const candidatesMap: Record<string, Candidate[]> = {};

    for (const pos of positionsArr) {
      const { data: hData } = await supabase
        .from("law_position_holders")
        .select("*")
        .eq("position_id", pos.id)
        .eq("status", "active");

      // Get names for holders
      const holdersList: Holder[] = [];
      for (const h of (hData || [])) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name, citizen_code")
          .eq("id", h.user_id)
          .single();
        holdersList.push({
          ...h,
          user_name: profile?.full_name || t("lawPositions.unknownCitizen"),
          citizen_code: profile?.citizen_code || "",
        });
      }
      holdersMap[pos.id] = holdersList;

      const { data: cData } = await supabase
        .from("law_position_candidates")
        .select("*")
        .eq("position_id", pos.id)
        .in("status", ["pending", "approved"]);

      const candidatesList: Candidate[] = [];
      for (const c of (cData || [])) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("id", c.user_id)
          .single();
        candidatesList.push({
          ...c,
          user_name: profile?.full_name || t("lawPositions.unknownCitizen"),
        });
      }
      candidatesMap[pos.id] = candidatesList;
    }

    setHolders(holdersMap);
    setCandidates(candidatesMap);
    setLoading(false);
  }

  async function handleApply(positionId: string) {
    if (!userId) return;
    setApplying(positionId);
    setFeedback(null);

    const { error } = await supabase.from("law_position_candidates").insert({
      position_id: positionId,
      user_id: userId,
      statement: statement.trim() || null,
    });

    if (error) {
      setFeedback({ type: "error", text: error.message.includes("duplicate") ? t("lawPositions.alreadyApplied") : error.message });
    } else {
      setFeedback({ type: "success", text: t("lawPositions.candidacySubmitted") });
      setShowApplyForm(null);
      setStatement("");
      loadPositions();
    }
    setApplying(null);
  }

  async function handleCreatePosition() {
    if (!newTitle.trim()) return;
    setApplying("new");

    const { error } = await supabase.from("law_positions").insert({
      law_id: lawId,
      title: newTitle.trim(),
      description: newDesc.trim() || null,
      max_holders: newMax,
    });

    if (error) {
      setFeedback({ type: "error", text: error.message });
    } else {
      setShowNewPosition(false);
      setNewTitle("");
      setNewDesc("");
      setNewMax(1);
      loadPositions();
    }
    setApplying(null);
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-4 text-fg-muted">
        <Loader2 className="w-4 h-4 animate-spin" />
        <span className="text-sm">{t("common.loading")}</span>
      </div>
    );
  }

  const hasAlreadyApplied = (posId: string) =>
    candidates[posId]?.some((c) => c.user_id === userId) || false;

  const isHolder = (posId: string) =>
    holders[posId]?.some((h) => h.user_id === userId) || false;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-sm font-semibold" style={{ color: "var(--foreground)" }}>
          <Briefcase className="w-4 h-4 text-amber-400" />
          {t("laws.positions")}
        </h3>
        {isAdmin && (
          <button
            onClick={() => setShowNewPosition(!showNewPosition)}
            className="text-xs px-2 py-1 rounded bg-blue-600 hover:bg-blue-700 text-fg transition-colors"
          >
            + {t("lawPositions.addPosition")}
          </button>
        )}
      </div>

      {/* Admin: create new position */}
      {showNewPosition && isAdmin && (
        <div className="p-3 rounded-lg border space-y-2" style={{ borderColor: "var(--border)", backgroundColor: "var(--muted)" }}>
          <input
            type="text"
            placeholder={t("lawPositions.positionTitlePlaceholder")}
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            className="input-field text-sm"
          />
          <textarea
            placeholder={t("lawPositions.descriptionOptional")}
            value={newDesc}
            onChange={(e) => setNewDesc(e.target.value)}
            className="input-field text-sm"
            rows={2}
          />
          <div className="flex items-center gap-2">
            <label className="text-xs text-fg-muted">{t("lawPositions.maxHolders")}</label>
            <input
              type="number"
              min={1}
              max={100}
              value={newMax}
              onChange={(e) => setNewMax(parseInt(e.target.value) || 1)}
              className="input-field text-sm w-20"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleCreatePosition}
              disabled={applying === "new" || !newTitle.trim()}
              className="btn-primary text-xs px-3 py-1.5"
            >
              {applying === "new" ? <Loader2 className="w-3 h-3 animate-spin" /> : t("common.submit")}
            </button>
            <button onClick={() => setShowNewPosition(false)} className="btn-secondary text-xs px-3 py-1.5">
              {t("common.cancel")}
            </button>
          </div>
        </div>
      )}

      {/* Feedback */}
      {feedback && (
        <div className={`flex items-center gap-2 p-2 rounded text-xs ${feedback.type === "success" ? "bg-green-900/30 text-green-400" : "bg-red-900/30 text-red-400"}`}>
          {feedback.type === "success" ? <CheckCircle2 className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
          {feedback.text}
        </div>
      )}

      {positions.length === 0 ? (
        <p className="text-xs text-fg-muted italic">{t("laws.noPositions")}</p>
      ) : (
        <div className="space-y-2">
          {positions.map((pos) => {
            const posHolders = holders[pos.id] || [];
            const posCandidates = candidates[pos.id] || [];
            const vacantSlots = pos.max_holders - posHolders.length;
            const isExpanded = expanded === pos.id;

            return (
              <div
                key={pos.id}
                className="rounded-lg border overflow-hidden"
                style={{ borderColor: "var(--border)", backgroundColor: "var(--card)" }}
              >
                {/* Position header */}
                <button
                  onClick={() => setExpanded(isExpanded ? null : pos.id)}
                  className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-[var(--muted)] transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Crown className="w-4 h-4 text-amber-400" />
                    <span className="text-sm font-medium" style={{ color: "var(--foreground)" }}>{pos.title}</span>
                    <span className="text-xs px-1.5 py-0.5 rounded" style={{ backgroundColor: "var(--muted)", color: "var(--muted-foreground)" }}>
                      {posHolders.length}/{pos.max_holders}
                    </span>
                    {vacantSlots > 0 && (
                      <span className="text-xs px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400">
                        {vacantSlots} {t("laws.vacant").toLowerCase()}
                      </span>
                    )}
                  </div>
                  {isExpanded ? <ChevronUp className="w-4 h-4 text-fg-muted" /> : <ChevronDown className="w-4 h-4 text-fg-muted" />}
                </button>

                {/* Expanded content */}
                {isExpanded && (
                  <div className="px-3 pb-3 space-y-3 border-t" style={{ borderColor: "var(--border)" }}>
                    {pos.description && (
                      <p className="text-xs text-fg-muted pt-2">{pos.description}</p>
                    )}

                    {/* Current holders */}
                    {posHolders.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-fg-muted mb-1">{t("laws.electedOfficial")}:</p>
                        {posHolders.map((h) => (
                          <div key={h.id} className="flex items-center gap-2 py-1">
                            <UserCheck className="w-3.5 h-3.5 text-green-400" />
                            <span className="text-sm" style={{ color: "var(--foreground)" }}>{h.user_name}</span>
                            {h.citizen_code && (
                              <span className="text-xs font-mono px-1.5 py-0.5 rounded" style={{ backgroundColor: "var(--muted)", color: "var(--muted-foreground)" }}>
                                {h.citizen_code}
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Candidates */}
                    {posCandidates.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-fg-muted mb-1">{t("elections.candidates")}:</p>
                        {posCandidates.map((c) => (
                          <div key={c.id} className="flex items-center gap-2 py-1">
                            <UserPlus className="w-3.5 h-3.5 text-blue-400" />
                            <span className="text-sm" style={{ color: "var(--foreground)" }}>{c.user_name}</span>
                            <span className="text-xs px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400">{c.status}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Apply button */}
                    {userId && vacantSlots > 0 && !hasAlreadyApplied(pos.id) && !isHolder(pos.id) && (
                      <>
                        {showApplyForm === pos.id ? (
                          <div className="space-y-2 pt-2">
                            <textarea
                              placeholder={t("lawPositions.candidateStatementPlaceholder")}
                              value={statement}
                              onChange={(e) => setStatement(e.target.value)}
                              className="input-field text-sm"
                              rows={3}
                            />
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleApply(pos.id)}
                                disabled={applying === pos.id}
                                className="btn-primary text-xs px-3 py-1.5 flex items-center gap-1"
                              >
                                {applying === pos.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <UserPlus className="w-3 h-3" />}
                                {t("common.submit")}
                              </button>
                              <button
                                onClick={() => { setShowApplyForm(null); setStatement(""); }}
                                className="btn-secondary text-xs px-3 py-1.5"
                              >
                                {t("common.cancel")}
                              </button>
                            </div>
                          </div>
                        ) : (
                          <button
                            onClick={() => setShowApplyForm(pos.id)}
                            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded bg-blue-600 hover:bg-blue-700 text-fg transition-colors mt-1"
                          >
                            <UserPlus className="w-3 h-3" />
                            {t("laws.applyForPosition")}
                          </button>
                        )}
                      </>
                    )}

                    {hasAlreadyApplied(pos.id) && (
                      <p className="text-xs text-blue-400 flex items-center gap-1 mt-1">
                        <CheckCircle2 className="w-3 h-3" /> {t("lawPositions.candidacySubmitted")}
                      </p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

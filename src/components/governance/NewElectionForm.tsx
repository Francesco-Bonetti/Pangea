"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter, useSearchParams } from "next/navigation";
import { Vote, Calendar, Trophy, Info, MapPin, Flag } from "lucide-react";
import { triggerTranslation } from "@/lib/translate";
import { useLanguage } from "@/components/core/language-provider";
import type { ElectionType } from "@/lib/types";

interface GroupOption {
  id: string;
  name: string;
  logo_emoji: string;
  group_type: string;
}

export default function NewElectionForm() {
  const { t } = useLanguage();
  const supabase = createClient();
  const router = useRouter();
  const searchParams = useSearchParams();
  // T09: Pre-select group from ?groupId= param
  const groupIdParam = searchParams.get("groupId") || "";

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [electionType, setElectionType] = useState<ElectionType>(groupIdParam ? "group" : "general");
  const [positionName, setPositionName] = useState("");
  const [maxWinners, setMaxWinners] = useState(1);
  const [groupId, setGroupId] = useState<string>(groupIdParam);
  const [candidatureStart, setCandidatureStart] = useState("");
  const [candidatureEnd, setCandidatureEnd] = useState("");
  const [votingStart, setVotingStart] = useState("");
  const [votingEnd, setVotingEnd] = useState("");

  const [groups, setGroups] = useState<GroupOption[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadOptions();
  }, []);

  async function loadOptions() {
    const { data: gData } = await supabase
      .from("groups")
      .select("id, name, logo_emoji, group_type")
      .eq("is_active", true)
      .neq("id", "00000000-0000-0000-0000-000000000001")
      .order("name");
    setGroups((gData as GroupOption[]) || []);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!title.trim() || !positionName.trim()) {
      setError("Title and position name are required.");
      return;
    }
    if (!candidatureStart || !candidatureEnd || !votingStart || !votingEnd) {
      setError("All dates are required.");
      return;
    }

    const cStart = new Date(candidatureStart);
    const cEnd = new Date(candidatureEnd);
    const vStart = new Date(votingStart);
    const vEnd = new Date(votingEnd);

    if (cStart >= cEnd) {
      setError("Candidature end must be after candidature start.");
      return;
    }
    if (cEnd > vStart) {
      setError("Voting start must be at or after candidature end.");
      return;
    }
    if (vStart >= vEnd) {
      setError("Voting end must be after voting start.");
      return;
    }

    setSubmitting(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setError("You must be logged in.");
      setSubmitting(false);
      return;
    }

    const { data, error: insertError } = await supabase
      .from("elections")
      .insert({
        title: title.trim(),
        description: description.trim() || null,
        election_type: electionType,
        group_id: groupId || null,
        position_name: positionName.trim(),
        max_winners: maxWinners,
        candidature_start: cStart.toISOString(),
        candidature_end: cEnd.toISOString(),
        voting_start: vStart.toISOString(),
        voting_end: vEnd.toISOString(),
        created_by: user.id,
      })
      .select("id")
      .single();

    if (insertError) {
      setError(insertError.message);
      setSubmitting(false);
      return;
    }

    // Trigger translation for election description
    if (data?.id && description.trim()) {
      triggerTranslation(description.trim(), "election_description", data.id);
    }

    router.push(`/elections/${data.id}`);
  }

  const electionTypes: { value: ElectionType; label: string; desc: string }[] = [
    { value: "general", label: "General", desc: "Pangea-wide election open to all citizens" },
    { value: "jurisdiction", label: "Jurisdiction", desc: "Election scoped to a specific jurisdiction group" },
    { value: "party", label: "Party", desc: "Internal party election for leadership roles" },
    { value: "group", label: "Group", desc: "Election scoped to any group" },
    { value: "position", label: "Position", desc: "Election for a specific role defined in a law" },
  ];

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-fg flex items-center gap-3 mb-2">
        <div className="p-2 rounded-lg bg-gradient-to-br from-purple-600 to-purple-700">
          <Vote className="w-5 h-5 text-fg" />
        </div>
        Create New Election
      </h1>
      <p className="text-fg-muted mb-8">Set up a new election for citizens to participate in.</p>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Title */}
        <div>
          <label className="block text-sm font-medium text-fg mb-2">Election Title *</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g., Governor Election 2026"
            className="w-full px-4 py-3 bg-theme-card border border-theme rounded-lg text-fg placeholder-slate-500 focus:outline-none focus:border-purple-500"
          />
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-fg mb-2">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Explain what this election is about and what the elected person(s) will do..."
            className="w-full px-4 py-3 bg-theme-card border border-theme rounded-lg text-fg placeholder-slate-500 focus:outline-none focus:border-purple-500 resize-none"
            rows={4}
          />
        </div>

        {/* Election Type */}
        <div>
          <label className="block text-sm font-medium text-fg mb-2">Election Type *</label>
          <div className="grid grid-cols-2 gap-2">
            {electionTypes.map((t) => (
              <button
                type="button"
                key={t.value}
                onClick={() => setElectionType(t.value)}
                className={`p-3 rounded-lg border text-left transition-all ${
                  electionType === t.value
                    ? "border-purple-500 bg-purple-500/10"
                    : "border-theme bg-theme-card hover:border-theme"
                }`}
              >
                <p className="text-sm font-medium text-fg">{t.label}</p>
                <p className="text-xs text-fg-muted mt-0.5">{t.desc}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Group selector (for jurisdiction, party, or group type) */}
        {(electionType === "jurisdiction" || electionType === "party" || electionType === "group") && (
          <div>
            <label className="block text-sm font-medium text-fg mb-2 flex items-center gap-2">
              {electionType === "jurisdiction" ? <MapPin className="w-4 h-4" /> : <Flag className="w-4 h-4" />}
              {electionType === "jurisdiction" ? "Jurisdiction" : electionType === "party" ? "Party" : "Group"}
            </label>
            <select
              value={groupId}
              onChange={(e) => setGroupId(e.target.value)}
              className="w-full px-4 py-3 bg-theme-card border border-theme rounded-lg text-fg focus:outline-none focus:border-purple-500"
            >
              <option value="">Select group...</option>
              {groups
                .filter((g) => electionType === "group" || g.group_type === electionType)
                .map((g) => (
                  <option key={g.id} value={g.id}>{g.logo_emoji} {g.name}</option>
                ))}
            </select>
          </div>
        )}

        {/* Position Name */}
        <div>
          <label className="block text-sm font-medium text-fg mb-2 flex items-center gap-2">
            <Trophy className="w-4 h-4" /> Position Name *
          </label>
          <input
            type="text"
            value={positionName}
            onChange={(e) => setPositionName(e.target.value)}
            placeholder="e.g., Governor, Council Member, Party Leader"
            className="w-full px-4 py-3 bg-theme-card border border-theme rounded-lg text-fg placeholder-slate-500 focus:outline-none focus:border-purple-500"
          />
          <p className="text-xs text-fg-muted mt-1">The title of the role being elected.</p>
        </div>

        {/* Max Winners */}
        <div>
          <label className="block text-sm font-medium text-fg mb-2">Number of Seats</label>
          <input
            type="number"
            value={maxWinners}
            onChange={(e) => setMaxWinners(Math.max(1, parseInt(e.target.value) || 1))}
            min={1}
            max={50}
            className="w-32 px-4 py-3 bg-theme-card border border-theme rounded-lg text-fg focus:outline-none focus:border-purple-500"
          />
          <p className="text-xs text-fg-muted mt-1">
            How many candidates can be elected. For example, a council with 5 seats.
          </p>
        </div>

        {/* Dates */}
        <div className="bg-theme-card border border-theme rounded-xl p-5">
          <h3 className="text-sm font-semibold text-fg uppercase tracking-wider mb-4 flex items-center gap-2">
            <Calendar className="w-4 h-4" /> Timeline *
          </h3>

          <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3 mb-4">
            <p className="text-xs text-blue-300 flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5 shrink-0" />
              The election moves through phases automatically: Candidature → Voting → Closed.
              For example, set candidature for 3 days, then voting for 5 days.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-fg-muted mb-1">Candidature Opens</label>
              <input
                type="datetime-local"
                value={candidatureStart}
                onChange={(e) => setCandidatureStart(e.target.value)}
                className="w-full px-3 py-2.5 bg-theme-base border border-theme rounded-lg text-fg text-sm focus:outline-none focus:border-purple-500"
              />
            </div>
            <div>
              <label className="block text-xs text-fg-muted mb-1">Candidature Closes</label>
              <input
                type="datetime-local"
                value={candidatureEnd}
                onChange={(e) => setCandidatureEnd(e.target.value)}
                className="w-full px-3 py-2.5 bg-theme-base border border-theme rounded-lg text-fg text-sm focus:outline-none focus:border-purple-500"
              />
            </div>
            <div>
              <label className="block text-xs text-fg-muted mb-1">Voting Opens</label>
              <input
                type="datetime-local"
                value={votingStart}
                onChange={(e) => setVotingStart(e.target.value)}
                className="w-full px-3 py-2.5 bg-theme-base border border-theme rounded-lg text-fg text-sm focus:outline-none focus:border-purple-500"
              />
            </div>
            <div>
              <label className="block text-xs text-fg-muted mb-1">Voting Closes</label>
              <input
                type="datetime-local"
                value={votingEnd}
                onChange={(e) => setVotingEnd(e.target.value)}
                className="w-full px-3 py-2.5 bg-theme-base border border-theme rounded-lg text-fg text-sm focus:outline-none focus:border-purple-500"
              />
            </div>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-sm text-fg-danger">
            {error}
          </div>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={submitting}
          className="w-full py-3 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-500 hover:to-purple-600 text-fg font-medium rounded-lg transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting ? t("elections.creatingElection") : t("elections.createElection")}
        </button>
      </form>
    </div>
  );
}

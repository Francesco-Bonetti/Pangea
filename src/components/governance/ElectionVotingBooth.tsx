"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Vote, CheckCircle, XCircle, User, Users, Trophy, Flag, AlertTriangle, LogIn } from "lucide-react";
import Link from "next/link";
import type { Election, ElectionResultEntry } from "@/lib/types";
import { triggerTranslation } from "@/lib/translate";
import TranslatedContent from "@/components/ui/TranslatedContent";
import { useLanguage } from "@/components/core/language-provider";

interface CandidateRow {
  candidate_id: string;
  candidate_user_id: string;
  candidate_name: string;
  candidate_party_id: string | null;
  candidate_party_name: string | null;
  candidate_platform: string | null;
  total_weighted_votes: number;
  vote_count: number;
}

interface ElectionVotingBoothProps {
  election: Election;
  userId: string | null;
  isGuest: boolean;
}

export default function ElectionVotingBooth({ election, userId, isGuest }: ElectionVotingBoothProps) {
  const { t } = useLanguage();
  const supabase = createClient();
  const [results, setResults] = useState<CandidateRow[]>([]);
  const [hasVoted, setHasVoted] = useState(false);
  const [myVote, setMyVote] = useState<string | null>(null);
  const [selectedCandidate, setSelectedCandidate] = useState<string | null>(null);
  const [voterCount, setVoterCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [voting, setVoting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isCandidate, setIsCandidate] = useState(false);
  const [registering, setRegistering] = useState(false);
  const [showRegisterForm, setShowRegisterForm] = useState(false);
  const [platform, setPlatform] = useState("");
  const [votingWeight, setVotingWeight] = useState<number>(1);

  const isVotingPhase = election.status === "voting";
  const isCandidaturePhase = election.status === "candidature";
  const isClosed = election.status === "closed";

  useEffect(() => {
    loadData();
  }, [election.id]);

  async function loadData() {
    setLoading(true);

    // Get results/candidates
    const { data: resultsData } = await supabase.rpc("get_election_results", {
      p_election_id: election.id,
    });
    setResults((resultsData as CandidateRow[]) || []);

    // Get voter count
    const { data: count } = await supabase.rpc("get_election_voter_count", {
      p_election_id: election.id,
    });
    setVoterCount(Number(count) || 0);

    if (userId) {
      // Check if voted
      const { data: voted } = await supabase.rpc("has_voted_in_election", {
        p_election_id: election.id,
      });
      setHasVoted(!!voted);

      // Get my vote
      const { data: myVoteData } = await supabase.rpc("get_my_election_vote", {
        p_election_id: election.id,
      });
      setMyVote(myVoteData as string | null);

      // Check if I'm a candidate
      const { data: candidateData } = await supabase
        .from("candidates")
        .select("id")
        .eq("election_id", election.id)
        .eq("user_id", userId)
        .in("status", ["registered", "approved"])
        .maybeSingle();
      setIsCandidate(!!candidateData);

      // Resolve voting weight using the full delegation algorithm (recursive CTE)
      if (isVotingPhase && !voted) {
        const { data: weight } = await supabase.rpc("resolve_election_voting_weight", {
          p_voter_id: userId,
          p_election_id: election.id,
        });
        setVotingWeight(Number(weight) || 1);
      }
    }

    setLoading(false);
  }

  async function handleVote() {
    if (!selectedCandidate || !userId) return;
    setVoting(true);
    setError(null);

    try {
      // Use the full delegation algorithm (transitive, group-aware, prunes already-voted)
      const { data: weight } = await supabase.rpc("resolve_election_voting_weight", {
        p_voter_id: userId,
        p_election_id: election.id,
      });

      const { error: insertError } = await supabase.from("election_votes").insert({
        election_id: election.id,
        voter_id: userId,
        candidate_id: selectedCandidate,
        voting_weight: weight || 1,
      });

      if (insertError) {
        if (insertError.code === "23505") {
          setError(t("elections.alreadyVotedError"));
        } else {
          setError(insertError.message);
        }
      } else {
        setHasVoted(true);
        setMyVote(selectedCandidate);
        await loadData();
      }
    } catch (err) {
      setError(t("elections.voteError"));
    }

    setVoting(false);
  }

  async function handleRevokeVote() {
    if (!userId) return;
    setVoting(true);

    const { error: deleteError } = await supabase
      .from("election_votes")
      .delete()
      .eq("election_id", election.id)
      .eq("voter_id", userId);

    if (!deleteError) {
      setHasVoted(false);
      setMyVote(null);
      setSelectedCandidate(null);
      await loadData();
    }

    setVoting(false);
  }

  async function handleRegisterCandidate() {
    if (!userId) return;
    setRegistering(true);
    setError(null);

    const { data: candidateData, error: insertError } = await supabase.from("candidates").insert({
      election_id: election.id,
      user_id: userId,
      platform: platform.trim() || null,
    }).select("id").single();

    if (insertError) {
      if (insertError.code === "23505") {
        setError(t("elections.alreadyCandidateError"));
      } else {
        setError(insertError.message);
      }
    } else {
      // Trigger translation for candidate platform
      if (candidateData?.id && platform.trim()) {
        triggerTranslation(platform.trim(), "candidate_platform", candidateData.id);
      }
      setIsCandidate(true);
      setShowRegisterForm(false);
      setPlatform("");
      await loadData();
    }

    setRegistering(false);
  }

  async function handleWithdrawCandidacy() {
    if (!userId) return;
    setRegistering(true);

    const { error: updateError } = await supabase
      .from("candidates")
      .update({ status: "withdrawn", withdrawn_at: new Date().toISOString() })
      .eq("election_id", election.id)
      .eq("user_id", userId);

    if (!updateError) {
      setIsCandidate(false);
      await loadData();
    }

    setRegistering(false);
  }

  if (loading) {
    return (
      <div className="bg-theme-card border border-theme rounded-xl p-6">
        <div className="h-40 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-purple-500" />
        </div>
      </div>
    );
  }

  const maxVotes = Math.max(...results.map((r) => Number(r.total_weighted_votes)), 1);

  return (
    <div className="space-y-6">
      {/* Candidature Phase: Register */}
      {isCandidaturePhase && (
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-5">
          <h3 className="text-lg font-semibold text-amber-400 flex items-center gap-2 mb-3">
            <User className="w-5 h-5" />
            {t("elections.candidateRegistrationOpen")}
          </h3>

          {isGuest ? (
            <div className="flex items-center gap-3">
              <p className="text-sm text-fg">{t("elections.signInToRegisterCandidate")}</p>
              <Link
                href="/auth"
                className="flex items-center gap-2 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-fg text-sm rounded-lg transition-colors"
              >
                <LogIn className="w-4 h-4" />
                {t("elections.signIn")}
              </Link>
            </div>
          ) : isCandidate ? (
            <div className="flex items-center justify-between">
              <p className="text-sm text-fg-success flex items-center gap-2">
                <CheckCircle className="w-4 h-4" />
                {t("elections.youAreRegisteredCandidate")}
              </p>
              <button
                onClick={handleWithdrawCandidacy}
                disabled={registering}
                className="px-3 py-1.5 text-sm text-fg-danger border border-red-500/30 rounded-lg hover:bg-red-500/10 transition-colors disabled:opacity-50"
              >
                {t("elections.withdraw")}
              </button>
            </div>
          ) : showRegisterForm ? (
            <div className="space-y-3">
              <textarea
                value={platform}
                onChange={(e) => setPlatform(e.target.value)}
                placeholder={t("elections.platformPlaceholder")}
                className="w-full px-4 py-3 bg-theme-base border border-theme rounded-lg text-fg text-sm placeholder-slate-500 focus:outline-none focus:border-amber-500 resize-none"
                rows={4}
              />
              <div className="flex gap-2">
                <button
                  onClick={handleRegisterCandidate}
                  disabled={registering}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-fg text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
                >
                  {registering ? t("elections.registering") : t("elections.confirmRegistration")}
                </button>
                <button
                  onClick={() => setShowRegisterForm(false)}
                  className="px-4 py-2 text-sm text-fg-muted hover:text-fg transition-colors"
                >
                  {t("common.cancel")}
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowRegisterForm(true)}
              className="px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-fg text-sm font-medium rounded-lg transition-all duration-150 hover:scale-105 active:scale-95"
            >
              {t("elections.registerAsCandidate")}
            </button>
          )}
        </div>
      )}

      {/* Voting Phase */}
      {isVotingPhase && !isGuest && !hasVoted && (
        <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-5">
          <h3 className="text-lg font-semibold text-fg-success flex items-center gap-2 mb-3">
            <Vote className="w-5 h-5" />
            {t("elections.castYourVote")}
          </h3>
          <p className="text-sm text-fg-muted mb-4">
            {t("elections.selectCandidateDesc")}
          </p>

          {/* Voting weight badge */}
          {votingWeight > 1 && (
            <div className="mb-4 px-3 py-2 bg-amber-500/10 border border-amber-500/20 rounded-lg flex items-center gap-2 text-sm">
              <span className="font-semibold text-amber-400">×{votingWeight}</span>
              <span className="text-fg-muted">
                {t("elections.yourVotingWeight")} · {votingWeight - 1} {t("elections.delegationsSuffix")}
              </span>
            </div>
          )}

          {error && (
            <div className="mb-3 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-sm text-fg-danger flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}

          <div className="space-y-2 mb-4">
            {results.map((candidate) => (
              <button
                key={candidate.candidate_id}
                onClick={() => setSelectedCandidate(candidate.candidate_id)}
                className={`w-full flex items-center gap-3 p-3 rounded-lg border text-left transition-all duration-150 ${
                  selectedCandidate === candidate.candidate_id
                    ? "border-green-500 bg-green-500/10"
                    : "border-theme bg-theme-card hover:border-theme"
                }`}
              >
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                  selectedCandidate === candidate.candidate_id
                    ? "border-green-500 bg-green-500"
                    : "border-slate-500"
                }`}>
                  {selectedCandidate === candidate.candidate_id && (
                    <div className="w-2 h-2 rounded-full bg-white" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-fg">{candidate.candidate_name}</p>
                  {candidate.candidate_party_name && (
                    <p className="text-xs text-fg-muted flex items-center gap-1">
                      <Flag className="w-3 h-3" /> {candidate.candidate_party_name}
                    </p>
                  )}
                </div>
              </button>
            ))}
          </div>

          <button
            onClick={handleVote}
            disabled={!selectedCandidate || voting}
            className="w-full py-3 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-500 hover:to-green-600 text-fg font-medium rounded-lg transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {voting ? t("elections.submittingVote") : t("elections.confirmVote")}
          </button>
        </div>
      )}

      {/* Already voted */}
      {isVotingPhase && hasVoted && (
        <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-5">
          <div className="flex items-center justify-between">
            <p className="text-fg-success flex items-center gap-2 font-medium">
              <CheckCircle className="w-5 h-5" />
              {t("elections.youHaveVoted")}
            </p>
            <button
              onClick={handleRevokeVote}
              disabled={voting}
              className="px-3 py-1.5 text-sm text-fg-danger border border-red-500/30 rounded-lg hover:bg-red-500/10 transition-colors disabled:opacity-50"
            >
              {voting ? t("elections.revoking") : t("elections.changeVote")}
            </button>
          </div>
        </div>
      )}

      {/* Guest CTA */}
      {isVotingPhase && isGuest && (
        <div className="bg-theme-card border border-theme rounded-xl p-5 text-center">
          <p className="text-fg mb-3">{t("elections.signInToVote")}</p>
          <Link
            href="/auth"
            className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-fg text-sm font-medium rounded-lg transition-colors"
          >
            <LogIn className="w-4 h-4" />
            {t("elections.signInToVoteBtn")}
          </Link>
        </div>
      )}

      {/* Results / Candidates List */}
      <div className="bg-theme-card border border-theme rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-fg flex items-center gap-2">
            {isClosed ? (
              <>
                <Trophy className="w-5 h-5 text-amber-500" />
                {t("elections.results")}
              </>
            ) : (
              <>
                <Users className="w-5 h-5 text-purple-400" />
                {t("elections.candidatesCount")} ({results.length})
              </>
            )}
          </h3>
          {voterCount > 0 && (
            <span className="text-sm text-fg-muted">
              {voterCount} {t("elections.votesCast")}
            </span>
          )}
        </div>

        {results.length === 0 ? (
          <p className="text-sm text-fg-muted text-center py-8">
            {t("elections.noCandidatesYet")}
          </p>
        ) : (
          <div className="space-y-3">
            {results.map((candidate, index) => {
              const isWinner = isClosed && index < election.max_winners;
              const isMyVote = myVote === candidate.candidate_id;
              const pct = maxVotes > 0 ? (Number(candidate.total_weighted_votes) / maxVotes) * 100 : 0;

              return (
                <div
                  key={candidate.candidate_id}
                  className={`relative p-4 rounded-lg border transition-all ${
                    isWinner
                      ? "border-amber-500/50 bg-amber-500/10"
                      : isMyVote
                      ? "border-green-500/30 bg-green-500/5"
                      : "border-theme bg-theme-base"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex items-center gap-3">
                      {/* Rank */}
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${
                        isWinner ? "bg-amber-500 text-black" : "bg-theme-muted text-fg"
                      }`}>
                        {index + 1}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <Link
                            href={`/citizens/${candidate.candidate_user_id}`}
                            className="text-fg font-medium hover:text-purple-300 transition-colors"
                          >
                            {candidate.candidate_name}
                          </Link>
                          {isWinner && (
                            <span className="px-2 py-0.5 text-[10px] font-bold bg-amber-500 text-black rounded-full uppercase">
                              {t("elections.elected")}
                            </span>
                          )}
                          {isMyVote && (
                            <span className="px-2 py-0.5 text-[10px] font-bold bg-green-500/20 text-fg-success rounded-full border border-green-500/30">
                              {t("elections.yourVote")}
                            </span>
                          )}
                        </div>
                        {candidate.candidate_party_name && (
                          <p className="text-xs text-fg-muted flex items-center gap-1 mt-0.5">
                            <Flag className="w-3 h-3" /> {candidate.candidate_party_name}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Vote count (show only during voting or after closed) */}
                    {(isVotingPhase || isClosed) && (
                      <div className="text-right shrink-0">
                        <p className="text-sm font-semibold text-fg">
                          {Number(candidate.total_weighted_votes).toFixed(1)}
                        </p>
                        <p className="text-[10px] text-fg-muted">{t("elections.weightedVotes")}</p>
                      </div>
                    )}
                  </div>

                  {/* Platform */}
                  {candidate.candidate_platform && (
                    <p className="text-sm text-fg-muted mt-2 pl-11">
                      <TranslatedContent text={candidate.candidate_platform} contentType="candidate_platform" contentId={candidate.candidate_id} />
                    </p>
                  )}

                  {/* Vote bar */}
                  {(isVotingPhase || isClosed) && pct > 0 && (
                    <div className="mt-3 pl-11">
                      <div className="h-1.5 bg-theme-muted rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            isWinner ? "bg-amber-500" : "bg-purple-500"
                          }`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

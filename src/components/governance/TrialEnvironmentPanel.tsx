"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useLanguage } from "@/components/core/language-provider";
import { formatDate } from "@/lib/utils";
import {
  FlaskConical,
  ExternalLink,
  Bug,
  AlertTriangle,
  Eye,
  ThumbsUp,
  Send,
  Clock,
  Database,
  Globe,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
} from "lucide-react";

interface TrialFeedback {
  id: string;
  feedback_type: string;
  content: string;
  created_at: string;
  author_id: string;
  author_name: string;
}

interface TrialEnvironment {
  exists: boolean;
  id?: string;
  status?: string;
  preview_url?: string | null;
  snapshot_taken_at?: string | null;
  snapshot_row_counts?: Record<string, number>;
  applied_sql?: string | null;
  activated_at?: string | null;
  completed_at?: string | null;
  error_message?: string | null;
  created_at?: string;
  feedback_counts?: Record<string, number>;
  feedback?: TrialFeedback[];
}

interface TrialEnvironmentPanelProps {
  proposalId: string;
  trialEndsAt?: string | null;
  userId?: string | null;
  isGuardian?: boolean;
}

const FEEDBACK_TYPES = [
  { key: "bug", icon: Bug, color: "#ef4444" },
  { key: "concern", icon: AlertTriangle, color: "#f59e0b" },
  { key: "observation", icon: Eye, color: "#3b82f6" },
  { key: "approval", icon: ThumbsUp, color: "#22c55e" },
] as const;

/**
 * T24: Trial Environment Panel
 * Shown on proposal detail page during trial phase.
 * Displays trial environment status, preview link, countdown, and citizen feedback.
 */
export default function TrialEnvironmentPanel({
  proposalId,
  trialEndsAt,
  userId,
  isGuardian = false,
}: TrialEnvironmentPanelProps) {
  const { t } = useLanguage();
  const [trial, setTrial] = useState<TrialEnvironment | null>(null);
  const [loading, setLoading] = useState(true);
  const [feedbackExpanded, setFeedbackExpanded] = useState(false);
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [feedbackContent, setFeedbackContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  // Countdown
  const [daysLeft, setDaysLeft] = useState<number | null>(null);
  const [hoursLeft, setHoursLeft] = useState<number | null>(null);

  const fetchTrial = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase.rpc("get_trial_environment", {
      p_proposal_id: proposalId,
    });
    if (data) {
      setTrial(data as TrialEnvironment);
    }
    setLoading(false);
  }, [proposalId]);

  useEffect(() => {
    fetchTrial();
  }, [fetchTrial]);

  // Countdown timer
  useEffect(() => {
    if (!trialEndsAt) return;
    const update = () => {
      const diff = new Date(trialEndsAt).getTime() - Date.now();
      if (diff <= 0) {
        setDaysLeft(0);
        setHoursLeft(0);
        return;
      }
      setDaysLeft(Math.floor(diff / (1000 * 60 * 60 * 24)));
      setHoursLeft(Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)));
    };
    update();
    const interval = setInterval(update, 60000);
    return () => clearInterval(interval);
  }, [trialEndsAt]);

  const handleSubmitFeedback = async () => {
    if (!selectedType || feedbackContent.length < 10 || !userId) return;
    setSubmitting(true);
    const supabase = createClient();
    const { data } = await supabase.rpc("submit_trial_feedback", {
      p_proposal_id: proposalId,
      p_feedback_type: selectedType,
      p_content: feedbackContent,
    });
    if (data && (data as { success: boolean }).success) {
      setSubmitSuccess(true);
      setFeedbackContent("");
      setSelectedType(null);
      await fetchTrial();
      setTimeout(() => setSubmitSuccess(false), 3000);
    }
    setSubmitting(false);
  };

  if (loading) {
    return (
      <div className="card p-5 mb-4 animate-pulse">
        <div className="h-4 bg-theme-base rounded w-1/3 mb-2" />
        <div className="h-3 bg-theme-base rounded w-2/3" />
      </div>
    );
  }

  // Status styling
  const statusConfig: Record<string, { color: string; bg: string; labelKey: string }> = {
    pending: {
      color: "#f59e0b",
      bg: "color-mix(in srgb, #f59e0b 10%, transparent)",
      labelKey: "trial.statusPending",
    },
    provisioning: {
      color: "#f59e0b",
      bg: "color-mix(in srgb, #f59e0b 10%, transparent)",
      labelKey: "trial.statusProvisioning",
    },
    active: {
      color: "#22c55e",
      bg: "color-mix(in srgb, #22c55e 10%, transparent)",
      labelKey: "trial.statusActive",
    },
    completed: {
      color: "#6b7280",
      bg: "color-mix(in srgb, #6b7280 10%, transparent)",
      labelKey: "trial.statusCompleted",
    },
    failed: {
      color: "#ef4444",
      bg: "color-mix(in srgb, #ef4444 10%, transparent)",
      labelKey: "trial.statusFailed",
    },
  };

  const trialStatus = trial?.status ?? "pending";
  const config = statusConfig[trialStatus] ?? statusConfig.pending;
  const isActive = trialStatus === "active";
  const totalFeedback = Object.values(trial?.feedback_counts ?? {}).reduce(
    (a: number, b: number) => a + b,
    0
  );

  return (
    <div
      className="card p-5 mb-4 overflow-hidden"
      style={{ borderLeft: `3px solid ${config.color}` }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <FlaskConical className="w-5 h-5" style={{ color: "#8b5cf6" }} />
          <h3 className="text-base font-semibold">{t("trial.title")}</h3>
        </div>
        <span
          className="text-xs px-2 py-0.5 rounded-full font-medium"
          style={{ color: config.color, backgroundColor: config.bg }}
        >
          {t(config.labelKey)}
        </span>
      </div>

      {/* Description */}
      <p className="text-xs mb-4" style={{ color: "var(--muted-foreground)" }}>
        {t("trial.description")}
      </p>

      {/* Countdown + Preview URL row */}
      <div className="flex flex-wrap gap-3 mb-4">
        {/* Countdown */}
        {daysLeft !== null && (
          <div
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm"
            style={{ backgroundColor: "var(--card)" }}
          >
            <Clock className="w-4 h-4" style={{ color: "var(--muted-foreground)" }} />
            <span>
              {daysLeft > 0
                ? t("trial.daysLeft").replace("{days}", String(daysLeft)).replace("{hours}", String(hoursLeft ?? 0))
                : t("trial.ending")}
            </span>
          </div>
        )}

        {/* Preview URL */}
        {trial?.preview_url && (
          <a
            href={trial.preview_url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm hover:opacity-80 transition-opacity"
            style={{
              backgroundColor: "color-mix(in srgb, #8b5cf6 12%, transparent)",
              color: "#8b5cf6",
            }}
          >
            <Globe className="w-4 h-4" />
            {t("trial.openPreview")}
            <ExternalLink className="w-3 h-3" />
          </a>
        )}

        {/* Snapshot info */}
        {trial?.snapshot_taken_at && (
          <div
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs"
            style={{ backgroundColor: "var(--card)", color: "var(--muted-foreground)" }}
          >
            <Database className="w-3.5 h-3.5" />
            {t("trial.snapshotAt")} {formatDate(trial.snapshot_taken_at)}
          </div>
        )}
      </div>

      {/* Trial not provisioned yet */}
      {(!trial?.exists || trialStatus === "pending") && (
        <div
          className="rounded-lg p-3 text-xs"
          style={{
            backgroundColor: "color-mix(in srgb, #f59e0b 8%, transparent)",
            color: "var(--muted-foreground)",
          }}
        >
          {t("trial.awaitingProvisioning")}
        </div>
      )}

      {/* Error */}
      {trial?.error_message && (
        <div
          className="rounded-lg p-3 text-xs mb-3"
          style={{
            backgroundColor: "color-mix(in srgb, #ef4444 8%, transparent)",
            color: "#ef4444",
          }}
        >
          {trial.error_message}
        </div>
      )}

      {/* Feedback section */}
      {isActive && (
        <div className="mt-4 border-t pt-4" style={{ borderColor: "var(--border)" }}>
          <button
            onClick={() => setFeedbackExpanded(!feedbackExpanded)}
            className="w-full flex items-center justify-between text-sm font-medium"
          >
            <span className="flex items-center gap-2">
              {t("trial.citizenFeedback")}
              {totalFeedback > 0 && (
                <span
                  className="text-xs px-1.5 py-0.5 rounded-full"
                  style={{
                    backgroundColor: "color-mix(in srgb, var(--primary) 15%, transparent)",
                    color: "var(--primary)",
                  }}
                >
                  {totalFeedback}
                </span>
              )}
            </span>
            {feedbackExpanded ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </button>

          {feedbackExpanded && (
            <div className="mt-3 space-y-3">
              {/* Feedback type selector */}
              {userId && (
                <div className="space-y-2">
                  <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>
                    {t("trial.feedbackPrompt")}
                  </p>
                  <div className="flex gap-2 flex-wrap">
                    {FEEDBACK_TYPES.map((ft) => {
                      const Icon = ft.icon;
                      const isSelected = selectedType === ft.key;
                      return (
                        <button
                          key={ft.key}
                          onClick={() =>
                            setSelectedType(isSelected ? null : ft.key)
                          }
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all border"
                          style={{
                            borderColor: isSelected ? ft.color : "var(--border)",
                            backgroundColor: isSelected
                              ? `color-mix(in srgb, ${ft.color} 12%, transparent)`
                              : "transparent",
                            color: isSelected
                              ? ft.color
                              : "var(--muted-foreground)",
                          }}
                        >
                          <Icon className="w-3.5 h-3.5" />
                          {t(`trial.feedbackType.${ft.key}`)}
                        </button>
                      );
                    })}
                  </div>

                  {/* Text input */}
                  {selectedType && (
                    <div className="space-y-2">
                      <textarea
                        value={feedbackContent}
                        onChange={(e) => setFeedbackContent(e.target.value)}
                        placeholder={t("trial.feedbackPlaceholder")}
                        className="w-full rounded-lg border p-2 text-sm resize-none bg-transparent"
                        style={{
                          borderColor: "var(--border)",
                          minHeight: "80px",
                        }}
                        maxLength={2000}
                      />
                      <div className="flex items-center justify-between">
                        <span
                          className="text-xs"
                          style={{ color: "var(--muted-foreground)" }}
                        >
                          {feedbackContent.length}/2000
                        </span>
                        <button
                          onClick={handleSubmitFeedback}
                          disabled={
                            submitting || feedbackContent.length < 10
                          }
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors disabled:opacity-50"
                          style={{
                            backgroundColor: "var(--primary)",
                            color: "white",
                          }}
                        >
                          <Send className="w-3.5 h-3.5" />
                          {submitting
                            ? t("trial.submitting")
                            : t("trial.submitFeedback")}
                        </button>
                      </div>
                    </div>
                  )}

                  {submitSuccess && (
                    <div className="flex items-center gap-2 text-xs" style={{ color: "#22c55e" }}>
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      {t("trial.feedbackSubmitted")}
                    </div>
                  )}
                </div>
              )}

              {/* Feedback summary counts */}
              {trial?.feedback_counts &&
                Object.keys(trial.feedback_counts).length > 0 && (
                  <div className="flex gap-3 flex-wrap">
                    {FEEDBACK_TYPES.map((ft) => {
                      const count = trial.feedback_counts?.[ft.key] ?? 0;
                      if (count === 0) return null;
                      const Icon = ft.icon;
                      return (
                        <div
                          key={ft.key}
                          className="flex items-center gap-1.5 text-xs"
                          style={{ color: ft.color }}
                        >
                          <Icon className="w-3.5 h-3.5" />
                          {count} {t(`trial.feedbackType.${ft.key}`)}
                        </div>
                      );
                    })}
                  </div>
                )}

              {/* Recent feedback */}
              {trial?.feedback && trial.feedback.length > 0 && (
                <div className="space-y-2 mt-2">
                  {trial.feedback.map((fb) => {
                    const ftConfig = FEEDBACK_TYPES.find(
                      (ft) => ft.key === fb.feedback_type
                    );
                    const Icon = ftConfig?.icon ?? Eye;
                    const color = ftConfig?.color ?? "#6b7280";
                    return (
                      <div
                        key={fb.id}
                        className="rounded-lg p-3 border text-xs"
                        style={{ borderColor: "var(--border)" }}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <Icon
                            className="w-3 h-3"
                            style={{ color }}
                          />
                          <span className="font-medium">
                            {fb.author_name}
                          </span>
                          <span style={{ color: "var(--muted-foreground)" }}>
                            {formatDate(fb.created_at)}
                          </span>
                        </div>
                        <p style={{ color: "var(--muted-foreground)" }}>
                          {fb.content}
                        </p>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

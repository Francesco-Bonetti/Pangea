"use client";

import React, { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { X } from "lucide-react";
import { useLanguage } from "@/components/language-provider";
import type { ReportReason } from "@/lib/types";
import { logger } from "@/lib/logger";

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  discussionId?: string;
  replyId?: string;
  userId?: string;
  onSuccess?: () => void;
}

const getReportReasons = (t: any): { value: ReportReason; label: string; description: string }[] => [
  {
    value: "spam",
    label: t("reportModal.spam"),
    description: t("reportModal.spamDesc"),
  },
  {
    value: "offensive",
    label: t("reportModal.offensive"),
    description: t("reportModal.offensiveDesc"),
  },
  {
    value: "off_topic",
    label: t("reportModal.offTopic"),
    description: t("reportModal.offTopicDesc"),
  },
  {
    value: "misinformation",
    label: t("reportModal.misinformation"),
    description: t("reportModal.misinformationDesc"),
  },
  {
    value: "other",
    label: t("reportModal.other"),
    description: t("reportModal.otherDesc"),
  },
];

export default function ReportModal({
  isOpen,
  onClose,
  discussionId,
  replyId,
  userId,
  onSuccess,
}: ReportModalProps) {
  const { t } = useLanguage();
  const supabase = createClient();
  const [selectedReason, setSelectedReason] = useState<ReportReason | null>(null);
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReason || !userId || (!discussionId && !replyId)) {
      setError(t("reportModal.validationError"));
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      const { error: insertError } = await supabase
        .from("discussion_reports")
        .insert([
          {
            reporter_id: userId,
            discussion_id: discussionId || null,
            reply_id: replyId || null,
            reason: selectedReason,
            description: description || null,
            status: "pending",
          },
        ]);

      if (insertError) throw insertError;

      // Reset form
      setSelectedReason(null);
      setDescription("");
      onSuccess?.();
      onClose();
    } catch (err) {
      logger.error("Error submitting report:", err);
      setError(t("reportModal.submitError"));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-theme-card rounded-lg max-w-md w-full shadow-xl border border-theme">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-theme">
          <h2 className="text-lg font-semibold text-fg">{t("reportModal.title")}</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-theme-muted rounded-lg transition-colors text-fg-muted hover:text-fg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Reason selection */}
          <div>
            <label className="block text-sm font-medium text-fg mb-3">
              {t("reportModal.reason")}
            </label>
            <div className="space-y-2">
              {getReportReasons(t).map((reason) => (
                <label
                  key={reason.value}
                  className="flex items-start gap-3 p-3 rounded-lg border border-theme cursor-pointer hover:bg-theme-muted transition-colors"
                >
                  <input
                    type="radio"
                    name="reason"
                    value={reason.value}
                    checked={selectedReason === reason.value}
                    onChange={(e) => setSelectedReason(e.target.value as ReportReason)}
                    className="mt-0.5 w-4 h-4 accent-pangea-600"
                  />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-fg">
                      {reason.label}
                    </p>
                    <p className="text-xs text-fg-muted mt-0.5">
                      {reason.description}
                    </p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-fg mb-2">
              {t("reportModal.additionalDetails")}
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t("reportModal.detailsPlaceholder")}
              rows={4}
              className="w-full bg-theme-base border border-theme rounded-lg px-3 py-2 text-fg placeholder-slate-500 focus:outline-none focus:border-pangea-600 focus:ring-1 focus:ring-pangea-600 transition-colors resize-none text-sm"
            />
          </div>

          {/* Error message */}
          {error && (
            <div className="p-3 bg-danger-tint border border-red-800 rounded-lg text-fg-danger text-sm">
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-theme-muted hover:bg-theme-muted text-fg font-medium rounded-lg transition-colors"
            >
              {t("common.cancel")}
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !selectedReason}
              className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-red-600/50 text-fg font-medium rounded-lg transition-colors disabled:cursor-not-allowed"
            >
              {isSubmitting ? t("reportModal.reporting") : t("reportModal.submitReport")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

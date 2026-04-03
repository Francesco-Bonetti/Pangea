"use client";

import React, { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { X } from "lucide-react";
import type { ReportReason } from "@/lib/types";

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  discussionId?: string;
  replyId?: string;
  userId?: string;
  onSuccess?: () => void;
}

const REPORT_REASONS: { value: ReportReason; label: string; description: string }[] = [
  {
    value: "spam",
    label: "Spam",
    description: "Commercial spam, irrelevant links, or repetitive content",
  },
  {
    value: "offensive",
    label: "Offensive",
    description: "Hateful, harassing, or abusive language",
  },
  {
    value: "off_topic",
    label: "Off-topic",
    description: "Not relevant to the discussion channel",
  },
  {
    value: "misinformation",
    label: "Misinformation",
    description: "Deliberate spread of false information",
  },
  {
    value: "other",
    label: "Other",
    description: "Something else not listed above",
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
  const supabase = createClient();
  const [selectedReason, setSelectedReason] = useState<ReportReason | null>(null);
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReason || !userId || (!discussionId && !replyId)) {
      setError("Please fill in all required fields");
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
      console.error("Error submitting report:", err);
      setError("Failed to submit report. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 rounded-lg max-w-md w-full shadow-xl border border-slate-700">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-700">
          <h2 className="text-lg font-semibold text-white">Report Content</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-slate-700 rounded-lg transition-colors text-slate-400 hover:text-slate-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Reason selection */}
          <div>
            <label className="block text-sm font-medium text-slate-200 mb-3">
              Reason for report
            </label>
            <div className="space-y-2">
              {REPORT_REASONS.map((reason) => (
                <label
                  key={reason.value}
                  className="flex items-start gap-3 p-3 rounded-lg border border-slate-600 cursor-pointer hover:bg-slate-700/50 transition-colors"
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
                    <p className="text-sm font-medium text-slate-100">
                      {reason.label}
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {reason.description}
                    </p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-slate-200 mb-2">
              Additional details (optional)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Provide more context if needed..."
              rows={4}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-pangea-600 focus:ring-1 focus:ring-pangea-600 transition-colors resize-none text-sm"
            />
          </div>

          {/* Error message */}
          {error && (
            <div className="p-3 bg-red-900/20 border border-red-800 rounded-lg text-red-300 text-sm">
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-100 font-medium rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !selectedReason}
              className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-red-600/50 text-white font-medium rounded-lg transition-colors disabled:cursor-not-allowed"
            >
              {isSubmitting ? "Reporting..." : "Submit Report"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

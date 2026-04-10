"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useLanguage } from "@/components/language-provider";
import {
  ShieldCheck,
  ShieldAlert,
  ShieldQuestion,
  Lock,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

interface IntegrityData {
  status: string;
  results_available: boolean;
  total_votes: number;
  all_sealed: boolean;
  verified_count: number;
  mismatch_count: number;
  missing_hash_count: number;
  integrity_ok: boolean;
  audit_complete: boolean;
}

interface VoteIntegrityBadgeProps {
  proposalId: string;
}

export default function VoteIntegrityBadge({ proposalId }: VoteIntegrityBadgeProps) {
  const { t } = useLanguage();
  const [data, setData] = useState<IntegrityData | null>(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    async function fetchIntegrity() {
      const { data: result } = await supabase.rpc("get_proposal_integrity", {
        p_proposal_id: proposalId,
      });

      if (result && result.results_available) {
        setData(result as IntegrityData);
      }
      setLoading(false);
    }

    fetchIntegrity();
  }, [proposalId, supabase]);

  if (loading || !data) return null;

  const allVerified = data.integrity_ok && data.audit_complete;
  const hasMismatches = data.mismatch_count > 0;
  const pendingAudit = !data.audit_complete;

  // Choose visual state
  const StatusIcon = hasMismatches
    ? ShieldAlert
    : pendingAudit
    ? ShieldQuestion
    : ShieldCheck;

  const statusColor = hasMismatches
    ? "text-fg-danger"
    : pendingAudit
    ? "text-fg-muted"
    : "text-fg-success";

  const bgColor = hasMismatches
    ? "bg-danger-tint border-red-800/30"
    : pendingAudit
    ? "bg-theme-muted border-theme"
    : "bg-success-tint border-green-800/30";

  const statusText = hasMismatches
    ? t("integrity.mismatchFound")
    : pendingAudit
    ? t("integrity.pendingAudit")
    : t("integrity.allVerified");

  return (
    <div className={`card p-4 mb-4 border ${bgColor}`}>
      {/* Compact header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between"
      >
        <div className="flex items-center gap-2">
          <StatusIcon className={`w-4 h-4 ${statusColor}`} />
          <span className={`text-sm font-medium ${statusColor}`}>
            {statusText}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {data.all_sealed && (
            <Lock className="w-3.5 h-3.5 text-fg-muted" />
          )}
          {expanded ? (
            <ChevronUp className="w-4 h-4 text-fg-muted" />
          ) : (
            <ChevronDown className="w-4 h-4 text-fg-muted" />
          )}
        </div>
      </button>

      {/* Expanded details */}
      {expanded && (
        <div className="mt-3 pt-3 border-t border-theme space-y-2">
          <p className="text-xs text-fg-muted">
            {t("integrity.description")}
          </p>

          <div className="grid grid-cols-2 gap-2 mt-2">
            {/* Total votes */}
            <div className="text-xs">
              <span className="text-fg-muted">{t("integrity.totalVotes")}</span>
              <span className="ml-1 font-medium text-fg">{data.total_votes}</span>
            </div>

            {/* Sealed */}
            <div className="text-xs">
              <span className="text-fg-muted">{t("integrity.sealed")}</span>
              <span className="ml-1 font-medium text-fg">
                {data.all_sealed ? t("common.yes") : t("common.no")}
              </span>
            </div>

            {/* Verified */}
            <div className="text-xs">
              <span className="text-fg-success">{t("integrity.verified")}</span>
              <span className="ml-1 font-medium text-fg">{data.verified_count}</span>
            </div>

            {/* Mismatches */}
            <div className="text-xs">
              <span className={data.mismatch_count > 0 ? "text-fg-danger" : "text-fg-muted"}>
                {t("integrity.mismatches")}
              </span>
              <span className="ml-1 font-medium text-fg">{data.mismatch_count}</span>
            </div>

            {/* Missing hash (legacy votes) */}
            {data.missing_hash_count > 0 && (
              <div className="text-xs col-span-2">
                <span className="text-fg-muted">{t("integrity.legacyVotes")}</span>
                <span className="ml-1 font-medium text-fg">{data.missing_hash_count}</span>
              </div>
            )}
          </div>

          {/* Example explanation */}
          <div className="mt-2 p-2 bg-theme-base rounded text-xs text-fg-muted leading-relaxed">
            {t("integrity.example")}
          </div>
        </div>
      )}
    </div>
  );
}

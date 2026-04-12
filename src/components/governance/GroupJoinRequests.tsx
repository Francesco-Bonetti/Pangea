"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useLanguage } from "@/components/core/language-provider";
import {
  UserPlus,
  Check,
  X,
  Loader2,
  Clock,
  MessageSquare,
  ShieldCheck,
} from "lucide-react";
import type { GroupJoinRequest } from "@/lib/types";

interface Props {
  groupId: string;
  canReview: boolean; // Does the current user have permission to approve/reject?
}

export default function GroupJoinRequests({ groupId, canReview }: Props) {
  const { t } = useLanguage();
  const [requests, setRequests] = useState<GroupJoinRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const supabase = createClient();

  const loadRequests = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.rpc("get_group_join_requests", {
      p_group_id: groupId,
    });
    if (!error && data) {
      setRequests(Array.isArray(data) ? data : JSON.parse(data));
    }
    setLoading(false);
  }, [groupId, supabase]);

  useEffect(() => {
    if (canReview) loadRequests();
    else setLoading(false);
  }, [canReview, loadRequests]);

  async function handleReview(requestId: string, decision: "approved" | "rejected") {
    setProcessing(requestId);
    const { error } = await supabase.rpc("review_group_join_request", {
      p_request_id: requestId,
      p_decision: decision,
    });
    if (!error) {
      setRequests((prev) => prev.filter((r) => r.id !== requestId));
    }
    setProcessing(null);
  }

  if (!canReview || loading) return null;
  if (requests.length === 0) return null;

  return (
    <div className="card p-4 border-amber-500/30">
      <h3 className="text-sm font-semibold text-fg mb-3 flex items-center gap-2">
        <UserPlus className="w-4 h-4 text-amber-400" />
        {t("groups.joinRequests.title")} ({requests.length})
      </h3>

      <div className="space-y-2">
        {requests.map((req) => {
          const name = req.display_name || req.full_name || `Citizen ${req.user_code || "?"}`;
          const isProcessing = processing === req.id;

          return (
            <div
              key={req.id}
              className="flex items-center gap-3 p-3 bg-theme-card/50 rounded-lg"
            >
              <div className="w-8 h-8 rounded-full bg-pangea-900/40 flex items-center justify-center text-xs font-bold text-pangea-300 shrink-0">
                {name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-fg truncate">{name}</p>
                {req.message && (
                  <p className="text-xs text-fg-muted flex items-center gap-1 mt-0.5">
                    <MessageSquare className="w-3 h-3 shrink-0" />
                    <span className="truncate">{req.message}</span>
                  </p>
                )}
                <p className="text-[10px] text-fg-muted flex items-center gap-1 mt-0.5">
                  <Clock className="w-3 h-3" />
                  {new Date(req.created_at).toLocaleDateString()}
                </p>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  onClick={() => handleReview(req.id, "approved")}
                  disabled={isProcessing}
                  className="p-1.5 rounded-md bg-green-900/30 text-green-400 hover:bg-green-900/50 transition-colors disabled:opacity-50"
                  title={t("groups.joinRequests.approve")}
                >
                  {isProcessing ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Check className="w-4 h-4" />
                  )}
                </button>
                <button
                  onClick={() => handleReview(req.id, "rejected")}
                  disabled={isProcessing}
                  className="p-1.5 rounded-md bg-red-900/30 text-red-400 hover:bg-red-900/50 transition-colors disabled:opacity-50"
                  title={t("groups.joinRequests.reject")}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Button shown to non-members when a group requires approval.
 * Shows a form to request membership.
 */
export function JoinRequestButton({ groupId }: { groupId: string }) {
  const { t } = useLanguage();
  const [status, setStatus] = useState<"idle" | "form" | "sending" | "sent" | "error">("idle");
  const [message, setMessage] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [existingRequest, setExistingRequest] = useState(false);
  const supabase = createClient();

  // Check if user already has a pending request
  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from("group_join_requests")
        .select("id, status")
        .eq("group_id", groupId)
        .eq("user_id", user.id)
        .eq("status", "pending")
        .maybeSingle();
      if (data) setExistingRequest(true);
    })();
  }, [groupId, supabase]);

  async function submitRequest() {
    setStatus("sending");
    setErrorMsg("");
    const { error } = await supabase.rpc("request_group_join", {
      p_group_id: groupId,
      p_message: message.trim() || null,
    });
    if (error) {
      if (error.message.includes("ALREADY_MEMBER")) {
        setErrorMsg(t("groups.joinRequests.alreadyMember"));
      } else if (error.message.includes("REQUEST_ALREADY_PENDING")) {
        setExistingRequest(true);
        setStatus("idle");
        return;
      } else {
        setErrorMsg(error.message);
      }
      setStatus("error");
    } else {
      setStatus("sent");
    }
  }

  if (existingRequest) {
    return (
      <div className="flex items-center gap-2 text-sm text-amber-400 bg-amber-900/20 border border-amber-500/30 rounded-lg p-3">
        <Clock className="w-4 h-4 shrink-0" />
        {t("groups.joinRequests.pending")}
      </div>
    );
  }

  if (status === "sent") {
    return (
      <div className="flex items-center gap-2 text-sm text-green-400 bg-green-900/20 border border-green-500/30 rounded-lg p-3">
        <ShieldCheck className="w-4 h-4 shrink-0" />
        {t("groups.joinRequests.sent")}
      </div>
    );
  }

  if (status === "form" || status === "sending" || status === "error") {
    return (
      <div className="space-y-2">
        <textarea
          className="input-field min-h-[60px] resize-y text-sm"
          placeholder={t("groups.joinRequests.messagePlaceholder")}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          maxLength={500}
        />
        {errorMsg && (
          <p className="text-xs text-fg-danger">{errorMsg}</p>
        )}
        <div className="flex gap-2">
          <button
            onClick={submitRequest}
            disabled={status === "sending"}
            className="btn-primary text-sm flex items-center gap-2"
          >
            {status === "sending" ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <UserPlus className="w-3.5 h-3.5" />
            )}
            {t("groups.joinRequests.submit")}
          </button>
          <button
            onClick={() => { setStatus("idle"); setMessage(""); setErrorMsg(""); }}
            className="btn-secondary text-sm"
          >
            {t("common.cancel")}
          </button>
        </div>
      </div>
    );
  }

  return (
    <button
      onClick={() => setStatus("form")}
      className="btn-primary flex items-center gap-2"
    >
      <UserPlus className="w-4 h-4" />
      {t("groups.joinRequests.requestJoin")}
    </button>
  );
}

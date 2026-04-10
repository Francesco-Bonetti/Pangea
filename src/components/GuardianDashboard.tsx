"use client";

import { useEffect, useState, useCallback } from "react";
import { useLanguage } from "@/components/language-provider";
import { createClient } from "@/lib/supabase/client";
import {
  AlertCircle,
  Lock,
  Users,
  ToggleRight,
  ToggleLeft,
  ChevronDown,
  Activity,
  Shield,
  ShieldOff,
} from "lucide-react";

interface GuardianDashboardProps {
  isGuardian: boolean;
  profile: { id: string; role: string; is_guardian: boolean } | null;
}

interface GuardianStatus {
  is_active: boolean;
  guardian_name: string;
  verified_citizens: number;
  sunset_threshold: number;
  progress_pct: number;
  emergency_freeze: boolean;
}

interface GuardianAction {
  id: string;
  action_type: string;
  target_entity_type: string | null;
  target_entity_id: string | null;
  reason: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

interface LockedLaw {
  id: string;
  title: string;
  bootstrap_lock_threshold: number;
  lock_category: string | null;
}

export default function GuardianDashboard({ isGuardian, profile }: GuardianDashboardProps) {
  const { t } = useLanguage();
  const supabase = createClient();

  const [status, setStatus] = useState<GuardianStatus | null>(null);
  const [actions, setActions] = useState<GuardianAction[]>([]);
  const [lockedLaws, setLockedLaws] = useState<LockedLaw[]>([]);
  const [adminUsers, setAdminUsers] = useState<{ id: string; full_name: string | null; role: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Degrade admin state
  const [showDegrade, setShowDegrade] = useState(false);
  const [degradeUserId, setDegradeUserId] = useState("");
  const [degradeReason, setDegradeReason] = useState("");

  // Freeze reason
  const [freezeReason, setFreezeReason] = useState("");
  const [showFreezeConfirm, setShowFreezeConfirm] = useState(false);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      // Load guardian status via RPC
      const { data: statusData } = await supabase.rpc("get_guardian_status");
      if (statusData) setStatus(statusData);

      // Load guardian actions log
      const { data: actionsData } = await supabase
        .from("guardian_actions")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);
      setActions(actionsData ?? []);

      // Load bootstrap-locked laws
      const { data: lawsData } = await supabase
        .from("laws")
        .select("id, title, bootstrap_lock_threshold, lock_category")
        .not("bootstrap_lock_threshold", "is", null);
      setLockedLaws(lawsData ?? []);

      // Load admin/moderator users (for degrade dropdown)
      if (isGuardian) {
        const { data: admins } = await supabase
          .from("profiles")
          .select("id, full_name, role")
          .in("role", ["admin", "moderator"])
          .neq("id", profile?.id ?? "");
        setAdminUsers(admins ?? []);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [supabase, isGuardian, profile?.id]);

  useEffect(() => { loadAll(); }, [loadAll]);

  function clearMessages() { setError(null); setSuccess(null); }

  // --- Guardian Actions ---
  const handleDegradeAdmin = useCallback(async () => {
    if (!degradeUserId || !degradeReason.trim()) return;
    clearMessages();
    setActionLoading(true);
    try {
      const { data, error: err } = await supabase.rpc("guardian_degrade_admin", {
        p_target_user_id: degradeUserId,
        p_reason: degradeReason.trim(),
      });
      if (err) throw new Error(err.message);
      if (data && !data.success) throw new Error(data.error || "Failed");
      setSuccess(t("guardian.adminDegraded"));
      setShowDegrade(false);
      setDegradeUserId("");
      setDegradeReason("");
      loadAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
    } finally {
      setActionLoading(false);
    }
  }, [supabase, degradeUserId, degradeReason, t, loadAll]);

  const handleEmergencyFreeze = useCallback(async () => {
    if (!freezeReason.trim()) return;
    clearMessages();
    setActionLoading(true);
    try {
      const newFreezeState = !status?.emergency_freeze;
      const { data, error: err } = await supabase.rpc("guardian_emergency_freeze", {
        p_freeze: newFreezeState,
        p_reason: freezeReason.trim(),
      });
      if (err) throw new Error(err.message);
      if (data && !data.success) throw new Error(data.error || "Failed");
      setSuccess(newFreezeState ? t("guardian.freezeActivated") : t("guardian.freezeDeactivated"));
      setShowFreezeConfirm(false);
      setFreezeReason("");
      loadAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
    } finally {
      setActionLoading(false);
    }
  }, [supabase, status, freezeReason, t, loadAll]);

  const progressPct = status?.progress_pct ?? 0;

  if (loading) {
    return <div className="text-fg-muted text-sm py-8 text-center">{t("guardian.loading")}</div>;
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="card bg-red-900/20 border border-red-600 text-red-400 p-4 rounded-lg flex items-center gap-3">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <p className="text-sm">{error}</p>
          <button onClick={() => setError(null)} className="ml-auto text-xs hover:text-red-300">✕</button>
        </div>
      )}
      {success && (
        <div className="card bg-green-900/20 border border-green-600 text-green-400 p-4 rounded-lg flex items-center gap-3">
          <Shield className="w-5 h-5 flex-shrink-0" />
          <p className="text-sm">{success}</p>
          <button onClick={() => setSuccess(null)} className="ml-auto text-xs hover:text-green-300">✕</button>
        </div>
      )}

      {/* ── Guardian Status Card ── */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <Shield className="w-6 h-6 text-pangea-400" />
            <h2 className="text-lg font-bold text-fg">{t("guardian.title")}</h2>
          </div>
          <span className={`px-3 py-1 rounded-full text-xs font-medium ${
            status?.is_active
              ? "bg-green-900/30 text-green-400 border border-green-700"
              : "bg-amber-900/30 text-amber-400 border border-amber-700"
          }`}>
            {status?.is_active ? t("guardian.statusActive") : t("guardian.statusSunset")}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">
          <div className="bg-pangea-800/30 rounded-lg p-4">
            <p className="text-xs text-fg-muted mb-1">{t("guardian.guardianName")}</p>
            <p className="text-fg font-semibold">{status?.guardian_name ?? "—"}</p>
          </div>
          <div className="bg-pangea-800/30 rounded-lg p-4">
            <p className="text-xs text-fg-muted mb-1">{t("guardian.t2Citizens")}</p>
            <p className="text-fg font-semibold">{status?.verified_citizens ?? 0}</p>
          </div>
          <div className="bg-pangea-800/30 rounded-lg p-4">
            <p className="text-xs text-fg-muted mb-1">{t("guardian.lockedLaws")}</p>
            <p className="text-fg font-semibold">{lockedLaws.length}</p>
          </div>
        </div>

        {/* Sunset progress bar */}
        <div className="mb-2">
          <div className="flex items-center justify-between mb-1.5">
            <p className="text-xs text-fg-muted">{t("guardian.sunsetProgress")}</p>
            <p className="text-xs text-fg">{status?.verified_citizens ?? 0} / {status?.sunset_threshold ?? 1000}</p>
          </div>
          <div className="w-full bg-gray-800 rounded-full h-2.5 overflow-hidden">
            <div
              className="bg-gradient-to-r from-pangea-600 to-pangea-400 h-full transition-all duration-500 rounded-full"
              style={{ width: `${Math.min(progressPct, 100)}%` }}
            />
          </div>
          <p className="text-xs text-fg-muted mt-1">
            {t("guardian.sunsetExplanation")}
          </p>
        </div>

        {/* Emergency freeze indicator */}
        {status?.emergency_freeze && (
          <div className="mt-4 bg-red-900/20 border border-red-700 rounded-lg p-3 flex items-center gap-3">
            <ShieldOff className="w-5 h-5 text-red-400" />
            <p className="text-sm text-red-400 font-medium">{t("guardian.freezeActiveWarning")}</p>
          </div>
        )}
      </div>

      {/* ── Guardian Quick Actions (only for guardian) ── */}
      {isGuardian && (
        <div className="card p-6">
          <h3 className="text-lg font-bold text-fg mb-4 flex items-center gap-2">
            <Activity className="w-5 h-5 text-pangea-400" />
            {t("guardian.quickActions")}
          </h3>

          <div className="space-y-4">
            {/* Emergency Freeze Toggle */}
            <div className="flex items-center justify-between p-3 bg-pangea-800/20 rounded-lg">
              <div>
                <p className="text-sm text-fg font-medium">{t("guardian.emergencyFreeze")}</p>
                <p className="text-xs text-fg-muted">{t("guardian.emergencyFreezeDesc")}</p>
              </div>
              <button
                onClick={() => setShowFreezeConfirm(!showFreezeConfirm)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  status?.emergency_freeze
                    ? "bg-red-900/30 text-red-400 hover:bg-red-900/50"
                    : "bg-gray-800 text-fg-muted hover:bg-gray-700"
                }`}
              >
                {status?.emergency_freeze
                  ? <><ToggleRight className="w-5 h-5" />{t("guardian.freezeActive")}</>
                  : <><ToggleLeft className="w-5 h-5" />{t("guardian.freezeInactive")}</>
                }
              </button>
            </div>

            {showFreezeConfirm && (
              <div className="pl-4 border-l-2 border-amber-600 space-y-2">
                <textarea
                  value={freezeReason}
                  onChange={(e) => setFreezeReason(e.target.value)}
                  placeholder={t("guardian.freezeReasonPlaceholder")}
                  className="w-full px-3 py-2 bg-gray-800 border border-theme rounded-lg text-fg text-sm"
                  rows={2}
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleEmergencyFreeze}
                    disabled={actionLoading || !freezeReason.trim()}
                    className="px-4 py-2 bg-amber-700 hover:bg-amber-600 text-white rounded-lg text-sm font-medium disabled:opacity-50"
                  >
                    {actionLoading ? t("guardian.processing") : t("guardian.confirm")}
                  </button>
                  <button
                    onClick={() => { setShowFreezeConfirm(false); setFreezeReason(""); }}
                    className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-fg rounded-lg text-sm"
                  >
                    {t("guardian.cancel")}
                  </button>
                </div>
              </div>
            )}

            {/* Degrade Admin */}
            <div>
              <button
                onClick={() => setShowDegrade(!showDegrade)}
                className="w-full flex items-center justify-between p-3 bg-red-900/10 hover:bg-red-900/20 rounded-lg text-sm font-medium text-red-400 transition-colors"
              >
                <span>{t("guardian.degradeAdminButton")}</span>
                <ChevronDown className={`w-4 h-4 transition-transform ${showDegrade ? "rotate-180" : ""}`} />
              </button>

              {showDegrade && (
                <div className="mt-3 pl-4 border-l-2 border-red-600 space-y-3">
                  <div>
                    <label className="block text-fg-muted text-xs mb-1">{t("guardian.selectUser")}</label>
                    <select
                      value={degradeUserId}
                      onChange={(e) => setDegradeUserId(e.target.value)}
                      className="w-full px-3 py-2 bg-gray-800 border border-theme rounded-lg text-fg text-sm"
                    >
                      <option value="">{t("guardian.chooseUserOption")}</option>
                      {adminUsers.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.full_name ?? u.id} ({u.role})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-fg-muted text-xs mb-1">{t("guardian.degradeReason")}</label>
                    <textarea
                      value={degradeReason}
                      onChange={(e) => setDegradeReason(e.target.value)}
                      placeholder={t("guardian.degradeReasonPlaceholder")}
                      className="w-full px-3 py-2 bg-gray-800 border border-theme rounded-lg text-fg text-sm"
                      rows={2}
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={handleDegradeAdmin}
                      disabled={actionLoading || !degradeUserId || !degradeReason.trim()}
                      className="px-4 py-2 bg-red-700 hover:bg-red-600 text-white rounded-lg text-sm font-medium disabled:opacity-50"
                    >
                      {actionLoading ? t("guardian.processing") : t("guardian.confirmDegrade")}
                    </button>
                    <button
                      onClick={() => { setShowDegrade(false); setDegradeUserId(""); setDegradeReason(""); }}
                      className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-fg rounded-lg text-sm"
                    >
                      {t("guardian.cancel")}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Bootstrap Lock Status ── */}
      {lockedLaws.length > 0 && (
        <div className="card p-6">
          <div className="flex items-center gap-3 mb-4">
            <Lock className="w-5 h-5 text-amber-400" />
            <h3 className="text-lg font-bold text-fg">{t("guardian.bootstrapLockStatus")}</h3>
          </div>
          <div className="space-y-2">
            {lockedLaws.map((law) => {
              const isLocked = (status?.verified_citizens ?? 0) < law.bootstrap_lock_threshold;
              const catColor = law.lock_category === "reinforced"
                ? "text-amber-400 bg-amber-900/20 border-amber-700"
                : law.lock_category === "structural"
                ? "text-blue-400 bg-blue-900/20 border-blue-700"
                : "text-gray-400 bg-gray-800 border-gray-600";
              return (
                <div key={law.id} className={`flex items-center justify-between p-3 rounded-lg border ${catColor}`}>
                  <div className="flex items-center gap-3">
                    {isLocked ? <Lock className="w-4 h-4" /> : <Shield className="w-4 h-4 text-green-400" />}
                    <div>
                      <p className="text-sm text-fg font-medium">{law.title}</p>
                      <p className="text-xs text-fg-muted">
                        {law.lock_category ? t(`guardian.category.${law.lock_category}`) : ""} — {t("guardian.threshold")}: {law.bootstrap_lock_threshold} T2
                      </p>
                    </div>
                  </div>
                  <span className={`text-xs font-medium px-2 py-1 rounded ${
                    isLocked ? "bg-red-900/30 text-red-400" : "bg-green-900/30 text-green-400"
                  }`}>
                    {isLocked ? t("guardian.locked") : t("guardian.unlocked")}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Actions Audit Log ── */}
      <div className="card p-6">
        <div className="flex items-center gap-3 mb-4">
          <Activity className="w-5 h-5 text-pangea-400" />
          <h3 className="text-lg font-bold text-fg">{t("guardian.actionsLog")}</h3>
        </div>

        {actions.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-theme">
                  <th className="text-left py-2.5 px-3 text-fg-muted font-medium text-xs">{t("guardian.actionType")}</th>
                  <th className="text-left py-2.5 px-3 text-fg-muted font-medium text-xs">{t("guardian.target")}</th>
                  <th className="text-left py-2.5 px-3 text-fg-muted font-medium text-xs">{t("guardian.reason")}</th>
                  <th className="text-left py-2.5 px-3 text-fg-muted font-medium text-xs">{t("guardian.date")}</th>
                </tr>
              </thead>
              <tbody>
                {actions.map((a) => (
                  <tr key={a.id} className="border-b border-theme/50 hover:bg-pangea-800/10">
                    <td className="py-2.5 px-3">
                      <span className="inline-block px-2 py-0.5 bg-pangea-900/50 text-pangea-400 rounded text-xs font-medium">
                        {a.action_type}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-fg-muted text-xs">
                      {a.target_entity_type ?? "—"}
                    </td>
                    <td className="py-2.5 px-3 text-fg-muted text-xs max-w-xs truncate">
                      {a.reason}
                    </td>
                    <td className="py-2.5 px-3 text-fg-muted text-xs whitespace-nowrap">
                      {new Date(a.created_at).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-fg-muted text-sm py-4 text-center">{t("guardian.noActionsYet")}</p>
        )}
      </div>
    </div>
  );
}

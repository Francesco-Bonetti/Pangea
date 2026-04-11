"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useLanguage } from "@/components/language-provider";
import { Lock, Unlock, Save, Loader2, Info, ShieldCheck } from "lucide-react";
import type { GroupSettings as GroupSettingsType, EffectiveLocks, GroupMemberRole } from "@/lib/types";
import { hasPermission } from "@/lib/group-permissions";

interface Props {
  groupId: string;
  settings: GroupSettingsType;
  lockedSettings: Record<string, boolean>;
  userRole: GroupMemberRole | undefined;
  hasChildren: boolean;
  parentGroupId: string | null;
}

// Setting option definitions
const SETTING_KEYS = ["visibility", "can_post", "join_policy", "can_create_subgroups"] as const;
type SettingKey = (typeof SETTING_KEYS)[number];

const SETTING_OPTIONS: Record<SettingKey, string[]> = {
  visibility: ["public", "private", "members_only"],
  can_post: ["anyone", "members", "admins"],
  join_policy: ["open", "approval", "invite_only"],
  can_create_subgroups: ["anyone", "members", "admins"],
};

// Maps setting key + value to i18n key
function getOptionLabel(t: (k: string) => string, key: SettingKey, value: string): string {
  const map: Record<string, string> = {
    "visibility.public": t("groups.settings.visibilityPublic"),
    "visibility.private": t("groups.settings.visibilityPrivate"),
    "visibility.members_only": t("groups.settings.visibilityMembersOnly"),
    "can_post.anyone": t("groups.settings.canPostAnyone"),
    "can_post.members": t("groups.settings.canPostMembers"),
    "can_post.admins": t("groups.settings.canPostAdmins"),
    "join_policy.open": t("groups.settings.joinPolicyOpen"),
    "join_policy.approval": t("groups.settings.joinPolicyApproval"),
    "join_policy.invite_only": t("groups.settings.joinPolicyInvite"),
    "can_create_subgroups.anyone": t("groups.settings.canCreateSubgroupsAnyone"),
    "can_create_subgroups.members": t("groups.settings.canCreateSubgroupsMembers"),
    "can_create_subgroups.admins": t("groups.settings.canCreateSubgroupsAdmins"),
  };
  return map[`${key}.${value}`] || value;
}

// i18n key for setting label
function getSettingLabel(t: (k: string) => string, key: SettingKey): string {
  const map: Record<SettingKey, string> = {
    visibility: t("groups.settings.visibility"),
    can_post: t("groups.settings.canPost"),
    join_policy: t("groups.settings.joinPolicy"),
    can_create_subgroups: t("groups.settings.canCreateSubgroups"),
  };
  return map[key];
}

function getSettingDesc(t: (k: string) => string, key: SettingKey): string {
  const map: Record<SettingKey, string> = {
    visibility: t("groups.settings.visibilityDesc"),
    can_post: t("groups.settings.canPostDesc"),
    join_policy: t("groups.settings.joinPolicyDesc"),
    can_create_subgroups: t("groups.settings.canCreateSubgroupsDesc"),
  };
  return map[key];
}

export default function GroupSettings({ groupId, settings, lockedSettings, userRole, hasChildren, parentGroupId }: Props) {
  const supabase = createClient();
  const { t } = useLanguage();

  const canEdit = userRole ? hasPermission(userRole, "edit_settings") : false;

  const [localSettings, setLocalSettings] = useState<GroupSettingsType>({ ...settings });
  const [localLocks, setLocalLocks] = useState<Record<string, boolean>>({ ...lockedSettings });
  const [effectiveLocks, setEffectiveLocks] = useState<EffectiveLocks>({});
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load effective locks from parent chain
  useEffect(() => {
    if (!parentGroupId) return; // root groups have no locks
    supabase.rpc("get_effective_locks", { p_group_id: groupId }).then(({ data }) => {
      if (data) setEffectiveLocks(data as EffectiveLocks);
    });
  }, [groupId, parentGroupId]);

  function handleSettingChange(key: SettingKey, value: string) {
    setLocalSettings((prev) => ({ ...prev, [key]: value }));
    setSuccess(false);
    setError(null);
  }

  function handleLockToggle(key: SettingKey) {
    setLocalLocks((prev) => {
      const copy = { ...prev };
      if (copy[key]) {
        delete copy[key];
      } else {
        copy[key] = true;
      }
      return copy;
    });
    setSuccess(false);
    setError(null);
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    setSuccess(false);

    // 1. Save settings via RPC (validates locks server-side)
    const { data: settingsResult } = await supabase.rpc("update_group_settings", {
      p_group_id: groupId,
      p_new_settings: localSettings,
    });

    if (!settingsResult?.success) {
      const errCode = settingsResult?.error || "";
      if (errCode === "SETTING_LOCKED") {
        setError(`${t("groups.settings.errorLocked")} ${settingsResult.locked_by}`);
      } else if (errCode === "PERMISSION_DENIED") {
        setError(t("groups.settings.noPermission"));
      } else {
        setError(errCode);
      }
      setSaving(false);
      return;
    }

    // 2. Save lock settings (if user has children and permission)
    if (hasChildren) {
      const { data: lockResult } = await supabase.rpc("set_group_locks", {
        p_group_id: groupId,
        p_locked_keys: Object.fromEntries(
          SETTING_KEYS.map((k) => [k, !!localLocks[k]])
        ),
      });
      if (lockResult && !lockResult.success) {
        setError(lockResult.error || "Failed to update locks");
        setSaving(false);
        return;
      }
    }

    setSaving(false);
    setSuccess(true);
    setTimeout(() => setSuccess(false), 3000);
  }

  // Check if anything changed
  const hasChanges =
    JSON.stringify(localSettings) !== JSON.stringify(settings) ||
    JSON.stringify(localLocks) !== JSON.stringify(lockedSettings);

  if (!canEdit) {
    return (
      <div className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <ShieldCheck className="w-5 h-5 text-purple-400" />
          <h3 className="text-base font-semibold" style={{ color: "var(--foreground)" }}>
            {t("groups.settings.title")}
          </h3>
        </div>
        <p className="text-sm mb-6" style={{ color: "var(--muted-foreground)" }}>
          {t("groups.settings.noPermission")}
        </p>
        {/* Read-only view */}
        <div className="space-y-4">
          {SETTING_KEYS.map((key) => {
            const isLocked = !!effectiveLocks[key];
            const value = settings[key];
            return (
              <div key={key} className="p-4 rounded-lg" style={{ backgroundColor: "var(--muted)" }}>
                <div className="flex items-center gap-2 mb-1">
                  {isLocked && <Lock className="w-3.5 h-3.5 text-amber-400" />}
                  <span className="text-sm font-medium" style={{ color: "var(--foreground)" }}>
                    {getSettingLabel(t, key)}
                  </span>
                </div>
                <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>
                  {getOptionLabel(t, key, value)}
                </p>
                {isLocked && (
                  <p className="text-xs mt-1 text-amber-400/80">
                    {t("groups.settings.lockedBy")} {effectiveLocks[key].locked_by_name}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center gap-2 mb-2">
        <ShieldCheck className="w-5 h-5 text-purple-400" />
        <h3 className="text-base font-semibold" style={{ color: "var(--foreground)" }}>
          {t("groups.settings.title")}
        </h3>
      </div>
      <p className="text-sm mb-6" style={{ color: "var(--muted-foreground)" }}>
        {t("groups.settings.description")}
      </p>

      <div className="space-y-5">
        {SETTING_KEYS.map((key) => {
          const isLocked = !!effectiveLocks[key];
          const lockInfo = effectiveLocks[key];
          const options = SETTING_OPTIONS[key];

          return (
            <div key={key} className="p-4 rounded-lg border" style={{ backgroundColor: "var(--muted)", borderColor: isLocked ? "rgba(245, 158, 11, 0.3)" : "var(--border)" }}>
              {/* Setting header */}
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  {isLocked && <Lock className="w-3.5 h-3.5 text-amber-400" />}
                  <span className="text-sm font-semibold" style={{ color: "var(--foreground)" }}>
                    {getSettingLabel(t, key)}
                  </span>
                </div>
                {/* Lock toggle for children (only if this group has children) */}
                {hasChildren && !isLocked && (
                  <button
                    onClick={() => handleLockToggle(key)}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-semibold uppercase tracking-wider transition-colors ${
                      localLocks[key]
                        ? "bg-amber-500/15 text-amber-400 border border-amber-500/30"
                        : "bg-[var(--card)] hover:bg-[var(--muted)] border border-[var(--border)]"
                    }`}
                    style={!localLocks[key] ? { color: "var(--muted-foreground)" } : undefined}
                    title={localLocks[key] ? t("groups.settings.unlockForChildren") : t("groups.settings.lockForChildren")}
                  >
                    {localLocks[key] ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
                    {localLocks[key] ? t("groups.settings.locked") : t("groups.settings.lockForChildren")}
                  </button>
                )}
              </div>

              <p className="text-xs mb-3" style={{ color: "var(--muted-foreground)" }}>
                {getSettingDesc(t, key)}
              </p>

              {/* Locked notice */}
              {isLocked && lockInfo && (
                <div className="flex items-start gap-2 mb-3 px-3 py-2 rounded-md bg-amber-500/10 border border-amber-500/20">
                  <Info className="w-3.5 h-3.5 text-amber-400 mt-0.5 shrink-0" />
                  <p className="text-xs text-amber-400/90">
                    {t("groups.settings.lockedTooltip")} {t("groups.settings.lockedBy")} <strong>{lockInfo.locked_by_name}</strong>.
                  </p>
                </div>
              )}

              {/* Setting options */}
              <div className="space-y-1.5">
                {options.map((opt) => {
                  const selected = localSettings[key] === opt;
                  const disabled = isLocked;
                  return (
                    <label
                      key={opt}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-colors ${
                        disabled ? "opacity-50 cursor-not-allowed" : "hover:bg-[var(--card)]"
                      } ${selected ? "bg-purple-500/10 border border-purple-500/30" : "border border-transparent"}`}
                    >
                      <input
                        type="radio"
                        name={key}
                        value={opt}
                        checked={selected}
                        disabled={disabled}
                        onChange={() => handleSettingChange(key, opt)}
                        className="accent-purple-500"
                      />
                      <span className="text-sm" style={{ color: disabled ? "var(--muted-foreground)" : "var(--foreground)" }}>
                        {getOptionLabel(t, key, opt)}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Save bar */}
      <div className="mt-6 flex items-center gap-3">
        <button
          onClick={handleSave}
          disabled={saving || !hasChanges}
          className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-500 hover:to-purple-600 text-white text-sm font-medium rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {t("groups.settings.save")}
        </button>

        {success && (
          <span className="text-sm text-green-400 font-medium">
            ✓ {t("groups.settings.saved")}
          </span>
        )}

        {error && (
          <span className="text-sm text-red-400 font-medium">
            {error}
          </span>
        )}
      </div>
    </div>
  );
}

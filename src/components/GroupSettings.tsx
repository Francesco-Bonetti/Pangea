"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useLanguage } from "@/components/language-provider";
import {
  Lock,
  Unlock,
  Save,
  Loader2,
  Info,
  ShieldCheck,
  Vote,
  Users,
  Eye,
  FolderTree,
} from "lucide-react";
import { CollapsibleSection, Toggle, SettingRow } from "@/components/SettingsCollapsible";
import type {
  GroupSettings as GroupSettingsType,
  EffectiveLocks,
  GroupMemberRole,
} from "@/lib/types";
import { hasPermission } from "@/lib/group-permissions";

interface Props {
  groupId: string;
  settings: GroupSettingsType;
  lockedSettings: Record<string, boolean>;
  userRole: GroupMemberRole | undefined;
  hasChildren: boolean;
  parentGroupId: string | null;
}

// All setting keys (T11: organized by category)
const ALL_SETTING_KEYS = [
  "voting_duration_days",
  "approval_threshold_pct",
  "min_quorum_pct",
  "allow_anonymous_proposals",
  "join_policy",
  "can_post",
  "visibility",
  "can_create_subgroups",
] as const;

type SettingKey = (typeof ALL_SETTING_KEYS)[number];

// Enum-type settings: key → possible values
const ENUM_OPTIONS: Partial<Record<SettingKey, string[]>> = {
  visibility: ["public", "private", "members_only"],
  can_post: ["anyone", "members", "admins"],
  join_policy: ["open", "approval", "invite_only"],
  can_create_subgroups: ["anyone", "members", "admins"],
};

// Numeric settings: key → { min, max, step, default }
const NUMERIC_META: Partial<
  Record<SettingKey, { min: number; max: number; step: number; defaultVal: number; unit: string }>
> = {
  voting_duration_days: { min: 1, max: 30, step: 1, defaultVal: 7, unit: "groups.settings.unitDays" },
  approval_threshold_pct: { min: 1, max: 100, step: 1, defaultVal: 50, unit: "%" },
  min_quorum_pct: { min: 0, max: 100, step: 1, defaultVal: 0, unit: "%" },
};

// Boolean settings
const BOOLEAN_KEYS: SettingKey[] = ["allow_anonymous_proposals"];

// T11: Category definitions
interface SettingsCategory {
  id: string;
  labelKey: string;
  descKey: string;
  icon: typeof Vote;
  keys: SettingKey[];
}

const CATEGORIES: SettingsCategory[] = [
  {
    id: "governance",
    labelKey: "groups.settings.catGovernance",
    descKey: "groups.settings.catGovernanceDesc",
    icon: Vote,
    keys: ["voting_duration_days", "approval_threshold_pct", "min_quorum_pct", "allow_anonymous_proposals"],
  },
  {
    id: "membership",
    labelKey: "groups.settings.catMembership",
    descKey: "groups.settings.catMembershipDesc",
    icon: Users,
    keys: ["join_policy", "can_post"],
  },
  {
    id: "privacy",
    labelKey: "groups.settings.catPrivacy",
    descKey: "groups.settings.catPrivacyDesc",
    icon: Eye,
    keys: ["visibility"],
  },
  {
    id: "structure",
    labelKey: "groups.settings.catStructure",
    descKey: "groups.settings.catStructureDesc",
    icon: FolderTree,
    keys: ["can_create_subgroups"],
  },
];

// Helper: get display label for enum option
function getOptionLabel(t: (k: string) => string, key: SettingKey, value: string): string {
  return t(`groups.settings.opt.${key}.${value}`);
}

function getSettingLabel(t: (k: string) => string, key: SettingKey): string {
  return t(`groups.settings.field.${key}`);
}

function getSettingDesc(t: (k: string) => string, key: SettingKey): string {
  return t(`groups.settings.fieldDesc.${key}`);
}

// Get setting value with defaults for new governance fields
function getSettingValue(settings: GroupSettingsType, key: SettingKey): string | number | boolean {
  const val = (settings as unknown as Record<string, unknown>)[key];
  if (val !== undefined && val !== null) return val as string | number | boolean;
  // defaults for governance fields
  const numMeta = NUMERIC_META[key];
  if (numMeta) return numMeta.defaultVal;
  if (BOOLEAN_KEYS.includes(key)) return false;
  return "";
}

// ─── Lock badge (inline, for section headers) ────────────────────
function LockBadge({
  locked,
  onToggle,
  t,
}: {
  locked: boolean;
  onToggle: () => void;
  t: (k: string) => string;
}) {
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onToggle();
      }}
      className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider transition-colors ${
        locked
          ? "bg-amber-500/15 text-amber-400 border border-amber-500/30"
          : "bg-[var(--card)] hover:bg-[var(--muted)] border border-[var(--border)] text-[var(--muted-foreground)]"
      }`}
      title={locked ? t("groups.settings.unlockForChildren") : t("groups.settings.lockForChildren")}
    >
      {locked ? <Lock className="w-2.5 h-2.5" /> : <Unlock className="w-2.5 h-2.5" />}
      {locked ? t("groups.settings.locked") : t("groups.settings.lock")}
    </button>
  );
}

// ─── Read-only view ──────────────────────────────────────────────
function ReadOnlySettings({
  settings,
  effectiveLocks,
  t,
}: {
  settings: GroupSettingsType;
  effectiveLocks: EffectiveLocks;
  t: (k: string) => string;
}) {
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({ governance: true });
  const toggleSection = (id: string) =>
    setOpenSections((prev) => ({ ...prev, [id]: !prev[id] }));

  return (
    <div className="p-6 space-y-3">
      <div className="flex items-center gap-2 mb-4">
        <ShieldCheck className="w-5 h-5 text-purple-400" />
        <h3 className="text-base font-semibold" style={{ color: "var(--foreground)" }}>
          {t("groups.settings.title")}
        </h3>
      </div>
      <p className="text-sm mb-4" style={{ color: "var(--muted-foreground)" }}>
        {t("groups.settings.noPermission")}
      </p>
      {CATEGORIES.map((cat) => (
        <CollapsibleSection
          key={cat.id}
          id={cat.id}
          title={t(cat.labelKey)}
          description={t(cat.descKey)}
          icon={cat.icon}
          isOpen={!!openSections[cat.id]}
          onToggle={toggleSection}
        >
          <div className="space-y-3">
            {cat.keys.map((key) => {
              const value = getSettingValue(settings, key);
              const lockInfo = effectiveLocks[key];
              return (
                <div key={key} className="py-2">
                  <div className="flex items-center gap-2 mb-0.5">
                    {lockInfo && <Lock className="w-3 h-3 text-amber-400" />}
                    <span className="text-sm font-medium" style={{ color: "var(--foreground)" }}>
                      {getSettingLabel(t, key)}
                    </span>
                  </div>
                  <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>
                    {ENUM_OPTIONS[key]
                      ? getOptionLabel(t, key, value as string)
                      : BOOLEAN_KEYS.includes(key)
                      ? value
                        ? t("groups.settings.enabled")
                        : t("groups.settings.disabled")
                      : `${value}${NUMERIC_META[key]?.unit === "%" ? "%" : ` ${t(NUMERIC_META[key]?.unit || "")}`}`}
                  </p>
                  {lockInfo && (
                    <p className="text-xs mt-0.5 text-amber-400/80">
                      {t("groups.settings.lockedBy")} {lockInfo.locked_by_name}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </CollapsibleSection>
      ))}
    </div>
  );
}

// ─── Main editable component ─────────────────────────────────────
export default function GroupSettings({
  groupId,
  settings,
  lockedSettings,
  userRole,
  hasChildren,
  parentGroupId,
}: Props) {
  const supabase = createClient();
  const { t } = useLanguage();

  const canEdit = userRole ? hasPermission(userRole, "edit_settings") : false;

  const [localSettings, setLocalSettings] = useState<Record<string, unknown>>({ ...settings });
  const [localLocks, setLocalLocks] = useState<Record<string, boolean>>({ ...lockedSettings });
  const [effectiveLocks, setEffectiveLocks] = useState<EffectiveLocks>({});
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({ governance: true, membership: true });

  // Load effective locks from parent chain
  useEffect(() => {
    if (!parentGroupId) return;
    supabase.rpc("get_effective_locks", { p_group_id: groupId }).then(({ data }) => {
      if (data) setEffectiveLocks(data as EffectiveLocks);
    });
  }, [groupId, parentGroupId]);

  const toggleSection = (id: string) =>
    setOpenSections((prev) => ({ ...prev, [id]: !prev[id] }));

  // ─── Handlers ────────────────────────────────────────
  function handleEnumChange(key: SettingKey, value: string) {
    setLocalSettings((prev) => ({ ...prev, [key]: value }));
    setSuccess(false);
    setError(null);
  }

  function handleNumericChange(key: SettingKey, value: number) {
    const meta = NUMERIC_META[key];
    if (!meta) return;
    const clamped = Math.max(meta.min, Math.min(meta.max, value));
    setLocalSettings((prev) => ({ ...prev, [key]: clamped }));
    setSuccess(false);
    setError(null);
  }

  function handleBoolChange(key: SettingKey, value: boolean) {
    setLocalSettings((prev) => ({ ...prev, [key]: value }));
    setSuccess(false);
    setError(null);
  }

  function handleLockToggle(key: SettingKey) {
    setLocalLocks((prev) => {
      const copy = { ...prev };
      if (copy[key]) delete copy[key];
      else copy[key] = true;
      return copy;
    });
    setSuccess(false);
    setError(null);
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    setSuccess(false);

    // Build settings payload with defaults for unset governance fields
    const payload: Record<string, unknown> = {};
    for (const key of ALL_SETTING_KEYS) {
      const val = localSettings[key];
      if (val !== undefined && val !== null) {
        payload[key] = val;
      } else {
        // Apply defaults for new fields
        const numMeta = NUMERIC_META[key];
        if (numMeta) payload[key] = numMeta.defaultVal;
        else if (BOOLEAN_KEYS.includes(key)) payload[key] = false;
      }
    }

    const { data: settingsResult } = await supabase.rpc("update_group_settings", {
      p_group_id: groupId,
      p_new_settings: payload,
    });

    if (!settingsResult?.success) {
      const errCode = settingsResult?.error || "";
      if (errCode === "SETTING_LOCKED") {
        setError(`${t("groups.settings.errorLocked")} ${settingsResult.locked_by}`);
      } else if (errCode === "PERMISSION_DENIED") {
        setError(t("groups.settings.noPermission"));
      } else {
        setError(errCode || t("groups.settings.errorGeneric"));
      }
      setSaving(false);
      return;
    }

    // Save lock settings
    if (hasChildren) {
      const lockPayload: Record<string, boolean> = {};
      for (const key of ALL_SETTING_KEYS) {
        lockPayload[key] = !!localLocks[key];
      }
      const { data: lockResult } = await supabase.rpc("set_group_locks", {
        p_group_id: groupId,
        p_locked_keys: lockPayload,
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

  const hasChanges =
    JSON.stringify(localSettings) !== JSON.stringify(settings) ||
    JSON.stringify(localLocks) !== JSON.stringify(lockedSettings);

  if (!canEdit) {
    return (
      <ReadOnlySettings settings={settings} effectiveLocks={effectiveLocks} t={t} />
    );
  }

  // ─── Editable view ──────────────────────────────────
  return (
    <div className="p-6 space-y-3">
      <div className="flex items-center gap-2 mb-2">
        <ShieldCheck className="w-5 h-5 text-purple-400" />
        <h3 className="text-base font-semibold" style={{ color: "var(--foreground)" }}>
          {t("groups.settings.title")}
        </h3>
      </div>
      <p className="text-sm mb-4" style={{ color: "var(--muted-foreground)" }}>
        {t("groups.settings.description")}
      </p>

      {CATEGORIES.map((cat) => {
        // Check if any setting in this category is locked
        const catHasLock = cat.keys.some((k) => !!effectiveLocks[k]);
        return (
          <CollapsibleSection
            key={cat.id}
            id={cat.id}
            title={t(cat.labelKey)}
            description={t(cat.descKey)}
            icon={cat.icon}
            isOpen={!!openSections[cat.id]}
            onToggle={toggleSection}
            badge={catHasLock ? <Lock className="w-3 h-3 text-amber-400" /> : undefined}
          >
            <div className="space-y-4">
              {cat.keys.map((key) => {
                const isLocked = !!effectiveLocks[key];
                const lockInfo = effectiveLocks[key];

                // ── Locked notice ──
                const lockedNotice = isLocked && lockInfo && (
                  <div className="flex items-start gap-2 mb-3 px-3 py-2 rounded-md bg-amber-500/10 border border-amber-500/20">
                    <Info className="w-3.5 h-3.5 text-amber-400 mt-0.5 shrink-0" />
                    <p className="text-xs text-amber-400/90">
                      {t("groups.settings.lockedTooltip")}{" "}
                      {t("groups.settings.lockedBy")} <strong>{lockInfo.locked_by_name}</strong>
                    </p>
                  </div>
                );

                // ── Enum setting ──
                if (ENUM_OPTIONS[key]) {
                  const options = ENUM_OPTIONS[key]!;
                  const value = (localSettings[key] as string) || "";
                  return (
                    <div key={key} className="pb-3 border-b border-theme last:border-0">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          {isLocked && <Lock className="w-3 h-3 text-amber-400" />}
                          <span className="text-sm font-semibold" style={{ color: "var(--foreground)" }}>
                            {getSettingLabel(t, key)}
                          </span>
                        </div>
                        {hasChildren && !isLocked && (
                          <LockBadge locked={!!localLocks[key]} onToggle={() => handleLockToggle(key)} t={t} />
                        )}
                      </div>
                      <p className="text-xs mb-2" style={{ color: "var(--muted-foreground)" }}>
                        {getSettingDesc(t, key)}
                      </p>
                      {lockedNotice}
                      <div className="space-y-1">
                        {options.map((opt) => {
                          const selected = value === opt;
                          return (
                            <label
                              key={opt}
                              className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                                isLocked ? "opacity-50 cursor-not-allowed" : "cursor-pointer hover:bg-[var(--card)]"
                              } ${selected ? "bg-purple-500/10 border border-purple-500/30" : "border border-transparent"}`}
                            >
                              <input
                                type="radio"
                                name={key}
                                value={opt}
                                checked={selected}
                                disabled={isLocked}
                                onChange={() => handleEnumChange(key, opt)}
                                className="accent-purple-500"
                              />
                              <span
                                className="text-sm"
                                style={{ color: isLocked ? "var(--muted-foreground)" : "var(--foreground)" }}
                              >
                                {getOptionLabel(t, key, opt)}
                              </span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  );
                }

                // ── Numeric setting ──
                if (NUMERIC_META[key]) {
                  const meta = NUMERIC_META[key]!;
                  const value = (localSettings[key] as number) ?? meta.defaultVal;
                  const unitLabel = meta.unit === "%" ? "%" : t(meta.unit);
                  return (
                    <div key={key} className="pb-3 border-b border-theme last:border-0">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          {isLocked && <Lock className="w-3 h-3 text-amber-400" />}
                          <span className="text-sm font-semibold" style={{ color: "var(--foreground)" }}>
                            {getSettingLabel(t, key)}
                          </span>
                        </div>
                        {hasChildren && !isLocked && (
                          <LockBadge locked={!!localLocks[key]} onToggle={() => handleLockToggle(key)} t={t} />
                        )}
                      </div>
                      <p className="text-xs mb-2" style={{ color: "var(--muted-foreground)" }}>
                        {getSettingDesc(t, key)}
                      </p>
                      {lockedNotice}
                      <div className="flex items-center gap-3">
                        <input
                          type="range"
                          min={meta.min}
                          max={meta.max}
                          step={meta.step}
                          value={value}
                          disabled={isLocked}
                          onChange={(e) => handleNumericChange(key, Number(e.target.value))}
                          className="flex-1 h-2 rounded-lg appearance-none cursor-pointer accent-purple-500 bg-[var(--muted)] disabled:opacity-50"
                        />
                        <div className="flex items-center gap-1 min-w-[60px] justify-end">
                          <input
                            type="number"
                            min={meta.min}
                            max={meta.max}
                            step={meta.step}
                            value={value}
                            disabled={isLocked}
                            onChange={(e) => handleNumericChange(key, Number(e.target.value))}
                            className="w-14 px-2 py-1 text-sm text-right rounded border border-[var(--border)] bg-[var(--card)] disabled:opacity-50"
                            style={{ color: "var(--foreground)" }}
                          />
                          <span className="text-xs" style={{ color: "var(--muted-foreground)" }}>
                            {unitLabel}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                }

                // ── Boolean setting ──
                if (BOOLEAN_KEYS.includes(key)) {
                  const value = !!localSettings[key];
                  return (
                    <div key={key} className="pb-3 border-b border-theme last:border-0">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-0.5">
                            {isLocked && <Lock className="w-3 h-3 text-amber-400" />}
                            <span className="text-sm font-semibold" style={{ color: "var(--foreground)" }}>
                              {getSettingLabel(t, key)}
                            </span>
                          </div>
                          <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>
                            {getSettingDesc(t, key)}
                          </p>
                          {lockedNotice}
                        </div>
                        <div className="flex items-center gap-2">
                          {hasChildren && !isLocked && (
                            <LockBadge locked={!!localLocks[key]} onToggle={() => handleLockToggle(key)} t={t} />
                          )}
                          <Toggle enabled={value} onChange={(v) => handleBoolChange(key, v)} disabled={isLocked} />
                        </div>
                      </div>
                    </div>
                  );
                }

                return null;
              })}
            </div>
          </CollapsibleSection>
        );
      })}

      {/* Save bar */}
      <div className="mt-6 flex items-center gap-3 pt-3 border-t border-theme">
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

        {error && <span className="text-sm text-red-400 font-medium">{error}</span>}
      </div>
    </div>
  );
}

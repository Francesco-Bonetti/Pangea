"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import AppShell from "@/components/core/AppShell";
import MultiEmailManager from "@/components/ui/MultiEmailManager";
import type { Profile, PrivacySettings, ProfileVisibility, DmPolicy, ActivityVisibility } from "@/lib/types";
import {
  Settings,
  User,
  Shield,
  Users,
  Eye,
  EyeOff,
  Save,
  Loader2,
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  Mail,
  Calendar,
  Flag,
  Hash,
  Lock,
  MessageCircle,
  Bell,
  Globe,
  UserX,
  AtSign,
  Activity,
  Building2,
  Vote,
  Info,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatDate } from "@/lib/utils";
import { triggerTranslation } from "@/lib/translate";
import { useLanguage } from "@/components/core/language-provider";

// Reusable toggle component
function Toggle({
  enabled,
  onChange,
  disabled,
}: {
  enabled: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onChange(!enabled)}
      className={`w-11 h-6 rounded-full transition-colors relative shrink-0 ${
        enabled ? "bg-pangea-600" : "bg-theme-muted"
      } ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
    >
      <div
        className="w-5 h-5 rounded-full bg-white shadow-sm absolute top-0.5 transition-transform"
        style={{
          transform: enabled ? "translateX(22px)" : "translateX(0)",
          left: "2px",
        }}
      />
    </button>
  );
}

// Reusable setting row
function SettingRow({
  icon: Icon,
  label,
  description,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-2">
      <div className="flex items-center gap-3 min-w-0">
        <Icon className="w-4 h-4 text-fg-muted shrink-0" />
        <div className="min-w-0">
          <p className="text-sm text-fg">{label}</p>
          <p className="text-xs text-fg-muted">{description}</p>
        </div>
      </div>
      {children}
    </div>
  );
}

export default function SettingsPage() {
  const [user, setUser] = useState<{ id: string; email?: string; created_at?: string } | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Profile form
  const [fullName, setFullName] = useState("");
  const [bio, setBio] = useState("");
  const [allowDelegations, setAllowDelegations] = useState(true);
  const [isSearchable, setIsSearchable] = useState(true);

  // Privacy settings
  const [privacy, setPrivacy] = useState<PrivacySettings | null>(null);
  const [savingPrivacy, setSavingPrivacy] = useState(false);
  const [privacySuccess, setPrivacySuccess] = useState(false);

  // Privacy form state
  const [profileVisibility, setProfileVisibility] = useState<ProfileVisibility>("public");
  const [showFullName, setShowFullName] = useState(true);
  const [showBio, setShowBio] = useState(true);
  const [showEmail, setShowEmail] = useState(false);
  const [showJoinDate, setShowJoinDate] = useState(true);
  const [showUserCode, setShowUserCode] = useState(true);
  const [showActivity, setShowActivity] = useState(true);
  const [showDelegations, setShowDelegations] = useState(true);
  const [showPartyMembership, setShowPartyMembership] = useState(true);
  const [showJurisdictionMembership, setShowJurisdictionMembership] = useState(true);
  const [showOnlineStatus, setShowOnlineStatus] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [dmPolicy, setDmPolicy] = useState<DmPolicy>("everyone");
  const [allowFriendRequests, setAllowFriendRequests] = useState(true);
  const [allowMentions, setAllowMentions] = useState(true);
  const [activityVisibility, setActivityVisibility] = useState<ActivityVisibility>("public");

  // Notifications
  const [notifyMentions, setNotifyMentions] = useState(true);
  const [notifyReplies, setNotifyReplies] = useState(true);
  const [notifyDelegations, setNotifyDelegations] = useState(true);
  const [notifyProposals, setNotifyProposals] = useState(true);
  const [notifyDm, setNotifyDm] = useState(true);

  // Party weights
  const [partyMemberships, setPartyMemberships] = useState<
    { id: string; party_id: string; party_name: string; logo_emoji: string; vote_weight: number }[]
  >([]);
  const [savingWeights, setSavingWeights] = useState(false);
  const [weightsSuccess, setWeightsSuccess] = useState(false);

  // Dual profile (Art. 2.4)
  const [publicProfileActive, setPublicProfileActive] = useState(false);
  const [publicDisplayName, setPublicDisplayName] = useState("");
  const [publicShowBio, setPublicShowBio] = useState(true);
  const [publicShowEmail, setPublicShowEmail] = useState(false);
  const [publicShowActivity, setPublicShowActivity] = useState(true);
  const [publicShowDelegations, setPublicShowDelegations] = useState(true);
  const [publicShowGroupMembership, setPublicShowGroupMembership] = useState(true);

  // Password
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const supabase = createClient();
  const router = useRouter();
  const { t } = useLanguage();

  const loadProfile = useCallback(async () => {
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();
    if (!authUser) {
      router.push("/auth");
      return;
    }
    setUser(authUser);

    // Load profile
    const { data: prof } = await supabase.from("profiles").select("*").eq("id", authUser.id).single();
    if (prof) {
      setProfile(prof);
      setFullName(prof.full_name ?? "");
      setBio(prof.bio ?? "");
      setAllowDelegations(prof.allow_delegations ?? true);
      setIsSearchable(prof.is_searchable ?? true);
      setPublicProfileActive(prof.public_profile_active ?? false);
    }

    // Load privacy settings
    const { data: privData } = await supabase
      .from("privacy_settings")
      .select("*")
      .eq("user_id", authUser.id)
      .single();
    if (privData) {
      setPrivacy(privData as PrivacySettings);
      setProfileVisibility(privData.profile_visibility || "public");
      setShowFullName(privData.show_full_name ?? true);
      setShowBio(privData.show_bio ?? true);
      setShowEmail(privData.show_email ?? false);
      setShowJoinDate(privData.show_join_date ?? true);
      setShowUserCode(privData.show_user_code ?? true);
      setShowActivity(privData.show_activity ?? true);
      setShowDelegations(privData.show_delegations ?? true);
      setShowPartyMembership(privData.show_group_membership ?? true);
      setShowOnlineStatus(privData.show_online_status ?? false);
      setDisplayName(privData.display_name || "");
      setDmPolicy(privData.dm_policy || "everyone");
      setAllowFriendRequests(privData.allow_friend_requests ?? true);
      setAllowMentions(privData.allow_mentions ?? true);
      setActivityVisibility(privData.activity_visibility || "public");
      setNotifyMentions(privData.notify_mentions ?? true);
      setNotifyReplies(privData.notify_replies ?? true);
      setNotifyDelegations(privData.notify_delegations ?? true);
      setNotifyProposals(privData.notify_proposals ?? true);
      setNotifyDm(privData.notify_dm ?? true);
      // Dual profile settings
      setPublicDisplayName(privData.public_display_name || "");
      setPublicShowBio(privData.public_show_bio ?? true);
      setPublicShowEmail(privData.public_show_email ?? false);
      setPublicShowActivity(privData.public_show_activity ?? true);
      setPublicShowDelegations(privData.public_show_delegations ?? true);
      setPublicShowGroupMembership(privData.public_show_group_membership ?? true);
    }

    // Load group memberships
    const { data: memberships } = await supabase
      .from("group_members")
      .select("id, group_id, vote_weight, groups(name, logo_emoji, group_type)")
      .eq("user_id", authUser.id);
    if (memberships) {
      setPartyMemberships(
        memberships.map((m: Record<string, unknown>) => ({
          id: m.id as string,
          party_id: m.group_id as string,
          party_name: (m.groups as Record<string, string>)?.name || "Group",
          logo_emoji: (m.groups as Record<string, string>)?.logo_emoji || "🏛️",
          vote_weight: m.vote_weight as number,
        }))
      );
    }

    setLoading(false);
  }, [supabase, router]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  async function saveProfile() {
    if (!user) return;
    setSaving(true);
    setError(null);
    setSuccess(false);

    const { error: err } = await supabase
      .from("profiles")
      .update({
        full_name: fullName.trim() || null,
        bio: bio.trim() || null,
        allow_delegations: allowDelegations,
        is_searchable: isSearchable,
      })
      .eq("id", user.id);

    if (err) setError(err.message);
    else {
      setSuccess(true);
      // Trigger translation for bio if it changed
      if (bio.trim() && user?.id) {
        triggerTranslation(bio.trim(), "citizen_bio", user.id);
      }
    }
    setSaving(false);
    setTimeout(() => setSuccess(false), 3000);
  }

  async function savePrivacySettings() {
    if (!user) return;
    setSavingPrivacy(true);
    setPrivacySuccess(false);

    const { error: err } = await supabase
      .from("privacy_settings")
      .update({
        profile_visibility: profileVisibility,
        show_full_name: showFullName,
        show_bio: showBio,
        show_email: showEmail,
        show_join_date: showJoinDate,
        show_user_code: showUserCode,
        show_activity: showActivity,
        show_delegations: showDelegations,
        show_group_membership: showPartyMembership,
        show_online_status: showOnlineStatus,
        display_name: displayName.trim() || null,
        dm_policy: dmPolicy,
        allow_friend_requests: allowFriendRequests,
        allow_mentions: allowMentions,
        activity_visibility: activityVisibility,
        notify_mentions: notifyMentions,
        notify_replies: notifyReplies,
        notify_delegations: notifyDelegations,
        notify_proposals: notifyProposals,
        notify_dm: notifyDm,
        // Dual profile (Art. 2.4)
        public_display_name: publicDisplayName.trim() || null,
        public_show_bio: publicShowBio,
        public_show_email: publicShowEmail,
        public_show_activity: publicShowActivity,
        public_show_delegations: publicShowDelegations,
        public_show_group_membership: publicShowGroupMembership,
      })
      .eq("user_id", user.id);

    if (err) {
      setError(err.message);
    } else {
      setPrivacySuccess(true);
    }
    setSavingPrivacy(false);
    setTimeout(() => setPrivacySuccess(false), 3000);
  }

  async function saveGroupWeights() {
    setSavingWeights(true);
    setWeightsSuccess(false);
    for (const gm of partyMemberships) {
      await supabase.from("group_members").update({ vote_weight: gm.vote_weight }).eq("id", gm.id);
    }
    setWeightsSuccess(true);
    setSavingWeights(false);
    setTimeout(() => setWeightsSuccess(false), 3000);
  }

  function updatePartyWeight(partyId: string, weight: number) {
    setPartyMemberships((prev) =>
      prev.map((pm) =>
        pm.party_id === partyId ? { ...pm, vote_weight: Math.max(1, Math.min(100, weight)) } : pm
      )
    );
  }

  async function changePassword() {
    setPasswordError(null);
    setPasswordSuccess(false);
    if (newPassword.length < 8) {
      setPasswordError(t("settings.passwordTooShort"));
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError(t("settings.passwordMismatch"));
      return;
    }
    setChangingPassword(true);
    const { error: err } = await supabase.auth.updateUser({ password: newPassword });
    if (err) setPasswordError(err.message);
    else {
      setPasswordSuccess(true);
      setNewPassword("");
      setConfirmPassword("");
    }
    setChangingPassword(false);
    setTimeout(() => setPasswordSuccess(false), 3000);
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--background)] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-fg-primary animate-spin" />
      </div>
    );
  }

  const isPrivate = profileVisibility === "private";

  return (
    <AppShell userEmail={user?.email} userName={profile?.full_name} userRole={profile?.role}>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8 overflow-hidden">
          <Link
            href="/dashboard"
            className="shrink-0 p-2 rounded-lg text-fg-muted hover:text-fg hover:bg-theme-card transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold text-fg flex items-center gap-2">
              <Settings className="w-5 h-5 sm:w-6 sm:h-6 text-fg-primary shrink-0" />
              <span className="truncate">{t("settings.pageTitle")}</span>
            </h1>
            <p className="text-xs sm:text-sm text-fg-muted mt-0.5 truncate">{t("settings.pageDesc")}</p>
          </div>
        </div>

        <div className="space-y-6">
          {/* ──── Account info (read-only) ──── */}
          <div className="card p-6">
            <h2 className="text-lg font-semibold text-fg mb-4 flex items-center gap-2">
              <Shield className="w-5 h-5 text-fg-primary" />
              {t("settings.accountInfo")}
            </h2>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <Mail className="w-4 h-4 text-fg-muted" />
                <div>
                  <p className="text-xs text-fg-muted">{t("settings.emailField")}</p>
                  <p className="text-sm text-fg">{user?.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Shield className="w-4 h-4 text-fg-muted" />
                <div>
                  <p className="text-xs text-fg-muted">{t("settings.roleField")}</p>
                  <p className="text-sm text-fg capitalize">{profile?.role || "citizen"}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Hash className="w-4 h-4 text-fg-muted" />
                <div>
                  <p className="text-xs text-fg-muted">{t("settings.citizenCode")}</p>
                  <p className="text-sm text-fg-primary font-mono font-semibold tracking-wider">
                    {profile?.user_code || "—"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Calendar className="w-4 h-4 text-fg-muted" />
                <div>
                  <p className="text-xs text-fg-muted">{t("settings.memberSince")}</p>
                  <p className="text-sm text-fg">
                    {profile?.created_at ? formatDate(profile.created_at) : "—"}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* ──── Public Profile ──── */}
          <div className="card p-6">
            <h2 className="text-lg font-semibold text-fg mb-4 flex items-center gap-2">
              <User className="w-5 h-5 text-fg-primary" />
              {t("settings.publicProfileSection")}
            </h2>
            <div className="space-y-4">
              <div>
                <label className="label">{t("settings.fullNameLabel")}</label>
                <input
                  type="text"
                  className="input-field"
                  placeholder={t("settings.fullNamePlaceholder")}
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  maxLength={100}
                />
              </div>
              <div>
                <label className="label">{t("settings.bioLabel")}</label>
                <textarea
                  className="input-field min-h-[100px] resize-y"
                  placeholder={t("settings.bioPlaceholder")}
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  maxLength={500}
                />
                <p className="text-xs text-fg-muted mt-1">{bio.length}/500 {t("settings.bioCharCount")}</p>
              </div>
              <div>
                <label className="label">{t("settings.displayNameLabel")}</label>
                <input
                  type="text"
                  className="input-field"
                  placeholder={t("settings.displayNamePlaceholder")}
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  maxLength={50}
                />
                <p className="text-xs text-fg-muted mt-1">
                  {t("settings.displayNameHint")}
                </p>
              </div>
            </div>
          </div>

          {/* ──── Delegations ──── */}
          <div className="card p-6">
            <h2 className="text-lg font-semibold text-fg mb-4 flex items-center gap-2">
              <Vote className="w-5 h-5 text-fg-primary" />
              {t("settings.delegationsSection")}
            </h2>
            <div className="space-y-3">
              <SettingRow
                icon={Users}
                label={t("settings.acceptDelegations")}
                description={t("settings.acceptDelegationsDesc")}
              >
                <Toggle enabled={allowDelegations} onChange={setAllowDelegations} />
              </SettingRow>
              <SettingRow
                icon={Eye}
                label={t("settings.searchableProfile")}
                description={t("settings.searchableProfileDesc")}
              >
                <Toggle enabled={isSearchable} onChange={setIsSearchable} />
              </SettingRow>
            </div>
          </div>

          {/* ──── Dual Profile (Art. 2.4) ──── */}
          <div className="card p-6">
            <h2 className="text-lg font-semibold text-fg mb-2 flex items-center gap-2">
              <Users className="w-5 h-5 text-fg-primary" />
              {t("settings.dualProfile.title")}
            </h2>
            <p className="text-xs text-fg-muted mb-4">
              Every citizen has two profiles: a private one (default) and a public one. The public profile activates automatically when you accept delegations or become a group leader. Actions performed as a delegate are always visible through your public profile.
            </p>

            {/* Status badge */}
            <div className={`flex items-center gap-3 p-3 rounded-lg border mb-4 ${
              publicProfileActive
                ? "border-pangea-500/50 bg-pangea-900/20"
                : "border-theme bg-theme-card/30"
            }`}>
              <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                publicProfileActive ? "bg-pangea-400" : "bg-fg-muted"
              }`} />
              <div className="flex-1">
                <p className="text-sm text-fg font-medium">
                  {publicProfileActive ? t("settings.dualProfile.active") : t("settings.dualProfile.inactive")}
                </p>
                <p className="text-xs text-fg-muted">
                  {publicProfileActive
                    ? t("settings.dualProfile.activeDesc")
                    : t("settings.dualProfile.inactiveDesc")
                  }
                </p>
              </div>
              {publicProfileActive && (
                <button
                  onClick={async () => {
                    if (!user) return;
                    const { error: err } = await supabase.rpc("deactivate_public_profile", { p_user_id: user.id });
                    if (err) {
                      if (err.message.includes("CANNOT_DEACTIVATE_WITH_DELEGATIONS")) {
                        setError(t("settings.dualProfile.cannotDeactivate"));
                      } else {
                        setError(err.message);
                      }
                    } else {
                      setPublicProfileActive(false);
                    }
                  }}
                  className="text-xs text-fg-muted hover:text-fg-danger transition-colors shrink-0"
                >
                  {t("settings.dualProfile.deactivate")}
                </button>
              )}
            </div>

            {/* Public profile settings (only shown when active) */}
            {publicProfileActive && (
              <div className="space-y-4 pt-2 border-t border-theme">
                <p className="text-xs text-fg-muted pt-3">
                  {t("settings.dualProfile.publicSettings")}
                </p>
                <div>
                  <label className="label">{t("settings.dualProfile.publicDisplayName")}</label>
                  <input
                    type="text"
                    className="input-field"
                    placeholder={t("settings.dualProfile.publicDisplayNamePlaceholder")}
                    value={publicDisplayName}
                    onChange={(e) => setPublicDisplayName(e.target.value)}
                    maxLength={50}
                  />
                  <p className="text-xs text-fg-muted mt-1">
                    {t("settings.dualProfile.publicDisplayNameHint")}
                  </p>
                </div>
                <div className="space-y-3 divide-y divide-slate-700/30">
                  <SettingRow icon={Info} label={t("settings.dualProfile.showBioPublicly")} description={t("settings.dualProfile.showBioPubliclyDesc")}>
                    <Toggle enabled={publicShowBio} onChange={setPublicShowBio} />
                  </SettingRow>
                  <SettingRow icon={Mail} label={t("settings.dualProfile.showEmailPublicly")} description={t("settings.dualProfile.showEmailPubliclyDesc")}>
                    <Toggle enabled={publicShowEmail} onChange={setPublicShowEmail} />
                  </SettingRow>
                  <SettingRow icon={Activity} label={t("settings.dualProfile.showActivityPublicly")} description={t("settings.dualProfile.showActivityPubliclyDesc")}>
                    <Toggle enabled={publicShowActivity} onChange={setPublicShowActivity} />
                  </SettingRow>
                  <SettingRow icon={Users} label={t("settings.dualProfile.showDelegationsPublicly")} description={t("settings.dualProfile.showDelegationsPubliclyDesc")}>
                    <Toggle enabled={publicShowDelegations} onChange={setPublicShowDelegations} />
                  </SettingRow>
                  <SettingRow icon={Building2} label={t("settings.dualProfile.showGroupMembershipsPublicly")} description={t("settings.dualProfile.showGroupMembershipsPubliclyDesc")}>
                    <Toggle enabled={publicShowGroupMembership} onChange={setPublicShowGroupMembership} />
                  </SettingRow>
                </div>
              </div>
            )}
          </div>

          {/* Save profile button */}
          {error && (
            <div className="p-3 bg-danger-tint border border-theme rounded-lg text-fg-danger text-sm flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" /> {error}
            </div>
          )}
          {success && (
            <div className="p-3 bg-green-900/30 border border-green-700/50 rounded-lg text-fg-success text-sm flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" /> {t("settings.profileSaved")}
            </div>
          )}
          <button
            onClick={saveProfile}
            disabled={saving}
            className="btn-primary w-full flex items-center justify-center gap-2 py-3"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {saving ? t("settings.savingProfile") : t("settings.saveProfile")}
          </button>

          {/* ═══════════════════════════════════════════ */}
          {/* ──── EMAIL MANAGEMENT ──── */}
          <div className="card border border-theme p-6 space-y-4">
            <MultiEmailManager />
          </div>

          {/* ═══════════════════════════════════════════ */}
          {/* ──── PRIVACY & VISIBILITY ──── */}
          {/* ═══════════════════════════════════════════ */}
          <div className="border-t border-theme pt-6">
            <h2 className="text-xl font-bold text-fg mb-1 flex items-center gap-2">
              <Lock className="w-5 h-5 text-amber-400" />
              {t("settings.privacyTitle")}
            </h2>
            <p className="text-sm text-fg-muted mb-6">
              {t("settings.privacyDesc")}
            </p>
          </div>

          {/* Profile visibility level */}
          <div className="card p-6">
            <h3 className="text-base font-semibold text-fg mb-3 flex items-center gap-2">
              <Globe className="w-4 h-4 text-fg-primary" />
              {t("settings.profileVisibilitySection")}
            </h3>
            <p className="text-xs text-fg-muted mb-4">
              {t("settings.profileVisibilityDesc")}
            </p>
            <div className="space-y-2">
              {(
                [
                  {
                    value: "public" as const,
                    label: t("settings.visibilityPublic"),
                    desc: t("settings.visibilityPublicDesc"),
                    icon: Globe,
                  },
                  {
                    value: "registered_only" as const,
                    label: t("settings.visibilityRegistered"),
                    desc: t("settings.visibilityRegisteredDesc"),
                    icon: Users,
                  },
                  {
                    value: "private" as const,
                    label: t("settings.visibilityPrivate"),
                    desc: t("settings.visibilityPrivateDesc"),
                    icon: Lock,
                  },
                ]
              ).map((opt) => (
                <label
                  key={opt.value}
                  className={`flex items-start gap-3 p-3 rounded-lg cursor-pointer border transition-colors ${
                    profileVisibility === opt.value
                      ? "border-pangea-500/50 bg-pangea-900/20"
                      : "border-theme bg-theme-card/30 hover:border-theme/50"
                  }`}
                >
                  <input
                    type="radio"
                    name="profileVisibility"
                    value={opt.value}
                    checked={profileVisibility === opt.value}
                    onChange={() => setProfileVisibility(opt.value)}
                    className="mt-1 accent-pangea-500"
                  />
                  <div>
                    <div className="flex items-center gap-1.5">
                      <opt.icon className="w-3.5 h-3.5 text-fg-muted" />
                      <span className="text-sm text-fg font-medium">{opt.label}</span>
                    </div>
                    <p className="text-xs text-fg-muted mt-0.5">{opt.desc}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Field visibility toggles */}
          <div className="card p-6">
            <h3 className="text-base font-semibold text-fg mb-3 flex items-center gap-2">
              <EyeOff className="w-4 h-4 text-fg-primary" />
              {t("settings.visibleInfo")}
            </h3>
            <p className="text-xs text-fg-muted mb-4">
              {t("settings.visibleInfoDesc")}
            </p>

            <div className="space-y-3 divide-y divide-slate-700/30">
              <SettingRow icon={User} label={t("settings.showRealName")} description={t("settings.showRealNameDesc")}>
                <Toggle enabled={showFullName} onChange={setShowFullName} disabled={isPrivate} />
              </SettingRow>
              <SettingRow icon={Info} label={t("settings.showBio")} description={t("settings.showBioDesc")}>
                <Toggle enabled={showBio} onChange={setShowBio} disabled={isPrivate} />
              </SettingRow>
              <SettingRow icon={Mail} label={t("settings.showEmail")} description={t("settings.showEmailDesc")}>
                <Toggle enabled={showEmail} onChange={setShowEmail} disabled={isPrivate} />
              </SettingRow>
              <SettingRow icon={Calendar} label={t("settings.showJoinDate")} description={t("settings.showJoinDateDesc")}>
                <Toggle enabled={showJoinDate} onChange={setShowJoinDate} disabled={isPrivate} />
              </SettingRow>
              <SettingRow icon={Hash} label={t("settings.showCitizenCode")} description={t("settings.showCitizenCodeDesc")}>
                <Toggle enabled={showUserCode} onChange={setShowUserCode} />
              </SettingRow>
            </div>

            {isPrivate && (
              <div className="mt-4 p-3 bg-warning-tint border border-theme rounded-lg text-amber-300/80 text-xs flex items-start gap-2">
                <Lock className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                <span>{t("settings.profilePrivateNote")}</span>
              </div>
            )}
          </div>

          {/* Activity visibility */}
          <div className="card p-6">
            <h3 className="text-base font-semibold text-fg mb-3 flex items-center gap-2">
              <Activity className="w-4 h-4 text-fg-primary" />
              {t("settings.activityVisibilitySection")}
            </h3>
            <p className="text-xs text-fg-muted mb-4">
              {t("settings.activityVisibilityDesc")}
            </p>

            <div className="space-y-2 mb-4">
              {(
                [
                  { value: "public" as const, label: t("settings.activityPublic"), desc: t("settings.activityPublicDesc") },
                  { value: "registered_only" as const, label: t("settings.activityRegistered"), desc: t("settings.activityRegisteredDesc") },
                  { value: "private" as const, label: t("settings.activityPrivate"), desc: t("settings.activityPrivateDesc") },
                ]
              ).map((opt) => (
                <label
                  key={opt.value}
                  className={`flex items-center gap-3 p-2.5 rounded-lg cursor-pointer border transition-colors ${
                    activityVisibility === opt.value
                      ? "border-pangea-500/50 bg-pangea-900/20"
                      : "border-theme bg-theme-card/30 hover:border-theme/50"
                  }`}
                >
                  <input
                    type="radio"
                    name="activityVisibility"
                    value={opt.value}
                    checked={activityVisibility === opt.value}
                    onChange={() => setActivityVisibility(opt.value)}
                    className="accent-pangea-500"
                  />
                  <div>
                    <span className="text-sm text-fg">{opt.label}</span>
                    <p className="text-xs text-fg-muted">{opt.desc}</p>
                  </div>
                </label>
              ))}
            </div>

            <div className="space-y-3 divide-y divide-slate-700/30">
              <SettingRow icon={Activity} label={t("settings.showProposalsVotes")} description={t("settings.showProposalsVotesDesc")}>
                <Toggle enabled={showActivity} onChange={setShowActivity} />
              </SettingRow>
              <SettingRow icon={Users} label={t("settings.showDelegations")} description={t("settings.showDelegationsDesc")}>
                <Toggle enabled={showDelegations} onChange={setShowDelegations} />
              </SettingRow>
              <SettingRow icon={Flag} label={t("settings.showGroupMemberships")} description={t("settings.showGroupMembershipsDesc")}>
                <Toggle enabled={showPartyMembership} onChange={setShowPartyMembership} />
              </SettingRow>
            </div>
          </div>

          {/* Messaging & Social */}
          <div className="card p-6">
            <h3 className="text-base font-semibold text-fg mb-3 flex items-center gap-2">
              <MessageCircle className="w-4 h-4 text-fg-primary" />
              {t("settings.messagingSocial")}
            </h3>
            <p className="text-xs text-fg-muted mb-4">
              {t("settings.messagingSocialDesc")}
            </p>

            {/* DM Policy */}
            <div className="mb-4">
              <p className="text-sm text-fg mb-2">{t("settings.whoCanDm")}</p>
              <div className="space-y-2">
                {(
                  [
                    { value: "everyone" as const, label: t("settings.dmEveryone"), desc: t("settings.dmEveryoneDesc") },
                    {
                      value: "followed_only" as const,
                      label: t("settings.dmFollowedOnly"),
                      desc: t("settings.dmFollowedOnlyDesc"),
                    },
                    { value: "nobody" as const, label: t("settings.dmNobody"), desc: t("settings.dmNobodyDesc") },
                  ]
                ).map((opt) => (
                  <label
                    key={opt.value}
                    className={`flex items-center gap-3 p-2.5 rounded-lg cursor-pointer border transition-colors ${
                      dmPolicy === opt.value
                        ? "border-pangea-500/50 bg-pangea-900/20"
                        : "border-theme bg-theme-card/30 hover:border-theme/50"
                    }`}
                  >
                    <input
                      type="radio"
                      name="dmPolicy"
                      value={opt.value}
                      checked={dmPolicy === opt.value}
                      onChange={() => setDmPolicy(opt.value)}
                      className="accent-pangea-500"
                    />
                    <div>
                      <span className="text-sm text-fg">{opt.label}</span>
                      <p className="text-xs text-fg-muted">{opt.desc}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <div className="space-y-3 divide-y divide-slate-700/30">
              <SettingRow icon={UserX} label={t("settings.allowFriendRequests")} description={t("settings.allowFriendRequestsDesc")}>
                <Toggle enabled={allowFriendRequests} onChange={setAllowFriendRequests} />
              </SettingRow>
              <SettingRow icon={AtSign} label={t("settings.allowMentions")} description={t("settings.allowMentionsDesc")}>
                <Toggle enabled={allowMentions} onChange={setAllowMentions} />
              </SettingRow>
              <SettingRow
                icon={Eye}
                label={t("settings.showOnlineStatus")}
                description={t("settings.showOnlineStatusDesc")}
              >
                <Toggle enabled={showOnlineStatus} onChange={setShowOnlineStatus} />
              </SettingRow>
            </div>
          </div>

          {/* Notification preferences */}
          <div className="card p-6">
            <h3 className="text-base font-semibold text-fg mb-3 flex items-center gap-2">
              <Bell className="w-4 h-4 text-fg-primary" />
              {t("settings.notificationPrefs")}
            </h3>
            <p className="text-xs text-fg-muted mb-4">
              {t("settings.notificationPrefsDesc")}
            </p>

            <div className="space-y-3 divide-y divide-slate-700/30">
              <SettingRow icon={AtSign} label={t("settings.notifyMentions")} description={t("settings.notifyMentionsDesc")}>
                <Toggle enabled={notifyMentions} onChange={setNotifyMentions} />
              </SettingRow>
              <SettingRow icon={MessageCircle} label={t("settings.notifyReplies")} description={t("settings.notifyRepliesDesc")}>
                <Toggle enabled={notifyReplies} onChange={setNotifyReplies} />
              </SettingRow>
              <SettingRow icon={Users} label={t("settings.notifyDelegationsLabel")} description={t("settings.notifyDelegationsDesc")}>
                <Toggle enabled={notifyDelegations} onChange={setNotifyDelegations} />
              </SettingRow>
              <SettingRow icon={Flag} label={t("settings.notifyProposals")} description={t("settings.notifyProposalsDesc")}>
                <Toggle enabled={notifyProposals} onChange={setNotifyProposals} />
              </SettingRow>
              <SettingRow icon={MessageCircle} label={t("settings.notifyDm")} description={t("settings.notifyDmDesc")}>
                <Toggle enabled={notifyDm} onChange={setNotifyDm} />
              </SettingRow>
            </div>
          </div>

          {/* Save privacy button */}
          {privacySuccess && (
            <div className="p-3 bg-green-900/30 border border-green-700/50 rounded-lg text-fg-success text-sm flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" /> {t("settings.privacySaved")}
            </div>
          )}
          <button
            onClick={savePrivacySettings}
            disabled={savingPrivacy}
            className="btn-primary w-full flex items-center justify-center gap-2 py-3"
          >
            {savingPrivacy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
            {savingPrivacy ? t("settings.savingPrivacy") : t("settings.savePrivacy")}
          </button>

          {/* ──── Group vote weights ──── */}
          {partyMemberships.length > 0 && (
            <div className="card p-6">
              <h2 className="text-lg font-semibold text-fg mb-4 flex items-center gap-2">
                <Flag className="w-5 h-5 text-fg-primary" />
                {t("settings.groupVoteWeights")}
              </h2>
              <p className="text-xs text-fg-muted mb-4">
                {t("settings.groupVoteWeightsDesc")}
              </p>
              <div className="space-y-3">
                {partyMemberships.map((pm) => {
                  const totalWeight = partyMemberships.reduce((s, p) => s + p.vote_weight, 0);
                  const percentage = totalWeight > 0 ? Math.round((pm.vote_weight / totalWeight) * 100) : 0;
                  return (
                    <div key={pm.party_id} className="flex items-center gap-3 bg-theme-card rounded-lg p-3">
                      <span className="text-xl">{pm.logo_emoji}</span>
                      <div className="flex-1 min-w-0">
                        <Link
                          href={`/groups/${pm.party_id}`}
                          className="text-sm text-fg hover:text-fg-primary transition-colors"
                        >
                          {pm.party_name}
                        </Link>
                        <p className="text-[10px] text-fg-muted">{percentage}{t("settings.ofYourVote")}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => updatePartyWeight(pm.party_id, pm.vote_weight - 1)}
                          className="w-7 h-7 rounded bg-theme-muted text-fg hover:bg-theme-muted flex items-center justify-center text-sm font-bold"
                          disabled={pm.vote_weight <= 1}
                        >
                          −
                        </button>
                        <input
                          type="number"
                          value={pm.vote_weight}
                          onChange={(e) => updatePartyWeight(pm.party_id, parseInt(e.target.value) || 1)}
                          className="w-14 text-center input-field py-1 text-sm"
                          min={1}
                          max={100}
                        />
                        <button
                          onClick={() => updatePartyWeight(pm.party_id, pm.vote_weight + 1)}
                          className="w-7 h-7 rounded bg-theme-muted text-fg hover:bg-theme-muted flex items-center justify-center text-sm font-bold"
                          disabled={pm.vote_weight >= 100}
                        >
                          +
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
              {weightsSuccess && (
                <div className="mt-3 p-2 bg-green-900/30 border border-green-700/50 rounded-lg text-fg-success text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5" /> {t("settings.weightsUpdated")}
                </div>
              )}
              <button
                onClick={saveGroupWeights}
                disabled={savingWeights}
                className="mt-3 btn-secondary w-full flex items-center justify-center gap-2 text-sm"
              >
                {savingWeights ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {savingWeights ? t("settings.savingProfile") : t("settings.saveGroupWeights")}
              </button>
            </div>
          )}

          {/* ──── Change Password ──── */}
          <div className="card p-6">
            <h2 className="text-lg font-semibold text-fg mb-4 flex items-center gap-2">
              <Shield className="w-5 h-5 text-amber-400" />
              {t("settings.changePassword")}
            </h2>
            <div className="space-y-4">
              <div>
                <label className="label">{t("settings.newPasswordLabel")}</label>
                <input
                  type="password"
                  className="input-field"
                  placeholder={t("settings.newPasswordPlaceholder")}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
              </div>
              <div>
                <label className="label">{t("settings.confirmPasswordLabel")}</label>
                <input
                  type="password"
                  className="input-field"
                  placeholder={t("settings.confirmPasswordPlaceholder")}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>
              {passwordError && (
                <div className="p-3 bg-danger-tint border border-theme rounded-lg text-fg-danger text-sm flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" /> {passwordError}
                </div>
              )}
              {passwordSuccess && (
                <div className="p-3 bg-green-900/30 border border-green-700/50 rounded-lg text-fg-success text-sm flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" /> {t("settings.passwordUpdated")}
                </div>
              )}
              <button
                onClick={changePassword}
                disabled={changingPassword || !newPassword}
                className="btn-secondary w-full flex items-center justify-center gap-2"
              >
                {changingPassword ? <Loader2 className="w-4 h-4 animate-spin" /> : <Shield className="w-4 h-4" />}
                {changingPassword ? t("settings.updatingPassword") : t("settings.updatePassword")}
              </button>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

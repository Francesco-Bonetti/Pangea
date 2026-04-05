"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import AppShell from "@/components/AppShell";
import MultiEmailManager from "@/components/MultiEmailManager";
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

  // Password
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const supabase = createClient();
  const router = useRouter();

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
      setPasswordError("Password must be at least 8 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("Passwords do not match.");
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
              <span className="truncate">Account Settings</span>
            </h1>
            <p className="text-xs sm:text-sm text-fg-muted mt-0.5 truncate">Manage your profile, privacy, and preferences</p>
          </div>
        </div>

        <div className="space-y-6">
          {/* ──── Account info (read-only) ──── */}
          <div className="card p-6">
            <h2 className="text-lg font-semibold text-fg mb-4 flex items-center gap-2">
              <Shield className="w-5 h-5 text-fg-primary" />
              Account Information
            </h2>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <Mail className="w-4 h-4 text-fg-muted" />
                <div>
                  <p className="text-xs text-fg-muted">Email</p>
                  <p className="text-sm text-fg">{user?.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Shield className="w-4 h-4 text-fg-muted" />
                <div>
                  <p className="text-xs text-fg-muted">Role</p>
                  <p className="text-sm text-fg capitalize">{profile?.role || "citizen"}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Hash className="w-4 h-4 text-fg-muted" />
                <div>
                  <p className="text-xs text-fg-muted">Citizen Code</p>
                  <p className="text-sm text-fg-primary font-mono font-semibold tracking-wider">
                    {profile?.user_code || "—"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Calendar className="w-4 h-4 text-fg-muted" />
                <div>
                  <p className="text-xs text-fg-muted">Member since</p>
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
              Public Profile
            </h2>
            <div className="space-y-4">
              <div>
                <label className="label">Full name</label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="Your real name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  maxLength={100}
                />
              </div>
              <div>
                <label className="label">Bio</label>
                <textarea
                  className="input-field min-h-[100px] resize-y"
                  placeholder="Tell fellow citizens something about yourself..."
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  maxLength={500}
                />
                <p className="text-xs text-fg-muted mt-1">{bio.length}/500 characters</p>
              </div>
              <div>
                <label className="label">Display name (optional)</label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="Alternative name shown when your real name is hidden"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  maxLength={50}
                />
                <p className="text-xs text-fg-muted mt-1">
                  If you hide your real name, this will be shown instead. For example: &quot;EcoVoter42&quot; or &quot;Citizen X&quot;.
                </p>
              </div>
            </div>
          </div>

          {/* ──── Delegations ──── */}
          <div className="card p-6">
            <h2 className="text-lg font-semibold text-fg mb-4 flex items-center gap-2">
              <Vote className="w-5 h-5 text-fg-primary" />
              Delegations
            </h2>
            <div className="space-y-3">
              <SettingRow
                icon={Users}
                label="Accept delegations"
                description="Allow other citizens to delegate their vote to you"
              >
                <Toggle enabled={allowDelegations} onChange={setAllowDelegations} />
              </SettingRow>
              <SettingRow
                icon={Eye}
                label="Searchable profile"
                description="Appear in search results when citizens look for delegates"
              >
                <Toggle enabled={isSearchable} onChange={setIsSearchable} />
              </SettingRow>
            </div>
          </div>

          {/* Save profile button */}
          {error && (
            <div className="p-3 bg-danger-tint border border-theme rounded-lg text-fg-danger text-sm flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" /> {error}
            </div>
          )}
          {success && (
            <div className="p-3 bg-green-900/30 border border-green-700/50 rounded-lg text-fg-success text-sm flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" /> Profile updated successfully!
            </div>
          )}
          <button
            onClick={saveProfile}
            disabled={saving}
            className="btn-primary w-full flex items-center justify-center gap-2 py-3"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {saving ? "Saving..." : "Save profile"}
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
              Privacy & Visibility
            </h2>
            <p className="text-sm text-fg-muted mb-6">
              Control what other citizens can see about you. These settings apply across the entire platform.
            </p>
          </div>

          {/* Profile visibility level */}
          <div className="card p-6">
            <h3 className="text-base font-semibold text-fg mb-3 flex items-center gap-2">
              <Globe className="w-4 h-4 text-fg-primary" />
              Profile Visibility
            </h3>
            <p className="text-xs text-fg-muted mb-4">
              Choose who can see your profile page. For example, if you select &quot;Private&quot;, only your display name or citizen code will be visible.
            </p>
            <div className="space-y-2">
              {(
                [
                  {
                    value: "public",
                    label: "Public",
                    desc: "Anyone can see your profile, including visitors who are not logged in",
                    icon: Globe,
                  },
                  {
                    value: "registered_only",
                    label: "Registered citizens only",
                    desc: "Only logged-in citizens can see your profile details",
                    icon: Users,
                  },
                  {
                    value: "private",
                    label: "Private",
                    desc: "Your profile is hidden. Only your display name or citizen code is visible",
                    icon: Lock,
                  },
                ] as const
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
              Visible Information
            </h3>
            <p className="text-xs text-fg-muted mb-4">
              Choose which details are visible to other citizens. For example, you can hide your real name and show only your display name.
            </p>

            <div className="space-y-3 divide-y divide-slate-700/30">
              <SettingRow icon={User} label="Show real name" description="Display your full name on your profile and in posts">
                <Toggle enabled={showFullName} onChange={setShowFullName} disabled={isPrivate} />
              </SettingRow>
              <SettingRow icon={Info} label="Show bio" description="Display your biography on your profile page">
                <Toggle enabled={showBio} onChange={setShowBio} disabled={isPrivate} />
              </SettingRow>
              <SettingRow icon={Mail} label="Show email" description="Display your email address (hidden by default for safety)">
                <Toggle enabled={showEmail} onChange={setShowEmail} disabled={isPrivate} />
              </SettingRow>
              <SettingRow icon={Calendar} label="Show join date" description="Show when you joined the platform">
                <Toggle enabled={showJoinDate} onChange={setShowJoinDate} disabled={isPrivate} />
              </SettingRow>
              <SettingRow icon={Hash} label="Show citizen code" description="Display your unique citizen identifier">
                <Toggle enabled={showUserCode} onChange={setShowUserCode} />
              </SettingRow>
            </div>

            {isPrivate && (
              <div className="mt-4 p-3 bg-warning-tint border border-theme rounded-lg text-amber-300/80 text-xs flex items-start gap-2">
                <Lock className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                <span>
                  Your profile is set to Private. Most fields are automatically hidden. Only your citizen code visibility can be toggled.
                </span>
              </div>
            )}
          </div>

          {/* Activity visibility */}
          <div className="card p-6">
            <h3 className="text-base font-semibold text-fg mb-3 flex items-center gap-2">
              <Activity className="w-4 h-4 text-fg-primary" />
              Activity Visibility
            </h3>
            <p className="text-xs text-fg-muted mb-4">
              Control who can see your activity on the platform. For example, you can hide your proposals and votes from other citizens.
            </p>

            <div className="space-y-2 mb-4">
              {(
                [
                  { value: "public", label: "Public", desc: "Anyone can see your activity" },
                  { value: "registered_only", label: "Registered citizens only", desc: "Only logged-in citizens" },
                  { value: "private", label: "Private", desc: "Nobody can see your activity" },
                ] as const
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
              <SettingRow icon={Activity} label="Show proposals & votes" description="Display your voting and proposal activity">
                <Toggle enabled={showActivity} onChange={setShowActivity} />
              </SettingRow>
              <SettingRow icon={Users} label="Show delegations" description="Display your delegation relationships">
                <Toggle enabled={showDelegations} onChange={setShowDelegations} />
              </SettingRow>
              <SettingRow icon={Flag} label="Show group memberships" description="Display which groups you belong to">
                <Toggle enabled={showPartyMembership} onChange={setShowPartyMembership} />
              </SettingRow>
            </div>
          </div>

          {/* Messaging & Social */}
          <div className="card p-6">
            <h3 className="text-base font-semibold text-fg mb-3 flex items-center gap-2">
              <MessageCircle className="w-4 h-4 text-fg-primary" />
              Messaging & Social
            </h3>
            <p className="text-xs text-fg-muted mb-4">
              Control how other citizens can interact with you. These settings will apply to direct messages and social features.
            </p>

            {/* DM Policy */}
            <div className="mb-4">
              <p className="text-sm text-fg mb-2">Who can send you direct messages?</p>
              <div className="space-y-2">
                {(
                  [
                    { value: "everyone", label: "Everyone", desc: "Any citizen can message you" },
                    {
                      value: "followed_only",
                      label: "People you follow",
                      desc: "Only citizens you follow can message you",
                    },
                    { value: "nobody", label: "Nobody", desc: "Direct messages are disabled" },
                  ] as const
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
              <SettingRow icon={UserX} label="Allow friend requests" description="Let other citizens send you connection requests">
                <Toggle enabled={allowFriendRequests} onChange={setAllowFriendRequests} />
              </SettingRow>
              <SettingRow icon={AtSign} label="Allow mentions" description="Let other citizens @mention you in discussions">
                <Toggle enabled={allowMentions} onChange={setAllowMentions} />
              </SettingRow>
              <SettingRow
                icon={Eye}
                label="Show online status"
                description="Let others see when you are active on the platform"
              >
                <Toggle enabled={showOnlineStatus} onChange={setShowOnlineStatus} />
              </SettingRow>
            </div>
          </div>

          {/* Notification preferences */}
          <div className="card p-6">
            <h3 className="text-base font-semibold text-fg mb-3 flex items-center gap-2">
              <Bell className="w-4 h-4 text-fg-primary" />
              Notification Preferences
            </h3>
            <p className="text-xs text-fg-muted mb-4">
              Choose which notifications you want to receive. These will apply when the notification system is activated.
            </p>

            <div className="space-y-3 divide-y divide-slate-700/30">
              <SettingRow icon={AtSign} label="Mentions" description="When someone @mentions you">
                <Toggle enabled={notifyMentions} onChange={setNotifyMentions} />
              </SettingRow>
              <SettingRow icon={MessageCircle} label="Replies" description="When someone replies to your posts or comments">
                <Toggle enabled={notifyReplies} onChange={setNotifyReplies} />
              </SettingRow>
              <SettingRow icon={Users} label="Delegations" description="When someone delegates their vote to you or changes delegation">
                <Toggle enabled={notifyDelegations} onChange={setNotifyDelegations} />
              </SettingRow>
              <SettingRow icon={Flag} label="Proposals" description="Updates on proposals you voted on or authored">
                <Toggle enabled={notifyProposals} onChange={setNotifyProposals} />
              </SettingRow>
              <SettingRow icon={MessageCircle} label="Direct messages" description="When you receive a new direct message">
                <Toggle enabled={notifyDm} onChange={setNotifyDm} />
              </SettingRow>
            </div>
          </div>

          {/* Save privacy button */}
          {privacySuccess && (
            <div className="p-3 bg-green-900/30 border border-green-700/50 rounded-lg text-fg-success text-sm flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" /> Privacy settings saved!
            </div>
          )}
          <button
            onClick={savePrivacySettings}
            disabled={savingPrivacy}
            className="btn-primary w-full flex items-center justify-center gap-2 py-3"
          >
            {savingPrivacy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
            {savingPrivacy ? "Saving..." : "Save privacy settings"}
          </button>

          {/* ──── Group vote weights ──── */}
          {partyMemberships.length > 0 && (
            <div className="card p-6">
              <h2 className="text-lg font-semibold text-fg mb-4 flex items-center gap-2">
                <Flag className="w-5 h-5 text-fg-primary" />
                Group Vote Weights
              </h2>
              <p className="text-xs text-fg-muted mb-4">
                If you are a member of multiple groups, your vote is split based on these weights. For example, if Group A has
                weight 2 and Group B has weight 1, Group A gets ~67% of your vote.
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
                        <p className="text-[10px] text-fg-muted">{percentage}% of your vote</p>
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
                  <CheckCircle2 className="w-3.5 h-3.5" /> Weights updated!
                </div>
              )}
              <button
                onClick={saveGroupWeights}
                disabled={savingWeights}
                className="mt-3 btn-secondary w-full flex items-center justify-center gap-2 text-sm"
              >
                {savingWeights ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {savingWeights ? "Saving..." : "Save group weights"}
              </button>
            </div>
          )}

          {/* ──── Change Password ──── */}
          <div className="card p-6">
            <h2 className="text-lg font-semibold text-fg mb-4 flex items-center gap-2">
              <Shield className="w-5 h-5 text-amber-400" />
              Change Password
            </h2>
            <div className="space-y-4">
              <div>
                <label className="label">New password</label>
                <input
                  type="password"
                  className="input-field"
                  placeholder="Minimum 8 characters"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
              </div>
              <div>
                <label className="label">Confirm password</label>
                <input
                  type="password"
                  className="input-field"
                  placeholder="Repeat the password"
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
                  <CheckCircle2 className="w-4 h-4 shrink-0" /> Password updated!
                </div>
              )}
              <button
                onClick={changePassword}
                disabled={changingPassword || !newPassword}
                className="btn-secondary w-full flex items-center justify-center gap-2"
              >
                {changingPassword ? <Loader2 className="w-4 h-4 animate-spin" /> : <Shield className="w-4 h-4" />}
                {changingPassword ? "Updating..." : "Update password"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

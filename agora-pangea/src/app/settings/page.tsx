"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import AppShell from "@/components/AppShell";
import MultiEmailManager from "@/components/MultiEmailManager";
import {
  CollapsibleSection,
  Toggle,
  SettingRow,
  VisibilityRadioGroup,
} from "@/components/SettingsCollapsible";
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
  Vote,
  Info,
  Search,
  FileText,
  Handshake,
  Building2,
  Palette,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatDate } from "@/lib/utils";
import { triggerTranslation } from "@/lib/translate";
import { useLanguage } from "@/components/language-provider";
import PushNotificationToggle from "@/components/PushNotificationToggle";

// ── Extended privacy types for D1 ──
interface ExtendedSettings {
  show_votes: boolean;
  show_posts: boolean;
  searchable_in_messages: boolean;
  show_election_participation: boolean;
  show_followed_topics: boolean;
}

const DEFAULT_EXTENDED: ExtendedSettings = {
  show_votes: true,
  show_posts: true,
  searchable_in_messages: true,
  show_election_participation: true,
  show_followed_topics: true,
};

export default function SettingsPage() {
  const { t } = useLanguage();
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
  const [showOnlineStatus, setShowOnlineStatus] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [dmPolicy, setDmPolicy] = useState<DmPolicy>("everyone");
  const [allowFriendRequests, setAllowFriendRequests] = useState(true);
  const [allowMentions, setAllowMentions] = useState(true);
  const [activityVisibility, setActivityVisibility] = useState<ActivityVisibility>("public");

  // D1: Extended privacy settings (JSONB)
  const [extended, setExtended] = useState<ExtendedSettings>(DEFAULT_EXTENDED);

  // Notifications
  const [notifyMentions, setNotifyMentions] = useState(true);
  const [notifyReplies, setNotifyReplies] = useState(true);
  const [notifyDelegations, setNotifyDelegations] = useState(true);
  const [notifyProposals, setNotifyProposals] = useState(true);
  const [notifyDm, setNotifyDm] = useState(true);
  const [notifyElections, setNotifyElections] = useState(true);
  const [notifyGroupUpdates, setNotifyGroupUpdates] = useState(true);

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

  // D2: Collapsible sections — which section is open
  const [openSection, setOpenSection] = useState<string>("account");

  const supabase = createClient();
  const router = useRouter();

  const handleToggleSection = (id: string) => {
    setOpenSection((prev) => (prev === id ? "" : id));
  };

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
      setNotifyElections(privData.notify_elections ?? true);
      setNotifyGroupUpdates(privData.notify_group_updates ?? true);

      // D1: Load extended JSONB settings
      const ext = privData.extended_settings as ExtendedSettings | null;
      if (ext) {
        setExtended({ ...DEFAULT_EXTENDED, ...ext });
      }
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

  // ── Save handlers ──

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
        notify_elections: notifyElections,
        notify_group_updates: notifyGroupUpdates,
        // D1: Save extended JSONB
        extended_settings: extended,
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
      setPasswordError(t("settings.passwordMinLength") || "Password must be at least 8 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError(t("settings.passwordsNoMatch") || "Passwords do not match.");
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

  function updateExtended(key: keyof ExtendedSettings, value: boolean) {
    setExtended((prev) => ({ ...prev, [key]: value }));
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
              <span className="truncate">{t("settings.title") || "Account Settings"}</span>
            </h1>
            <p className="text-xs sm:text-sm text-fg-muted mt-0.5 truncate">
              {t("settings.subtitle") || "Manage your profile, privacy, and preferences"}
            </p>
          </div>
        </div>

        {/* Global status messages */}
        {error && (
          <div className="mb-4 p-3 bg-danger-tint border border-theme rounded-lg text-fg-danger text-sm flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" /> {error}
          </div>
        )}
        {success && (
          <div className="mb-4 p-3 bg-green-900/30 border border-green-700/50 rounded-lg text-fg-success text-sm flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" /> {t("settings.saved") || "Profile updated successfully!"}
          </div>
        )}
        {privacySuccess && (
          <div className="mb-4 p-3 bg-green-900/30 border border-green-700/50 rounded-lg text-fg-success text-sm flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" /> {t("settings.privacySaved") || "Privacy settings saved!"}
          </div>
        )}

        {/* ═══════════════════════════════════════ */}
        {/* COLLAPSIBLE SECTIONS                    */}
        {/* ═══════════════════════════════════════ */}
        <div className="space-y-3">
          {/* ── 1. Account Information ── */}
          <CollapsibleSection
            id="account"
            title={t("settings.accountInfo") || "Account Information"}
            description={t("settings.accountInfoDesc") || "Your email, role, and citizen code"}
            icon={Shield}
            isOpen={openSection === "account"}
            onToggle={handleToggleSection}
          >
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <Mail className="w-4 h-4 text-fg-muted" />
                <div>
                  <p className="text-xs text-fg-muted">{t("settings.email") || "Email"}</p>
                  <p className="text-sm text-fg">{user?.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Shield className="w-4 h-4 text-fg-muted" />
                <div>
                  <p className="text-xs text-fg-muted">{t("settings.role") || "Role"}</p>
                  <p className="text-sm text-fg capitalize">{profile?.role || "citizen"}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Hash className="w-4 h-4 text-fg-muted" />
                <div>
                  <p className="text-xs text-fg-muted">{t("settings.citizenCode") || "Citizen Code"}</p>
                  <p className="text-sm text-fg-primary font-mono font-semibold tracking-wider">
                    {profile?.user_code || "—"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Calendar className="w-4 h-4 text-fg-muted" />
                <div>
                  <p className="text-xs text-fg-muted">{t("settings.memberSince") || "Member since"}</p>
                  <p className="text-sm text-fg">{profile?.created_at ? formatDate(profile.created_at) : "—"}</p>
                </div>
              </div>

              {/* Email Management */}
              <div className="mt-4 pt-4 border-t border-theme">
                <MultiEmailManager />
              </div>
            </div>
          </CollapsibleSection>

          {/* ── 2. Public Profile ── */}
          <CollapsibleSection
            id="profile"
            title={t("settings.publicProfile") || "Public Profile"}
            description={t("settings.publicProfileDesc") || "Your name, bio, and delegation preferences"}
            icon={User}
            isOpen={openSection === "profile"}
            onToggle={handleToggleSection}
          >
            <div className="space-y-4">
              <div>
                <label className="label">{t("settings.fullName") || "Full name"}</label>
                <input
                  type="text"
                  className="input-field"
                  placeholder={t("settings.fullNamePlaceholder") || "Your real name"}
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  maxLength={100}
                />
              </div>
              <div>
                <label className="label">{t("settings.bio") || "Bio"}</label>
                <textarea
                  className="input-field min-h-[100px] resize-y"
                  placeholder={t("settings.bioPlaceholder") || "Tell fellow citizens something about yourself..."}
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  maxLength={500}
                />
                <p className="text-xs text-fg-muted mt-1">{bio.length}/500</p>
              </div>
              <div>
                <label className="label">{t("settings.displayName") || "Display name (optional)"}</label>
                <input
                  type="text"
                  className="input-field"
                  placeholder={t("settings.displayNamePlaceholder") || "Alternative name shown when real name is hidden"}
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  maxLength={50}
                />
                <p className="text-xs text-fg-muted mt-1">
                  {t("settings.displayNameHint") ||
                    'If you hide your real name, this will be shown instead. Example: "EcoVoter42"'}
                </p>
              </div>

              {/* Delegations */}
              <div className="pt-3 border-t border-theme/50">
                <h4 className="text-sm font-medium text-fg mb-2 flex items-center gap-2">
                  <Vote className="w-4 h-4 text-fg-primary" />
                  {t("settings.delegations") || "Delegations"}
                </h4>
                <div className="space-y-2">
                  <SettingRow
                    icon={Users}
                    label={t("settings.acceptDelegations") || "Accept delegations"}
                    description={t("settings.acceptDelegationsDesc") || "Allow other citizens to delegate their vote to you"}
                  >
                    <Toggle enabled={allowDelegations} onChange={setAllowDelegations} />
                  </SettingRow>
                  <SettingRow
                    icon={Search}
                    label={t("settings.searchableProfile") || "Searchable profile"}
                    description={t("settings.searchableProfileDesc") || "Appear in search results when citizens look for delegates"}
                  >
                    <Toggle enabled={isSearchable} onChange={setIsSearchable} />
                  </SettingRow>
                </div>
              </div>

              <button
                onClick={saveProfile}
                disabled={saving}
                className="btn-primary w-full flex items-center justify-center gap-2 py-2.5 mt-2"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {saving ? t("common.saving") || "Saving..." : t("settings.saveProfile") || "Save profile"}
              </button>
            </div>
          </CollapsibleSection>

          {/* ── 3. Privacy & Visibility ── */}
          <CollapsibleSection
            id="privacy"
            title={t("settings.privacyVisibility") || "Privacy & Visibility"}
            description={t("settings.privacyVisibilityDesc") || "Control what others can see about you"}
            icon={Lock}
            isOpen={openSection === "privacy"}
            onToggle={handleToggleSection}
            badge={
              isPrivate ? (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 font-medium">
                  {t("settings.privateMode") || "Private"}
                </span>
              ) : null
            }
          >
            <div className="space-y-6">
              {/* Profile visibility level */}
              <div>
                <h4 className="text-sm font-medium text-fg mb-2 flex items-center gap-2">
                  <Globe className="w-4 h-4 text-fg-primary" />
                  {t("settings.profileVisibility") || "Profile Visibility"}
                </h4>
                <p className="text-xs text-fg-muted mb-3">
                  {t("settings.profileVisibilityDesc") || "Choose who can see your profile page"}
                </p>
                <VisibilityRadioGroup
                  name="profileVisibility"
                  value={profileVisibility}
                  onChange={(v) => setProfileVisibility(v as ProfileVisibility)}
                  options={[
                    {
                      value: "public",
                      label: t("settings.visPublic") || "Public",
                      desc: t("settings.visPublicDesc") || "Anyone can see your profile, including visitors",
                      icon: Globe,
                    },
                    {
                      value: "registered_only",
                      label: t("settings.visRegistered") || "Registered citizens only",
                      desc: t("settings.visRegisteredDesc") || "Only logged-in citizens can see your profile",
                      icon: Users,
                    },
                    {
                      value: "private",
                      label: t("settings.visPrivate") || "Private",
                      desc: t("settings.visPrivateDesc") || "Your profile is hidden. Only display name or code visible",
                      icon: Lock,
                    },
                  ]}
                />
              </div>

              {/* Field visibility toggles */}
              <div>
                <h4 className="text-sm font-medium text-fg mb-2 flex items-center gap-2">
                  <EyeOff className="w-4 h-4 text-fg-primary" />
                  {t("settings.visibleInfo") || "Visible Information"}
                </h4>
                <div className="space-y-1 divide-y divide-slate-700/30">
                  <SettingRow icon={User} label={t("settings.showRealName") || "Show real name"} description={t("settings.showRealNameDesc") || "Display your full name on your profile"}>
                    <Toggle enabled={showFullName} onChange={setShowFullName} disabled={isPrivate} />
                  </SettingRow>
                  <SettingRow icon={Info} label={t("settings.showBio") || "Show bio"} description={t("settings.showBioDesc") || "Display your biography"}>
                    <Toggle enabled={showBio} onChange={setShowBio} disabled={isPrivate} />
                  </SettingRow>
                  <SettingRow icon={Mail} label={t("settings.showEmail") || "Show email"} description={t("settings.showEmailDesc") || "Display your email address"}>
                    <Toggle enabled={showEmail} onChange={setShowEmail} disabled={isPrivate} />
                  </SettingRow>
                  <SettingRow icon={Calendar} label={t("settings.showJoinDate") || "Show join date"} description={t("settings.showJoinDateDesc") || "Show when you joined"}>
                    <Toggle enabled={showJoinDate} onChange={setShowJoinDate} disabled={isPrivate} />
                  </SettingRow>
                  <SettingRow icon={Hash} label={t("settings.showCitizenCode") || "Show citizen code"} description={t("settings.showCitizenCodeDesc") || "Display your unique identifier"}>
                    <Toggle enabled={showUserCode} onChange={setShowUserCode} />
                  </SettingRow>
                </div>
                {isPrivate && (
                  <div className="mt-3 p-3 bg-warning-tint border border-theme rounded-lg text-amber-300/80 text-xs flex items-start gap-2">
                    <Lock className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                    <span>{t("settings.privateWarning") || "Profile is Private. Most fields are automatically hidden."}</span>
                  </div>
                )}
              </div>

              {/* Activity visibility */}
              <div>
                <h4 className="text-sm font-medium text-fg mb-2 flex items-center gap-2">
                  <Activity className="w-4 h-4 text-fg-primary" />
                  {t("settings.activityVisibility") || "Activity Visibility"}
                </h4>
                <VisibilityRadioGroup
                  name="activityVisibility"
                  value={activityVisibility}
                  onChange={(v) => setActivityVisibility(v as ActivityVisibility)}
                  options={[
                    { value: "public", label: t("settings.visPublic") || "Public", desc: t("settings.actPublicDesc") || "Anyone can see your activity", icon: Globe },
                    { value: "registered_only", label: t("settings.visRegistered") || "Registered only", desc: t("settings.actRegisteredDesc") || "Only logged-in citizens", icon: Users },
                    { value: "private", label: t("settings.visPrivate") || "Private", desc: t("settings.actPrivateDesc") || "Nobody can see your activity", icon: Lock },
                  ]}
                />
                <div className="mt-3 space-y-1 divide-y divide-slate-700/30">
                  <SettingRow icon={Activity} label={t("settings.showProposalsVotes") || "Show proposals & votes"} description={t("settings.showProposalsVotesDesc") || "Display your voting activity"}>
                    <Toggle enabled={showActivity} onChange={setShowActivity} />
                  </SettingRow>
                  <SettingRow icon={Handshake} label={t("settings.showDelegations") || "Show delegations"} description={t("settings.showDelegationsDesc") || "Display your delegation relationships"}>
                    <Toggle enabled={showDelegations} onChange={setShowDelegations} />
                  </SettingRow>
                  <SettingRow icon={Building2} label={t("settings.showGroups") || "Show group memberships"} description={t("settings.showGroupsDesc") || "Display which groups you belong to"}>
                    <Toggle enabled={showPartyMembership} onChange={setShowPartyMembership} />
                  </SettingRow>
                </div>
              </div>

              {/* D1: Extended privacy — new fields */}
              <div>
                <h4 className="text-sm font-medium text-fg mb-2 flex items-center gap-2">
                  <Shield className="w-4 h-4 text-fg-primary" />
                  {t("settings.advancedPrivacy") || "Advanced Privacy"}
                </h4>
                <p className="text-xs text-fg-muted mb-3">
                  {t("settings.advancedPrivacyDesc") || "Fine-tune exactly what information is visible to others"}
                </p>
                <div className="space-y-1 divide-y divide-slate-700/30">
                  <SettingRow
                    icon={Vote}
                    label={t("settings.showVoteHistory") || "Show vote history"}
                    description={t("settings.showVoteHistoryDesc") || "Let others see how you voted on specific proposals"}
                  >
                    <Toggle enabled={extended.show_votes} onChange={(v) => updateExtended("show_votes", v)} />
                  </SettingRow>
                  <SettingRow
                    icon={FileText}
                    label={t("settings.showPosts") || "Show personal posts"}
                    description={t("settings.showPostsDesc") || "Display your posts on your public profile"}
                  >
                    <Toggle enabled={extended.show_posts} onChange={(v) => updateExtended("show_posts", v)} />
                  </SettingRow>
                  <SettingRow
                    icon={Search}
                    label={t("settings.searchableInMessages") || "Searchable in messages"}
                    description={t("settings.searchableInMessagesDesc") || "Let others find you when starting a new conversation"}
                  >
                    <Toggle enabled={extended.searchable_in_messages} onChange={(v) => updateExtended("searchable_in_messages", v)} />
                  </SettingRow>
                  <SettingRow
                    icon={Flag}
                    label={t("settings.showElections") || "Show election participation"}
                    description={t("settings.showElectionsDesc") || "Display elections you participated in or ran for"}
                  >
                    <Toggle enabled={extended.show_election_participation} onChange={(v) => updateExtended("show_election_participation", v)} />
                  </SettingRow>
                  <SettingRow
                    icon={Palette}
                    label={t("settings.showFollowedTopics") || "Show followed topics"}
                    description={t("settings.showFollowedTopicsDesc") || "Display which Agora topics you follow"}
                  >
                    <Toggle enabled={extended.show_followed_topics} onChange={(v) => updateExtended("show_followed_topics", v)} />
                  </SettingRow>
                </div>
              </div>

              <button
                onClick={savePrivacySettings}
                disabled={savingPrivacy}
                className="btn-primary w-full flex items-center justify-center gap-2 py-2.5"
              >
                {savingPrivacy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
                {savingPrivacy ? t("common.saving") || "Saving..." : t("settings.savePrivacy") || "Save privacy settings"}
              </button>
            </div>
          </CollapsibleSection>

          {/* ── 4. Messaging & Social ── */}
          <CollapsibleSection
            id="messaging"
            title={t("settings.messagingSocial") || "Messaging & Social"}
            description={t("settings.messagingSocialDesc") || "Control how others can interact with you"}
            icon={MessageCircle}
            isOpen={openSection === "messaging"}
            onToggle={handleToggleSection}
          >
            <div className="space-y-4">
              {/* DM Policy */}
              <div>
                <p className="text-sm text-fg mb-2">{t("settings.dmPolicyLabel") || "Who can send you direct messages?"}</p>
                <VisibilityRadioGroup
                  name="dmPolicy"
                  value={dmPolicy}
                  onChange={(v) => setDmPolicy(v as DmPolicy)}
                  options={[
                    { value: "everyone", label: t("settings.dmEveryone") || "Everyone", desc: t("settings.dmEveryoneDesc") || "Any citizen can message you", icon: Globe },
                    { value: "followed_only", label: t("settings.dmFollowed") || "People you follow", desc: t("settings.dmFollowedDesc") || "Only citizens you follow", icon: Users },
                    { value: "nobody", label: t("settings.dmNobody") || "Nobody", desc: t("settings.dmNobodyDesc") || "Direct messages are disabled", icon: Lock },
                  ]}
                />
              </div>

              <div className="space-y-1 divide-y divide-slate-700/30">
                <SettingRow icon={UserX} label={t("settings.allowFriendRequests") || "Allow friend requests"} description={t("settings.allowFriendRequestsDesc") || "Let others send you connection requests"}>
                  <Toggle enabled={allowFriendRequests} onChange={setAllowFriendRequests} />
                </SettingRow>
                <SettingRow icon={AtSign} label={t("settings.allowMentions") || "Allow mentions"} description={t("settings.allowMentionsDesc") || "Let others @mention you in discussions"}>
                  <Toggle enabled={allowMentions} onChange={setAllowMentions} />
                </SettingRow>
                <SettingRow icon={Eye} label={t("settings.showOnline") || "Show online status"} description={t("settings.showOnlineDesc") || "Let others see when you are active"}>
                  <Toggle enabled={showOnlineStatus} onChange={setShowOnlineStatus} />
                </SettingRow>
              </div>

              <button
                onClick={savePrivacySettings}
                disabled={savingPrivacy}
                className="btn-primary w-full flex items-center justify-center gap-2 py-2.5 mt-2"
              >
                {savingPrivacy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {savingPrivacy ? t("common.saving") || "Saving..." : t("common.save") || "Save"}
              </button>
            </div>
          </CollapsibleSection>

          {/* ── 5. Notifications ── */}
          <CollapsibleSection
            id="notifications"
            title={t("settings.notifications") || "Notifications"}
            description={t("settings.notificationsDesc") || "Choose which alerts you want to receive"}
            icon={Bell}
            isOpen={openSection === "notifications"}
            onToggle={handleToggleSection}
          >
            <div className="space-y-1 divide-y divide-slate-700/30">
              <SettingRow icon={AtSign} label={t("settings.notifyMentions") || "Mentions"} description={t("settings.notifyMentionsDesc") || "When someone @mentions you"}>
                <Toggle enabled={notifyMentions} onChange={setNotifyMentions} />
              </SettingRow>
              <SettingRow icon={MessageCircle} label={t("settings.notifyReplies") || "Replies"} description={t("settings.notifyRepliesDesc") || "When someone replies to your posts"}>
                <Toggle enabled={notifyReplies} onChange={setNotifyReplies} />
              </SettingRow>
              <SettingRow icon={Handshake} label={t("settings.notifyDelegations") || "Delegations"} description={t("settings.notifyDelegationsDesc") || "When someone delegates their vote to you"}>
                <Toggle enabled={notifyDelegations} onChange={setNotifyDelegations} />
              </SettingRow>
              <SettingRow icon={FileText} label={t("settings.notifyProposals") || "Proposals"} description={t("settings.notifyProposalsDesc") || "Updates on proposals you voted on"}>
                <Toggle enabled={notifyProposals} onChange={setNotifyProposals} />
              </SettingRow>
              <SettingRow icon={MessageCircle} label={t("settings.notifyDm") || "Direct messages"} description={t("settings.notifyDmDesc") || "When you receive a new message"}>
                <Toggle enabled={notifyDm} onChange={setNotifyDm} />
              </SettingRow>
              <SettingRow icon={Vote} label={t("settings.notifyElections") || "Elections"} description={t("settings.notifyElectionsDesc") || "New elections and results in your groups"}>
                <Toggle enabled={notifyElections} onChange={setNotifyElections} />
              </SettingRow>
              <SettingRow icon={Building2} label={t("settings.notifyGroups") || "Group updates"} description={t("settings.notifyGroupsDesc") || "New announcements from your groups"}>
                <Toggle enabled={notifyGroupUpdates} onChange={setNotifyGroupUpdates} />
              </SettingRow>
            </div>

            {/* C2: Push Notification Toggle */}
            <div className="mt-4 pt-4 border-t border-theme">
              <h4 className="text-sm font-medium text-fg mb-2 flex items-center gap-2">
                <Bell className="w-4 h-4 text-fg-primary" />
                {t("settings.pushNotifications") || "Push Notifications"}
              </h4>
              {user && <PushNotificationToggle userId={user.id} t={t} />}
            </div>

            <button
              onClick={savePrivacySettings}
              disabled={savingPrivacy}
              className="btn-primary w-full flex items-center justify-center gap-2 py-2.5 mt-4"
            >
              {savingPrivacy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Bell className="w-4 h-4" />}
              {savingPrivacy ? t("common.saving") || "Saving..." : t("settings.saveNotifications") || "Save notifications"}
            </button>
          </CollapsibleSection>

          {/* ── 6. Group Vote Weights ── */}
          {partyMemberships.length > 0 && (
            <CollapsibleSection
              id="weights"
              title={t("settings.groupWeights") || "Group Vote Weights"}
              description={t("settings.groupWeightsDesc") || "How your vote is split across groups"}
              icon={Flag}
              isOpen={openSection === "weights"}
              onToggle={handleToggleSection}
              badge={
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-pangea-500/20 text-pangea-400 font-medium">
                  {partyMemberships.length}
                </span>
              }
            >
              <p className="text-xs text-fg-muted mb-4">
                {t("settings.groupWeightsHint") ||
                  "If you belong to multiple groups, your vote is split based on these weights. Example: Group A (weight 2) + Group B (weight 1) → Group A gets ~67% of your vote."}
              </p>
              <div className="space-y-3">
                {partyMemberships.map((pm) => {
                  const totalWeight = partyMemberships.reduce((s, p) => s + p.vote_weight, 0);
                  const percentage = totalWeight > 0 ? Math.round((pm.vote_weight / totalWeight) * 100) : 0;
                  return (
                    <div key={pm.party_id} className="flex items-center gap-3 bg-theme-card rounded-lg p-3">
                      <span className="text-xl">{pm.logo_emoji}</span>
                      <div className="flex-1 min-w-0">
                        <Link href={`/groups/${pm.party_id}`} className="text-sm text-fg hover:text-fg-primary transition-colors">
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
                  <CheckCircle2 className="w-3.5 h-3.5" /> {t("settings.weightsUpdated") || "Weights updated!"}
                </div>
              )}
              <button
                onClick={saveGroupWeights}
                disabled={savingWeights}
                className="mt-3 btn-primary w-full flex items-center justify-center gap-2 py-2.5"
              >
                {savingWeights ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {savingWeights ? t("common.saving") || "Saving..." : t("settings.saveWeights") || "Save weights"}
              </button>
            </CollapsibleSection>
          )}

          {/* ── 7. Security ── */}
          <CollapsibleSection
            id="security"
            title={t("settings.security") || "Security"}
            description={t("settings.securityDesc") || "Change your password and security settings"}
            icon={Shield}
            isOpen={openSection === "security"}
            onToggle={handleToggleSection}
          >
            <div className="space-y-4">
              <div>
                <label className="label">{t("settings.newPassword") || "New password"}</label>
                <input
                  type="password"
                  className="input-field"
                  placeholder={t("settings.passwordPlaceholder") || "Minimum 8 characters"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
              </div>
              <div>
                <label className="label">{t("settings.confirmPassword") || "Confirm password"}</label>
                <input
                  type="password"
                  className="input-field"
                  placeholder={t("settings.confirmPasswordPlaceholder") || "Repeat the password"}
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
                  <CheckCircle2 className="w-4 h-4 shrink-0" /> {t("settings.passwordUpdated") || "Password updated!"}
                </div>
              )}
              <button
                onClick={changePassword}
                disabled={changingPassword || !newPassword}
                className="btn-secondary w-full flex items-center justify-center gap-2"
              >
                {changingPassword ? <Loader2 className="w-4 h-4 animate-spin" /> : <Shield className="w-4 h-4" />}
                {changingPassword ? t("common.saving") || "Updating..." : t("settings.updatePassword") || "Update password"}
              </button>
            </div>
          </CollapsibleSection>
        </div>
      </div>
    </AppShell>
  );
}

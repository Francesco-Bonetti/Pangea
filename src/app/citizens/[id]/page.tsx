import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import AppShell from "@/components/AppShell";
import { User, Calendar, FileText, Users, Vote, BookOpen, Shield, Hash, Lock, EyeOff, MessageSquare, Rss } from "lucide-react";
import SendMessageButton from "@/components/SendMessageButton";
import FollowButton from "@/components/FollowButton";
import Link from "next/link";
import { formatDate } from "@/lib/utils";
import TranslatedContent from "@/components/TranslatedContent";
import ProposalStatusBadge from "@/components/ProposalStatusBadge";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function CitizenProfilePage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();

  const isSelf = user?.id === id;

  // Fetch viewer profile (for admin check and navbar)
  let viewerIsAdmin = false;
  let viewerName: string | null = null;
  let viewerRole: string = "citizen";
  if (user) {
    const { data: viewerProfile } = await supabase
      .from("profiles")
      .select("role, full_name")
      .eq("id", user.id)
      .single();
    viewerIsAdmin = viewerProfile?.role === "admin";
    viewerName = viewerProfile?.full_name ?? null;
    viewerRole = viewerProfile?.role ?? "citizen";
  }

  // Fetch target citizen profile
  const { data: citizen, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !citizen) notFound();

  // Fetch privacy settings
  const { data: privacy } = await supabase
    .from("privacy_settings")
    .select("*")
    .eq("user_id", id)
    .single();

  // Determine visibility
  const isPrivate = privacy?.profile_visibility === "private" && !isSelf && !viewerIsAdmin;
  const isRegisteredOnly = privacy?.profile_visibility === "registered_only" && !user && !isSelf && !viewerIsAdmin;
  const canSeeDetails = isSelf || viewerIsAdmin || (!isPrivate && !isRegisteredOnly);

  // Resolve display name
  const showRealName = isSelf || viewerIsAdmin || !privacy || privacy.show_full_name !== false;
  const displayName = isPrivate
    ? (privacy?.display_name || "Private Citizen")
    : showRealName
      ? (citizen.full_name ?? "Citizen")
      : (privacy?.display_name || "Anonymous Citizen");

  const showBio = canSeeDetails && (isSelf || viewerIsAdmin || !privacy || privacy.show_bio !== false);
  const showUserCode = isSelf || viewerIsAdmin || !privacy || privacy.show_user_code !== false;
  const showJoinDate = canSeeDetails && (isSelf || viewerIsAdmin || !privacy || privacy.show_join_date !== false);
  const showActivity = canSeeDetails && (isSelf || viewerIsAdmin || !privacy || privacy.show_activity !== false);
  const showDelegations = canSeeDetails && (isSelf || viewerIsAdmin || !privacy || privacy.show_delegations !== false);

  // Fetch citizen's proposals (only if visible)
  let proposals: { id: string; title: string; status: string; created_at: string }[] | null = null;
  let voteCount: number | null = null;
  let delegationCount: number | null = null;
  let personalPosts: { id: string; uid: string | null; body: string; upvotes_count: number; downvotes_count: number; replies_count: number; created_at: string }[] | null = null;

  if (showActivity) {
    const { data: proposalsData } = await supabase
      .from("proposals")
      .select("id, title, status, created_at")
      .eq("author_id", id)
      .in("status", ["active", "closed", "curation"])
      .order("created_at", { ascending: false })
      .limit(10);
    proposals = proposalsData;

    // Fetch personal posts
    const { data: postsData } = await supabase
      .from("personal_posts")
      .select("id, uid, body, upvotes_count, downvotes_count, replies_count, created_at")
      .eq("author_id", id)
      .order("created_at", { ascending: false })
      .limit(10);
    personalPosts = postsData;

    const { count } = await supabase
      .from("votes")
      .select("*", { count: "exact", head: true })
      .eq("voter_id", id);
    voteCount = count;
  }

  if (showDelegations) {
    const { count } = await supabase
      .from("delegations")
      .select("*", { count: "exact", head: true })
      .eq("delegate_id", id)
      .eq("status", "accepted");
    delegationCount = count;
  }

  const statusConfig: Record<string, string> = {
    curation: "status-curation",
    active: "status-active",
    closed: "status-closed",
  };

  // Avatar initial
  const avatarInitial = displayName === "Private Citizen" || displayName === "Anonymous Citizen"
    ? "?"
    : displayName[0].toUpperCase();

  return (
    <AppShell userEmail={user?.email} userName={viewerName} userRole={viewerRole} isGuest={!user}>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Link href="/dashboard" className="text-sm text-fg-muted hover:text-fg transition-colors mb-6 inline-block overflow-hidden">
          <span className="inline-block truncate">&larr; Back to Dashboard</span>
        </Link>

        {/* Restricted access banner */}
        {isRegisteredOnly && (
          <div className="card p-8 text-center">
            <EyeOff className="w-12 h-12 text-fg-muted mx-auto mb-4" />
            <h2 className="text-xl font-bold text-fg mb-2">Registered Citizens Only</h2>
            <p className="text-fg-muted text-sm mb-4">
              This citizen has restricted their profile to registered users only. Sign in to view their profile.
            </p>
            <Link href="/auth" className="btn-primary inline-block px-6 py-2">
              Sign In
            </Link>
          </div>
        )}

        {/* Private profile */}
        {isPrivate && !isRegisteredOnly && (
          <div className="card p-8 text-center">
            <div className="w-20 h-20 rounded-full bg-theme-card border-2 border-theme flex items-center justify-center text-2xl text-fg-muted font-bold mx-auto mb-4">
              <Lock className="w-8 h-8" />
            </div>
            <h1 className="text-2xl font-bold text-fg mb-1 truncate">{displayName}</h1>
            <div className="flex items-center justify-center gap-2 mb-3 flex-wrap">
              <span className={`text-xs px-2 py-1 rounded-full font-medium shrink-0 ${
                citizen.role === "admin" ? "text-fg-danger bg-danger-tint border border-theme" :
                citizen.role === "moderator" ? "text-amber-300 bg-amber-900/30 border border-theme" :
                "text-fg-muted bg-theme-muted"
              }`}>
                <Shield className="w-3 h-3 inline mr-1" />
                {citizen.role === "admin" ? "Administrator" : citizen.role === "moderator" ? "Moderator" : "Citizen"}
              </span>
            </div>
            {showUserCode && citizen.user_code && (
              <p className="text-xs text-fg-primary font-mono font-semibold tracking-wider mt-1 truncate">{citizen.user_code}</p>
            )}
            <p className="text-fg-muted text-sm mt-4">This citizen has set their profile to private.</p>
          </div>
        )}

        {/* Full profile (public or self/admin view) */}
        {canSeeDetails && (
          <>
            {/* Profile header */}
            <div className="card p-8 mb-6 text-center">
              <div className="w-20 h-20 rounded-full bg-pangea-800 border-2 border-pangea-600 flex items-center justify-center text-2xl text-fg-primary font-bold mx-auto mb-4">
                {avatarInitial}
              </div>
              <h1 className="text-2xl font-bold text-fg mb-1 truncate">{displayName}</h1>

              {/* If viewing own private profile, show indicator */}
              {isSelf && privacy?.profile_visibility === "private" && (
                <p className="text-xs text-amber-400 mb-2 flex items-center justify-center gap-1 flex-wrap">
                  <Lock className="w-3 h-3 shrink-0" />
                  <span className="truncate">Your profile is set to Private — only you see the full version</span>
                </p>
              )}

              <div className="flex items-center justify-center gap-2 mb-3 flex-wrap">
                <span className={`text-xs px-2 py-1 rounded-full font-medium shrink-0 ${
                  citizen.role === "admin" ? "text-fg-danger bg-danger-tint border border-theme" :
                  citizen.role === "moderator" ? "text-amber-300 bg-amber-900/30 border border-theme" :
                  "text-fg-muted bg-theme-muted"
                }`}>
                  <Shield className="w-3 h-3 inline mr-1" />
                  {citizen.role === "admin" ? "Administrator" : citizen.role === "moderator" ? "Moderator" : "Citizen"}
                </span>
              </div>
              {showUserCode && citizen.user_code && (
                <p className="text-xs text-fg-primary font-mono font-semibold tracking-wider mt-1">{citizen.user_code}</p>
              )}
              {showBio && citizen.bio && (
                <p className="text-fg-muted text-sm max-w-md mx-auto mt-2">
                  <TranslatedContent text={citizen.bio} contentType="citizen_bio" contentId={citizen.id} />
                </p>
              )}
              {showJoinDate && (
                <div className="flex items-center justify-center gap-1.5 mt-3 text-xs text-fg-muted flex-wrap">
                  <Calendar className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">Member since {formatDate(citizen.created_at)}</span>
                </div>
              )}

              {/* Follow + Send Message buttons */}
              {user && !isSelf && (
                <div className="mt-4 flex flex-col items-center gap-3">
                  <FollowButton
                    currentUserId={user.id}
                    targetId={id}
                    targetType="citizen"
                    targetName={displayName}
                  />
                  <SendMessageButton
                    currentUserId={user.id}
                    targetUserId={id}
                    dmPolicy={privacy?.dm_policy || "everyone"}
                  />
                </div>
              )}
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="card p-4 text-center">
                <FileText className="w-5 h-5 text-fg-primary mx-auto mb-1" />
                <p className="text-xl font-bold text-fg">{showActivity ? (proposals?.length ?? 0) : "—"}</p>
                <p className="text-xs text-fg-muted">Proposals</p>
              </div>
              <div className="card p-4 text-center">
                <Vote className="w-5 h-5 text-blue-400 mx-auto mb-1" />
                <p className="text-xl font-bold text-fg">{showActivity ? (voteCount ?? 0) : "—"}</p>
                <p className="text-xs text-fg-muted">Votes</p>
              </div>
              <div className="card p-4 text-center">
                <Users className="w-5 h-5 text-amber-400 mx-auto mb-1" />
                <p className="text-xl font-bold text-fg">{showDelegations ? (delegationCount ?? 0) : "—"}</p>
                <p className="text-xs text-fg-muted">Delegations received</p>
              </div>
            </div>

            {/* Proposals */}
            {showActivity && proposals && proposals.length > 0 && (
              <div className="card p-6">
                <h2 className="text-lg font-semibold text-fg mb-4 flex items-center gap-2 overflow-hidden">
                  <BookOpen className="w-5 h-5 text-fg-primary shrink-0" />
                  <span className="truncate">Public Proposals</span>
                </h2>
                <div className="space-y-3">
                  {proposals.map((p) => (
                    <Link
                      key={p.id}
                      href={`/proposals/${p.id}`}
                      className="flex items-center gap-3 p-3 rounded-lg hover:bg-theme-card transition-colors overflow-hidden"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-fg truncate">
                          <TranslatedContent text={p.title} contentType="proposal_title" contentId={p.id} compact />
                        </p>
                        <p className="text-xs text-fg-muted truncate">{formatDate(p.created_at)}</p>
                      </div>
                      <ProposalStatusBadge status={p.status} />
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Personal Posts */}
            {showActivity && personalPosts && personalPosts.length > 0 && (
              <div className="card p-6 mt-6">
                <h2 className="text-lg font-semibold text-fg mb-4 flex items-center gap-2 overflow-hidden">
                  <Rss className="w-5 h-5 text-pink-400 shrink-0" />
                  <span className="truncate">Posts</span>
                </h2>
                <div className="space-y-3">
                  {personalPosts.map((post) => (
                    <div
                      key={post.id}
                      className="p-4 rounded-lg hover:bg-theme-card transition-colors"
                      style={{ backgroundColor: "var(--muted, rgba(0,0,0,0.1))" }}
                    >
                      <p className="text-sm text-fg leading-relaxed">
                        <TranslatedContent text={post.body.length > 200 ? post.body.slice(0, 200) + "..." : post.body} contentType="post_body" contentId={post.id} compact />
                      </p>
                      <div className="flex items-center gap-3 mt-2 text-xs text-fg-muted">
                        <span>{new Date(post.created_at).toLocaleDateString()}</span>
                        <span className="flex items-center gap-1">
                          <Vote className="w-3 h-3" /> {post.upvotes_count - post.downvotes_count}
                        </span>
                        <span className="flex items-center gap-1">
                          <MessageSquare className="w-3 h-3" /> {post.replies_count}
                        </span>
                        {post.uid && (
                          <span className="text-fg-primary font-mono text-[10px]">{post.uid}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Activity hidden message */}
            {!showActivity && !isSelf && !viewerIsAdmin && (
              <div className="card p-6 text-center text-fg-muted">
                <EyeOff className="w-6 h-6 mx-auto mb-2 text-fg-muted" />
                <p className="text-sm">This citizen has chosen to keep their activity private.</p>
              </div>
            )}
          </>
        )}
      </div>
    </AppShell>
  );
}

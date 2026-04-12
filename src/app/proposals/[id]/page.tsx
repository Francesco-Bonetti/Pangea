import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import AppShell from "@/components/core/AppShell";
import VotingBooth from "@/components/governance/VotingBooth";
import VoteIntegrityBadge from "@/components/governance/VoteIntegrityBadge";
import SignalButton from "@/components/social/SignalButton";
import DraftActions from "@/components/governance/DraftActions";
import CommentSection from "@/components/social/CommentSection";
import type { DistributedResult, ProposalOption } from "@/lib/types";
import { ArrowLeft, Calendar, Clock, User, FileText, Hash, Flame, BarChart3, Users, MessageCircle } from "lucide-react";
import Link from "next/link";
import { formatDateTime } from "@/lib/utils";
import TranslatedContent from "@/components/ui/TranslatedContent";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function ProposalDetailPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isGuest = !user;

  // Fetch proposal with category
  const { data: proposal, error } = await supabase
    .from("proposals")
    .select("*, categories(id, name)")
    .eq("id", id)
    .single();

  if (error || !proposal) notFound();

  // Fetch proposal tags
  const { data: proposalTags } = await supabase
    .from("proposal_tags")
    .select("tag_id, tags(name, slug)")
    .eq("proposal_id", id);
  const tags = proposalTags?.map((pt: Record<string, unknown>) => (pt.tags as { name: string; slug: string })) ?? [];

  // Fetch current user profile (for role) — only if authenticated
  let currentProfile: { full_name?: string; role?: string } | null = null;
  if (user) {
    const { data } = await supabase
      .from("profiles")
      .select("full_name, role")
      .eq("id", user.id)
      .single();
    currentProfile = data;
  }

  // Fetch author profile + privacy settings
  const { data: authorProfile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", proposal.author_id)
    .single();
  const { data: authorPrivacy } = await supabase
    .from("privacy_settings")
    .select("show_full_name, display_name, profile_visibility")
    .eq("user_id", proposal.author_id)
    .single();

  // Fetch deliberative options
  const { data: optionsData } = await supabase
    .from("proposal_options")
    .select("*")
    .eq("proposal_id", id)
    .order("created_at");

  const proposalOptions: ProposalOption[] = optionsData ?? [];

  // Distributed results
  let distributedResults: DistributedResult[] = [];
  if (proposal.status === "active" || proposal.status === "closed") {
    const { data: distResults } = await supabase.rpc(
      "get_distributed_proposal_results",
      { p_proposal_id: id }
    );
    distributedResults = distResults ?? [];
  }

  // Check if user has already voted (only if authenticated)
  let hasVoted = false;
  if (user) {
    const { data } = await supabase.rpc("has_user_voted", {
      p_proposal_id: id,
    });
    hasVoted = data ?? false;
  }

  // Signals (for proposals in community review)
  let signalCount = 0;
  let hasSignaled = false;
  let curationThreshold = 2;
  let activeUsersCount = 5;
  if (proposal.status === "curation") {
    const { count } = await supabase
      .from("proposal_signals")
      .select("*", { count: "exact", head: true })
      .eq("proposal_id", id);
    signalCount = count ?? 0;

    if (user) {
      const { data: userSignal } = await supabase
        .from("proposal_signals")
        .select("id")
        .eq("proposal_id", id)
        .eq("supporter_id", user.id)
        .maybeSingle();
      hasSignaled = !!userSignal;
    }

    // Dynamic threshold
    const { data: threshold } = await supabase.rpc("get_curation_threshold");
    curationThreshold = threshold ?? 2;
    const { data: activeCount } = await supabase.rpc("get_active_users_count");
    activeUsersCount = activeCount ?? 5;
  }

  // Check active delegations for the proposal's category
  let hasActiveDelegation = false;
  if (user && proposal.category_id) {
    const { data: delegation } = await supabase
      .from("delegations")
      .select("id")
      .eq("delegator_id", user!.id)
      .or(`category_id.eq.${proposal.category_id},category_id.is.null`)
      .limit(1)
      .maybeSingle();
    hasActiveDelegation = !!delegation;
  }

  const isAuthor = user ? proposal.author_id === user.id : false;
  const categoryName = (proposal as Record<string, unknown>).categories
    ? ((proposal as Record<string, unknown>).categories as { name: string })?.name
    : null;

  return (
    <AppShell section="core" sectionName="proposals" userEmail={user?.email} userName={currentProfile?.full_name} userRole={currentProfile?.role} isGuest={isGuest}>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumb */}
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 text-sm text-fg-muted hover:text-fg mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </Link>

        {/* Draft Actions — only for author's drafts */}
        {proposal.status === "draft" && user && (
          <DraftActions
            proposalId={proposal.id}
            authorId={proposal.author_id}
            userId={user.id}
            hasOptions={proposalOptions.length >= 2}
          />
        )}

        {/* Proposal Header */}
        <div className="card p-6 sm:p-8 mb-6 overflow-hidden">
          {/* Status badge */}
          <div className="flex items-center gap-3 mb-4 flex-wrap">
            <span
              className={
                proposal.status === "active"
                  ? "status-active"
                  : proposal.status === "curation"
                  ? "status-curation"
                  : proposal.status === "closed"
                  ? "status-closed"
                  : proposal.status === "repealed"
                  ? "status-repealed"
                  : "status-draft"
              }
            >
              {proposal.status === "active"
                ? "Active Vote"
                : proposal.status === "curation"
                ? "Community Review"
                : proposal.status === "closed"
                ? "Concluded"
                : proposal.status === "repealed"
                ? "Repealed"
                : "Draft"}
            </span>
            {proposal.proposal_type === "amendment" && (
              <span className="text-xs text-purple-400 font-medium bg-purple-tint px-2 py-1 rounded-full border border-purple-800/30">
                Amendment
              </span>
            )}
            {proposal.proposal_type === "repeal" && (
              <span className="text-xs text-fg-danger font-medium bg-danger-tint px-2 py-1 rounded-full border border-red-800/30">
                Repeal
              </span>
            )}
            {isAuthor && (
              <span className="text-xs text-amber-400 font-medium bg-warning-tint px-2 py-1 rounded-full border border-amber-800/30">
                Your proposal
              </span>
            )}
            {tags.map((tag: { name: string; slug: string }, i: number) => (
              <span key={i} className="text-xs text-fg-primary font-medium bg-pangea-900/20 px-2 py-1 rounded-full flex items-center gap-1 border border-pangea-800/30">
                <Hash className="w-3 h-3" />
                {tag.name}
              </span>
            ))}
            {/* DE-21: Incubator badge */}
            {proposal.incubator_passed && (
              <span className="text-xs text-fg-success font-medium bg-success-tint px-2 py-1 rounded-full flex items-center gap-1 border border-green-800/30">
                <Flame className="w-3 h-3" />
                Free Pass
              </span>
            )}
          </div>

          <h1 className="text-2xl sm:text-3xl font-bold text-fg leading-snug mb-6">
            <TranslatedContent
              text={proposal.title}
              contentType="proposal_title"
              contentId={proposal.id}
            />
          </h1>

          {/* Metadata */}
          <div className="flex flex-wrap gap-4 text-sm text-fg-muted">
            <Link href={`/citizens/${proposal.author_id}`} className="flex items-center gap-1.5 hover:text-fg-primary transition-colors overflow-hidden min-w-0">
              <User className="w-4 h-4 shrink-0" />
              <span className="truncate">
                {authorPrivacy && authorPrivacy.profile_visibility === "private"
                  ? (authorPrivacy.display_name || "Private Citizen")
                  : authorPrivacy && authorPrivacy.show_full_name === false
                    ? (authorPrivacy.display_name || "Anonymous Citizen")
                    : (authorProfile?.full_name ?? "Citizen")}
              </span>
            </Link>
            <div className="flex items-center gap-1.5 overflow-hidden min-w-0">
              <Calendar className="w-4 h-4 shrink-0" />
              <span className="truncate">{formatDateTime(proposal.created_at)}</span>
            </div>
            {proposal.expires_at && (
              <div className="flex items-center gap-1.5 overflow-hidden min-w-0">
                <Clock className="w-4 h-4 shrink-0" />
                <span className="truncate">
                  Expires: {formatDateTime(proposal.expires_at)}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Proposal text */}
          <div className="lg:col-span-2 space-y-6">
            {/* Context */}
            <div className="card p-6 overflow-hidden">
              <h2 className="text-lg font-semibold text-fg mb-4 flex items-center gap-2 overflow-hidden">
                <FileText className="w-5 h-5 text-fg-primary shrink-0" />
                <span className="truncate">Context and Motivation</span>
              </h2>
              <div className="prose prose-invert prose-sm max-w-none">
                <TranslatedContent
                  text={proposal.content}
                  contentType="proposal_content"
                  contentId={proposal.id}
                  as="p"
                  className="text-fg leading-relaxed whitespace-pre-wrap"
                />
              </div>
            </div>

            {/* Legal provision */}
            {proposal.dispositivo && (
              <div className="card p-6">
                <h2 className="text-lg font-semibold text-fg mb-4">
                  Legal Provision
                </h2>
                <div className="bg-theme-base rounded-lg p-4 border border-theme">
                  <TranslatedContent
                    text={proposal.dispositivo}
                    contentType="proposal_dispositivo"
                    contentId={proposal.id}
                    as="p"
                    className="text-fg text-sm font-mono leading-relaxed whitespace-pre-wrap"
                  />
                </div>
              </div>
            )}

            {/* Deliberative options */}
            {proposalOptions.length > 0 && (
              <div className="card p-6 overflow-hidden">
                <h2 className="text-lg font-semibold text-fg mb-4 flex items-center gap-2 overflow-hidden">
                  <Flame className="w-5 h-5 text-amber-400 shrink-0" />
                  <span className="truncate">Deliberative Options</span>
                </h2>
                <div className="space-y-3">
                  {proposalOptions.map((opt, i) => (
                    <div
                      key={opt.id}
                      className="bg-theme-base rounded-lg p-4 border border-theme"
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs text-fg-muted bg-theme-card px-2 py-0.5 rounded font-medium">
                          {i + 1}
                        </span>
                        <h3 className="text-sm font-semibold text-fg">
                          {opt.title}
                        </h3>
                      </div>
                      {opt.description && (
                        <p className="text-xs text-fg-muted mt-1 leading-relaxed">
                          {opt.description}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar: Voting Booth or Signals */}
          <div className="lg:col-span-1">
            {proposal.status === "curation" ? (
              /* Community Review — SignalButton */
              <div className="sticky top-24">
                <div className="card p-5 mb-4 overflow-hidden">
                  <h2 className="text-base font-semibold text-fg mb-1 flex items-center gap-2 overflow-hidden">
                    <Flame className="w-4 h-4 text-amber-400 shrink-0" />
                    <span className="truncate">Community Review</span>
                  </h2>
                  <p className="text-xs text-fg-muted">
                    Support this proposal to move it to the voting phase
                  </p>
                </div>
                <div className="card p-5">
                  {isGuest ? (
                    <div className="text-center py-4">
                      <Flame className="w-10 h-10 text-amber-400 mx-auto mb-3" />
                      <p className="text-fg font-medium mb-1">Signals: {signalCount} / {curationThreshold}</p>
                      <p className="text-xs text-fg-muted mb-4">
                        <Link href="/auth" className="text-fg-primary hover:underline">Sign up</Link> to support this proposal.
                      </p>
                    </div>
                  ) : (
                    <SignalButton
                      proposalId={proposal.id}
                      userId={user!.id}
                      initialSignalCount={signalCount}
                      initialHasSignaled={hasSignaled}
                      threshold={curationThreshold}
                      activeUsersCount={activeUsersCount}
                    />
                  )}
                </div>
              </div>
            ) : (
              /* Voting Booth — with sliders */
              <>
                {/* DE-16: Vote integrity badge for closed proposals */}
                {proposal.status === "closed" && (
                  <VoteIntegrityBadge proposalId={proposal.id} />
                )}
                <VotingBooth
                  proposal={proposal}
                  options={proposalOptions}
                  initialResults={distributedResults}
                  initialHasVoted={hasVoted}
                  userId={user?.id ?? "guest"}
                  hasActiveDelegation={hasActiveDelegation}
                  categoryName={categoryName}
                  isGuest={isGuest}
                />
              </>
            )}
          </div>
        </div>

        {/* Discussion section */}
        <div className="mt-8">
          <div className="card p-6 overflow-hidden">
            <h2 className="text-lg font-semibold text-fg mb-4 flex items-center gap-2 overflow-hidden">
              <MessageCircle className="w-5 h-5 text-fg-primary shrink-0" />
              <span className="truncate">Discussion</span>
            </h2>
            <CommentSection
              targetType="proposal"
              targetId={proposal.id}
              userId={user?.id}
            />
          </div>
        </div>
      </div>
    </AppShell>
  );
}

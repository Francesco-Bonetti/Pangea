// ============================================
// PANGEA EDGE DTOs — Pure boundary types
// Edge = mutable layer (discussions, DM, social, activity).
// Edge types may REFERENCE Core IDs but never import Core internals.
// ============================================

// --- Privacy ---

export type ProfileVisibility = "public" | "registered_only" | "private";
export type DmPolicy = "everyone" | "followed_only" | "nobody";
export type ActivityVisibility = "public" | "registered_only" | "private";

// --- Discussion Forum (Agorà) ---

export interface DiscussionChannelDTO {
  id: string;
  uid: string | null;
  name: string;
  slug: string;
  description: string | null;
  emoji: string;
  color: string;
  sort_order: number;
  is_active: boolean;
  parent_id: string | null;
  depth: number;
  child_count: number;
  discussion_count: number;
  created_at: string;
}

export interface DiscussionDTO {
  id: string;
  uid: string | null;
  author_id: string;
  channel_id: string;
  group_id: string | null;
  title: string;
  body: string;
  is_pinned: boolean;
  is_locked: boolean;
  upvotes_count: number;
  downvotes_count: number;
  replies_count: number;
  views_count: number;
  created_at: string;
  updated_at: string;
}

export interface DiscussionReplyDTO {
  id: string;
  uid: string | null;
  discussion_id: string;
  author_id: string;
  body: string;
  parent_reply_id: string | null;
  upvotes_count: number;
  downvotes_count: number;
  created_at: string;
  updated_at: string;
}

export interface DiscussionVoteDTO {
  id: string;
  user_id: string;
  discussion_id: string | null;
  reply_id: string | null;
  vote_type: "up" | "down";
  created_at: string;
}

export type ReportReason = "spam" | "offensive" | "off_topic" | "misinformation" | "other";
export type ReportStatus = "pending" | "reviewed" | "dismissed" | "action_taken";

export interface DiscussionReportDTO {
  id: string;
  reporter_id: string;
  discussion_id: string | null;
  reply_id: string | null;
  reason: ReportReason;
  description: string | null;
  status: ReportStatus;
  created_at: string;
}

// --- Personal Posts ---

export interface PersonalPostDTO {
  id: string;
  uid: string | null;
  author_id: string;
  body: string;
  upvotes_count: number;
  downvotes_count: number;
  replies_count: number;
  is_pinned: boolean;
  created_at: string;
  updated_at: string;
}

export interface PostVoteDTO {
  id: string;
  user_id: string;
  post_id: string;
  vote_type: "up" | "down";
  created_at: string;
}

export interface PostReplyDTO {
  id: string;
  uid: string | null;
  post_id: string;
  author_id: string;
  body: string;
  parent_reply_id: string | null;
  upvotes_count: number;
  downvotes_count: number;
  created_at: string;
  updated_at: string;
}

// --- Group Forum Posts ---

export interface GroupForumPostDTO {
  id: string;
  uid: string | null;
  group_id: string;
  author_id: string;
  title: string | null;
  body: string;
  is_admin_only: boolean;
  parent_id: string | null;
  upvotes_count: number;
  downvotes_count: number;
  replies_count: number;
  views_count: number;
  is_pinned: boolean;
  is_locked: boolean;
  created_at: string;
  updated_at: string;
}

export interface GroupForumVoteDTO {
  id: string;
  user_id: string;
  post_id: string;
  vote_type: "up" | "down";
  created_at: string;
}

// --- Direct Messaging (E2E Encrypted) ---

export type DmMessageType = "text" | "system" | "key_exchange";

export interface UserKeysDTO {
  user_id: string;
  public_key: string;
  // Note: encrypted_private_key intentionally omitted from DTO
  // It should never cross the Core→Edge boundary
  created_at: string;
  updated_at: string;
}

export interface DmConversationDTO {
  id: string;
  created_at: string;
  updated_at: string;
  last_message_at: string;
}

export interface DmParticipantDTO {
  id: string;
  conversation_id: string;
  user_id: string;
  joined_at: string;
  last_read_at: string;
  is_muted: boolean;
}

export interface DmMessageDTO {
  id: string;
  conversation_id: string;
  sender_id: string;
  encrypted_content: string;
  nonce: string;
  message_type: DmMessageType;
  is_edited: boolean;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}

// --- Comments ---

export interface CommentDTO {
  id: string;
  uid: string | null;
  author_id: string;
  proposal_id: string | null;
  law_id: string | null;
  parent_id: string | null;
  body: string;
  likes_count: number;
  dislikes_count: number;
  replies_count: number;
  is_edited: boolean;
  created_at: string;
  updated_at: string;
}

export interface CommentReactionDTO {
  id: string;
  comment_id: string;
  user_id: string;
  reaction_type: "like" | "dislike";
  created_at: string;
}

// --- Follow & Feed ---

export type FollowTargetType = "citizen" | "group" | "party" | "jurisdiction";

export interface FollowDTO {
  id: string;
  follower_id: string;
  target_type: FollowTargetType;
  target_id: string;
  created_at: string;
}

export type FeedEventType =
  | "proposal_created"
  | "vote_cast"
  | "law_approved"
  | "discussion_created"
  | "party_vote"
  | "member_joined"
  | "election_created"
  | "candidate_registered";

export interface FeedEventDTO {
  id: string;
  actor_id: string | null;
  actor_group_id: string | null;
  event_type: FeedEventType;
  title: string;
  description: string | null;
  link: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

// --- Tags ---

export interface TagDTO {
  id: string;
  uid: string | null;
  name: string;
  slug: string;
  usage_count: number;
  created_at: string;
}

// --- Privacy Settings ---

export interface PrivacySettingsDTO {
  user_id: string;
  profile_visibility: ProfileVisibility;
  show_full_name: boolean;
  show_bio: boolean;
  show_email: boolean;
  show_join_date: boolean;
  show_user_code: boolean;
  show_activity: boolean;
  show_delegations: boolean;
  show_group_membership: boolean;
  show_online_status: boolean;
  display_name: string | null;
  dm_policy: DmPolicy;
  allow_friend_requests: boolean;
  allow_mentions: boolean;
  activity_visibility: ActivityVisibility;
  notify_mentions: boolean;
  notify_replies: boolean;
  notify_delegations: boolean;
  notify_proposals: boolean;
  notify_dm: boolean;
}

/** Privacy-safe display profile (returned by get_display_profile RPC) */
export interface DisplayProfileDTO {
  id: string;
  full_name: string | null;
  display_name: string | null;
  bio: string | null;
  role: string;
  user_code: string | null;
  created_at: string | null;
  show_activity: boolean;
  show_delegations: boolean;
  show_group_membership: boolean;
  dm_policy: DmPolicy;
  allow_mentions: boolean;
  is_private: boolean;
  is_restricted: boolean;
}

// --- Notifications ---

export interface NotificationDTO {
  id: string;
  user_id: string;
  type: string;
  title: string;
  body: string | null;
  link: string | null;
  is_read: boolean;
  created_at: string;
}

// --- Bug Reports ---

export interface BugReportDTO {
  id: string;
  user_id: string | null;
  title: string;
  description: string;
  status: string;
  created_at: string;
}

/**
 * Shared utility for relative time formatting.
 * Used across multiple components (PostCard, CommentSection, DiscussionThreadClient, etc.)
 *
 * Returns compact relative strings: "now", "3m ago", "2h ago", "5d ago", "2mo ago"
 * Falls back to locale date string for dates older than ~12 months.
 */
export function formatTimeAgo(dateString: string): string {
  const now = new Date();
  const date = new Date(dateString);
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) return "now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 2592000) return `${Math.floor(seconds / 86400)}d ago`;
  if (seconds < 31536000) return `${Math.floor(seconds / 2592000)}mo ago`;

  return date.toLocaleDateString();
}

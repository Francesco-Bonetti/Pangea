"use client";

import { createClient } from "@/lib/supabase/client";
import { useState, useEffect } from "react";
import { UserPlus, UserMinus, Loader2 } from "lucide-react";
import { useLanguage } from "@/components/core/language-provider";
import type { FollowTargetType } from "@/lib/types";

interface FollowButtonProps {
  currentUserId: string | null;
  targetId: string;
  targetType: FollowTargetType;
  targetName?: string;
  size?: "sm" | "md";
  showCount?: boolean;
}

export default function FollowButton({
  currentUserId,
  targetId,
  targetType,
  targetName,
  size = "md",
  showCount = true,
}: FollowButtonProps) {
  const { t } = useLanguage();
  const supabase = createClient();
  const [isFollowing, setIsFollowing] = useState(false);
  const [followerCount, setFollowerCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(false);

  useEffect(() => {
    loadState();
  }, [currentUserId, targetId]);

  async function loadState() {
    setLoading(true);

    // Get follower count
    const { count } = await supabase
      .from("follows")
      .select("*", { count: "exact", head: true })
      .eq("target_type", targetType)
      .eq("target_id", targetId);

    setFollowerCount(count ?? 0);

    // Check if current user follows
    if (currentUserId) {
      const { data } = await supabase
        .from("follows")
        .select("id")
        .eq("follower_id", currentUserId)
        .eq("target_type", targetType)
        .eq("target_id", targetId)
        .maybeSingle();

      setIsFollowing(!!data);
    }

    setLoading(false);
  }

  async function toggleFollow() {
    if (!currentUserId || toggling) return;
    setToggling(true);

    if (isFollowing) {
      await supabase
        .from("follows")
        .delete()
        .eq("follower_id", currentUserId)
        .eq("target_type", targetType)
        .eq("target_id", targetId);

      setIsFollowing(false);
      setFollowerCount((c) => Math.max(0, c - 1));
    } else {
      await supabase.from("follows").insert({
        follower_id: currentUserId,
        target_type: targetType,
        target_id: targetId,
      });

      setIsFollowing(true);
      setFollowerCount((c) => c + 1);
    }

    setToggling(false);
  }

  // Don't show for own profile
  if (currentUserId === targetId && targetType === "citizen") return null;
  // Don't show for guests
  if (!currentUserId) return null;

  const sizeClasses = size === "sm"
    ? "px-3 py-1.5 text-xs gap-1.5"
    : "px-4 py-2 text-sm gap-2";

  if (loading) {
    return (
      <button disabled className={`inline-flex items-center rounded-lg font-medium bg-theme-muted text-fg-muted ${sizeClasses}`}>
        <Loader2 className={`animate-spin ${size === "sm" ? "w-3 h-3" : "w-4 h-4"}`} />
        {t("follow.loading")}
      </button>
    );
  }

  return (
    <div className="inline-flex items-center gap-2">
      <button
        onClick={toggleFollow}
        disabled={toggling}
        className={`inline-flex items-center rounded-lg font-medium transition-all duration-200 ${sizeClasses} ${
          isFollowing
            ? "bg-pangea-900/40 text-fg-primary border border-pangea-600/50 hover:bg-danger-tint hover:text-fg-danger hover:border-red-600/50"
            : "bg-pangea-600 text-fg hover:bg-theme-primary"
        }`}
        title={isFollowing ? `Unfollow ${targetName || ""}` : `Follow ${targetName || ""}`}
      >
        {toggling ? (
          <Loader2 className={`animate-spin ${size === "sm" ? "w-3 h-3" : "w-4 h-4"}`} />
        ) : isFollowing ? (
          <UserMinus className={size === "sm" ? "w-3 h-3" : "w-4 h-4"} />
        ) : (
          <UserPlus className={size === "sm" ? "w-3 h-3" : "w-4 h-4"} />
        )}
        {isFollowing ? t("follow.following") : t("follow.follow")}
      </button>
      {showCount && (
        <span className="text-xs text-fg-muted">
          {followerCount} {followerCount === 1 ? t("follow.follower") : t("follow.followers_plural")}
        </span>
      )}
    </div>
  );
}

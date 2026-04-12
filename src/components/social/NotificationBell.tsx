"use client";

import { useState, useEffect, useRef } from "react";
import { Bell, MessageCircle, AtSign, ArrowBigUp, Pin, Lock, Shield } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/components/core/language-provider";

interface NotificationRow {
  id: string;
  user_id: string;
  type: "reply" | "mention" | "upvote" | "pin" | "lock" | "moderation";
  title: string;
  body: string | null;
  link: string | null;
  is_read: boolean;
  created_at: string;
}

export default function NotificationBell() {
  const supabase = createClient();
  const router = useRouter();
  const { t } = useLanguage();
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [userId, setUserId] = useState<string | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationRow[]>([]);
  const [loading, setLoading] = useState(false);

  // Get user ID on mount
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }: { data: { user: { id: string } | null } }) => {
      if (user) {
        setUserId(user.id);
      }
    });
  }, []);

  // Fetch unread count when userId is available
  useEffect(() => {
    if (userId) {
      fetchUnreadCount();
    }
  }, [userId]);

  // Set up real-time subscription
  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel(`notifications:${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        () => {
          setUnreadCount((prev) => prev + 1);
          if (isOpen) fetchNotifications();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, isOpen]);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen]);

  async function fetchUnreadCount() {
    try {
      const { data, error } = await supabase.rpc("get_unread_notification_count");
      if (error) throw error;
      setUnreadCount(data || 0);
    } catch (err) {
      console.error("Failed to fetch unread count:", err);
    }
  }

  async function fetchNotifications() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(20);

      if (error) throw error;
      setNotifications((data as NotificationRow[]) || []);
    } catch (err) {
      console.error("Failed to fetch notifications:", err);
    } finally {
      setLoading(false);
    }
  }

  async function handleToggleDropdown() {
    setIsOpen(!isOpen);
    if (!isOpen) {
      await fetchNotifications();
    }
  }

  async function handleMarkAllAsRead() {
    try {
      await supabase.rpc("mark_all_notifications_read");
      setUnreadCount(0);
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    } catch (err) {
      console.error("Failed to mark all as read:", err);
    }
  }

  async function handleNotificationClick(notification: NotificationRow) {
    try {
      if (!notification.is_read) {
        await supabase
          .from("notifications")
          .update({ is_read: true })
          .eq("id", notification.id);

        setUnreadCount((prev) => Math.max(0, prev - 1));
        setNotifications((prev) =>
          prev.map((n) => (n.id === notification.id ? { ...n, is_read: true } : n))
        );
      }

      if (notification.link) {
        setIsOpen(false);
        router.push(notification.link);
      }
    } catch (err) {
      console.error("Failed to handle notification click:", err);
    }
  }

  function getNotificationIcon(type: NotificationRow["type"]) {
    const iconClass = "w-4 h-4 shrink-0 text-fg-muted";
    switch (type) {
      case "reply":
        return <MessageCircle className={iconClass} />;
      case "mention":
        return <AtSign className={iconClass} />;
      case "upvote":
        return <ArrowBigUp className={iconClass} />;
      case "pin":
        return <Pin className={iconClass} />;
      case "lock":
        return <Lock className={iconClass} />;
      case "moderation":
        return <Shield className={iconClass} />;
      default:
        return <Bell className={iconClass} />;
    }
  }

  function formatTimeAgo(dateString: string) {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (seconds < 60) return t("time.justNow") || "Just now";
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d`;
    return date.toLocaleDateString();
  }

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        onClick={handleToggleDropdown}
        className="relative p-2.5 rounded-lg text-fg-muted hover:text-fg hover:bg-theme-card transition-colors duration-150"
        title={t("nav.notifications") || "Notifications"}
      >
        <Bell className="w-5 h-5" />

        {/* Badge */}
        {unreadCount > 0 && (
          <span
            className="absolute top-1 right-1 w-5 h-5 bg-red-600 text-fg text-[10px] font-bold rounded-full flex items-center justify-center"
            style={{ transform: "translate(2px, -2px)" }}
          >
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div
          className="absolute top-12 left-1/2 -translate-x-1/2 w-[min(20rem,calc(100vw-2rem))] rounded-lg shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150 z-50"
          style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}
        >
          {/* Header with Mark All as Read */}
          <div
            className="flex items-center justify-between px-4 py-3"
            style={{ borderBottom: "1px solid var(--border)" }}
          >
            <p className="text-sm font-semibold text-fg">{t("notifications.title") || "Notifications"}</p>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                className="text-xs font-medium text-blue-600 hover:text-blue-700 transition-colors duration-150"
              >
                {t("notifications.markAllRead") || "Mark all read"}
              </button>
            )}
          </div>

          {/* Notifications List */}
          <div className="max-h-96 overflow-y-auto">
            {loading && notifications.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <p className="text-sm text-fg-muted">{t("common.loading") || "Loading..."}</p>
              </div>
            ) : notifications.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <p className="text-sm text-fg-muted">{t("notifications.empty") || "No notifications"}</p>
              </div>
            ) : (
              <div className="divide-y" style={{ borderColor: "var(--border)" }}>
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    onClick={() => handleNotificationClick(notification)}
                    className="px-4 py-3 hover:bg-theme-card cursor-pointer transition-colors duration-150"
                    style={{
                      backgroundColor: notification.is_read ? "transparent" : "color-mix(in srgb, var(--primary) 5%, transparent)",
                    }}
                  >
                    <div className="flex gap-3">
                      {/* Icon */}
                      <div className="mt-1 shrink-0">
                        {getNotificationIcon(notification.type)}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm font-medium text-fg line-clamp-1">
                            {notification.title}
                          </p>
                          {!notification.is_read && (
                            <span className="w-2 h-2 bg-blue-600 rounded-full shrink-0 mt-1" />
                          )}
                        </div>
                        <p className="text-xs text-fg-muted line-clamp-2 mt-0.5">
                          {notification.body}
                        </p>
                        <p className="text-xs text-fg-muted mt-1.5">
                          {formatTimeAgo(notification.created_at)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

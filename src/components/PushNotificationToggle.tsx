"use client";

import { useState, useEffect, useCallback } from "react";
import {
  isPushSupported,
  getPermissionStatus,
  registerServiceWorker,
  getExistingSubscription,
  subscribeToPush,
  unsubscribeFromPush,
} from "@/lib/push-notifications";
import { Toggle } from "@/components/SettingsCollapsible";
import { Bell, BellOff, AlertTriangle, Info, Smartphone } from "lucide-react";
import { logger } from "@/lib/logger";

interface PushNotificationToggleProps {
  userId: string;
  t: (key: string) => string;
}

export default function PushNotificationToggle({ userId, t }: PushNotificationToggleProps) {
  const [supported, setSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">("unsupported");
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(true);

  const checkStatus = useCallback(async () => {
    const isSupported = isPushSupported();
    setSupported(isSupported);

    if (!isSupported) {
      setLoading(false);
      return;
    }

    setPermission(getPermissionStatus());

    // Register service worker
    await registerServiceWorker();

    // Check existing subscription
    const existing = await getExistingSubscription();
    setSubscribed(!!existing);
    setLoading(false);
  }, []);

  useEffect(() => {
    checkStatus();
  }, [checkStatus]);

  const handleToggle = async (enabled: boolean) => {
    setLoading(true);
    try {
      if (enabled) {
        const sub = await subscribeToPush(userId);
        setSubscribed(!!sub);
        setPermission(getPermissionStatus());
      } else {
        const success = await unsubscribeFromPush(userId);
        if (success) setSubscribed(false);
      }
    } catch (error) {
      logger.error("[PushToggle] Error:", error);
    }
    setLoading(false);
  };

  // Not supported
  if (!supported) {
    return (
      <div className="flex items-center gap-3 py-2.5 text-fg-muted">
        <BellOff className="w-4 h-4 shrink-0" />
        <div className="min-w-0">
          <p className="text-sm">{t("settings.pushNotSupported") || "Push notifications not available"}</p>
          <p className="text-xs">
            {t("settings.pushNotSupportedDesc") || "Your browser does not support push notifications"}
          </p>
        </div>
      </div>
    );
  }

  // Permission denied
  if (permission === "denied") {
    return (
      <div className="flex items-center gap-3 py-2.5">
        <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
        <div className="min-w-0">
          <p className="text-sm text-fg">{t("settings.pushBlocked") || "Push notifications blocked"}</p>
          <p className="text-xs text-fg-muted">
            {t("settings.pushBlockedDesc") ||
              "You have blocked notifications for this site. To enable them, update your browser settings."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Main toggle */}
      <div className="flex items-center justify-between gap-4 py-2.5">
        <div className="flex items-center gap-3 min-w-0">
          <Smartphone className="w-4 h-4 text-fg-muted shrink-0" />
          <div className="min-w-0">
            <p className="text-sm text-fg">
              {t("settings.pushEnable") || "Enable push notifications"}
            </p>
            <p className="text-xs text-fg-muted">
              {t("settings.pushEnableDesc") || "Receive alerts even when Pangea is not open in your browser"}
            </p>
          </div>
        </div>
        <Toggle enabled={subscribed} onChange={handleToggle} disabled={loading} />
      </div>

      {/* Status info */}
      {subscribed && (
        <div className="flex items-start gap-2 p-3 bg-green-900/20 border border-green-700/30 rounded-lg">
          <Bell className="w-3.5 h-3.5 text-green-400 mt-0.5 shrink-0" />
          <p className="text-xs text-green-300/80">
            {t("settings.pushActive") ||
              "Push notifications are active on this device. You will receive alerts based on your notification preferences above."}
          </p>
        </div>
      )}

      {!subscribed && permission === "default" && (
        <div className="flex items-start gap-2 p-3 bg-theme-card/50 border border-theme rounded-lg">
          <Info className="w-3.5 h-3.5 text-fg-muted mt-0.5 shrink-0" />
          <p className="text-xs text-fg-muted">
            {t("settings.pushInfo") ||
              "When you enable push notifications, your browser will ask for permission. You can revoke this at any time."}
          </p>
        </div>
      )}
    </div>
  );
}

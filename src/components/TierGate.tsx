"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { ShieldCheck, ShieldAlert, X, ArrowRight } from "lucide-react";
import { useLanguage } from "@/components/language-provider";
import type { IdentityTier } from "@/lib/types";
import { IDENTITY_TIER_LABELS } from "@/lib/types";
import Link from "next/link";

interface TierGateProps {
  /** Is the modal open? */
  open: boolean;
  /** Close handler */
  onClose: () => void;
  /** User's current tier */
  currentTier: IdentityTier;
  /** Minimum tier required */
  requiredTier: IdentityTier;
  /** i18n key for the action (e.g., "identity.actionVote") */
  actionKey: string;
}

/**
 * TierGate — Progressive Disclosure popup.
 * Shown when a user tries an action they don't have the tier for.
 * Points them to the identity verification flow.
 */
export default function TierGate({
  open,
  onClose,
  currentTier,
  requiredTier,
  actionKey,
}: TierGateProps) {
  const { t } = useLanguage();
  const overlayRef = useRef<HTMLDivElement>(null);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  // Prevent body scroll
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  const handleOverlayClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === overlayRef.current) onClose();
    },
    [onClose]
  );

  if (!open) return null;

  const currentLabel = getTierLabel(currentTier, t);
  const requiredLabel = getTierLabel(requiredTier, t);
  const actionText = t(actionKey);

  return (
    <div
      ref={overlayRef}
      onClick={handleOverlayClick}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(0, 0, 0, 0.6)", backdropFilter: "blur(4px)" }}
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="tier-gate-title"
    >
      <div
        className="w-full max-w-md rounded-xl p-6 shadow-2xl animate-in"
        style={{
          backgroundColor: "var(--card)",
          border: "1px solid var(--border)",
        }}
      >
        {/* Header */}
        <div className="flex items-start gap-4 mb-4">
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center shrink-0"
            style={{
              backgroundColor: "color-mix(in srgb, var(--accent) 15%, transparent)",
            }}
          >
            <ShieldAlert className="w-6 h-6" style={{ color: "var(--accent)" }} />
          </div>
          <div className="flex-1 min-w-0">
            <h2
              id="tier-gate-title"
              className="text-lg font-bold"
              style={{ color: "var(--foreground)" }}
            >
              {t("identity.verificationRequired")}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="shrink-0 p-1 rounded-lg transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
            style={{ color: "var(--muted-foreground)" }}
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="space-y-3 mb-6">
          <p className="text-sm leading-relaxed" style={{ color: "var(--muted-foreground)" }}>
            {t("identity.verificationDesc").replace("{action}", actionText)}
          </p>

          {/* Practical example — required per project rules */}
          <div
            className="rounded-lg p-3 text-sm"
            style={{
              backgroundColor: "color-mix(in srgb, var(--accent) 8%, transparent)",
              border: "1px solid color-mix(in srgb, var(--accent) 20%, transparent)",
            }}
          >
            <p style={{ color: "var(--foreground)" }}>
              {t("identity.verificationDescExample")}
            </p>
          </div>

          {/* Tier badges */}
          <div className="flex items-center gap-3 pt-2">
            <TierBadge tier={currentTier} label={currentLabel} current />
            <ArrowRight className="w-4 h-4 shrink-0" style={{ color: "var(--muted-foreground)" }} />
            <TierBadge tier={requiredTier} label={requiredLabel} />
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="btn-secondary flex-1 text-sm min-h-[44px]"
          >
            {t("identity.verifyLater")}
          </button>
          <Link
            href="/settings?tab=identity"
            onClick={onClose}
            className="btn-primary flex-1 text-sm min-h-[44px] flex items-center justify-center gap-2"
          >
            <ShieldCheck className="w-4 h-4" />
            {t("identity.verifyNow")}
          </Link>
        </div>
      </div>
    </div>
  );
}

// --- Tier Badge sub-component ---
function TierBadge({ tier, label, current }: { tier: IdentityTier; label: string; current?: boolean }) {
  const colors: Record<IdentityTier, string> = {
    0: "var(--muted-foreground)",
    1: "#3b82f6",  // blue
    2: "#22c55e",  // green
    3: "#f59e0b",  // amber
  };

  return (
    <span
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium"
      style={{
        backgroundColor: current
          ? "color-mix(in srgb, var(--muted-foreground) 15%, transparent)"
          : `color-mix(in srgb, ${colors[tier]} 15%, transparent)`,
        color: current ? "var(--muted-foreground)" : colors[tier],
        border: `1px solid ${current ? "var(--border)" : colors[tier]}`,
      }}
    >
      T{tier} — {label}
    </span>
  );
}

// --- Helper to get translated tier label ---
function getTierLabel(tier: IdentityTier, t: (key: string) => string): string {
  const keys: Record<IdentityTier, string> = {
    0: "identity.tierGhost",
    1: "identity.tierResident",
    2: "identity.tierCitizen",
    3: "identity.tierGuarantor",
  };
  return t(keys[tier]);
}

// --- Hook: useTierGate ---
// Convenience hook for components that need to gate an action
export function useTierGate(currentTier: IdentityTier) {
  const [gateOpen, setGateOpen] = useState(false);
  const [gateAction, setGateAction] = useState<string>("identity.actionVote");
  const [gateRequiredTier, setGateRequiredTier] = useState<IdentityTier>(2);

  const checkTier = useCallback(
    (requiredTier: IdentityTier, actionKey: string): boolean => {
      if (currentTier >= requiredTier) return true;
      // Not enough tier — show gate
      setGateRequiredTier(requiredTier);
      setGateAction(actionKey);
      setGateOpen(true);
      return false;
    },
    [currentTier]
  );

  const closeGate = useCallback(() => setGateOpen(false), []);

  return {
    checkTier,
    gateOpen,
    gateAction,
    gateRequiredTier,
    closeGate,
  };
}

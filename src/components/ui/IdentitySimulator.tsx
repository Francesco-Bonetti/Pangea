"use client";

import { useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useLanguage } from "@/components/core/language-provider";
import { useToast } from "@/components/ui/Toast";
import {
  ShieldCheck,
  Smartphone,
  CreditCard,
  Fingerprint,
  Loader2,
  AlertTriangle,
} from "lucide-react";
import type { IdentityTier, IdentityProvider } from "@/lib/types";

interface IdentitySimulatorProps {
  userId: string;
  currentTier: IdentityTier;
  onTierUpdated: (newTier: IdentityTier) => void;
}

/**
 * DE-05: Identity Simulator for testing.
 * Generates a simulated proof_hash from user input and calls verify_identity RPC.
 * In production, this will be replaced by real SPID/CIE/eIDAS providers.
 */
export default function IdentitySimulator({
  userId,
  currentTier,
  onTierUpdated,
}: IdentitySimulatorProps) {
  const { t } = useLanguage();
  const { toast } = useToast();
  const supabase = createClient();

  const [phoneInput, setPhoneInput] = useState("");
  const [fiscalCodeInput, setFiscalCodeInput] = useState("");
  const [loading, setLoading] = useState<IdentityProvider | null>(null);

  // Generate a deterministic hash from input (simulated — NOT cryptographically secure)
  // In production this comes from the identity provider
  const simulateHash = useCallback(async (input: string, salt: string): Promise<string> => {
    const encoder = new TextEncoder();
    const data = encoder.encode(input.toUpperCase().trim() + salt);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
  }, []);

  const handleVerify = useCallback(
    async (provider: IdentityProvider, input: string, tierGranted: IdentityTier) => {
      if (!input.trim()) return;

      setLoading(provider);
      try {
        const proofHash = await simulateHash(input, `pangea_${provider}_v1`);

        const { data, error } = await supabase.rpc("verify_identity", {
          p_user_id: userId,
          p_provider_type: provider,
          p_proof_hash: proofHash,
          p_tier_granted: tierGranted,
        });

        if (error) {
          toast(t("identity.simulationError"), "error");
          console.error("verify_identity error:", error);
          return;
        }

        const result = data as { success: boolean; tier?: number; error?: string; message?: string };

        if (result.success) {
          const newTier = (result.tier ?? tierGranted) as IdentityTier;
          onTierUpdated(newTier);
          const tierLabel = getTierLabelLocal(newTier, t);
          toast(
            t("identity.simulationSuccess").replace("{tier}", tierLabel),
            "success"
          );
        } else {
          toast(result.message || t("identity.simulationError"), "error");
        }
      } catch (err) {
        console.error("Simulation error:", err);
        toast(t("identity.simulationError"), "error");
      } finally {
        setLoading(null);
      }
    },
    [userId, supabase, simulateHash, onTierUpdated, toast, t]
  );

  return (
    <div
      className="rounded-xl p-5 space-y-5"
      style={{
        backgroundColor: "color-mix(in srgb, var(--accent) 5%, var(--card))",
        border: "1px solid var(--border)",
      }}
    >
      {/* Header */}
      <div className="flex items-center gap-3">
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center"
          style={{
            backgroundColor: "color-mix(in srgb, var(--accent) 15%, transparent)",
          }}
        >
          <AlertTriangle className="w-5 h-5" style={{ color: "var(--accent)" }} />
        </div>
        <div>
          <h3 className="font-semibold text-sm" style={{ color: "var(--foreground)" }}>
            {t("identity.simulatorTitle")}
          </h3>
          <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>
            {t("identity.simulatorDesc")}
          </p>
        </div>
      </div>

      {/* Current tier display */}
      <div
        className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm"
        style={{
          backgroundColor: "color-mix(in srgb, var(--foreground) 5%, transparent)",
        }}
      >
        <ShieldCheck className="w-4 h-4" style={{ color: tierColor(currentTier) }} />
        <span style={{ color: "var(--foreground)" }}>
          {t("identity.currentTier").replace("{tier}", `T${currentTier} — ${getTierLabelLocal(currentTier, t)}`)}
        </span>
      </div>

      {/* Phone verification → T1 */}
      <div className="space-y-2">
        <label className="text-xs font-medium flex items-center gap-1.5" style={{ color: "var(--muted-foreground)" }}>
          <Smartphone className="w-3.5 h-3.5" />
          {t("identity.simulatePhone")} → T1
        </label>
        <div className="flex gap-2">
          <input
            type="tel"
            value={phoneInput}
            onChange={(e) => setPhoneInput(e.target.value)}
            placeholder={t("identity.phonePlaceholder")}
            className="flex-1 px-3 py-2 rounded-lg text-sm"
            style={{
              backgroundColor: "var(--input)",
              border: "1px solid var(--border)",
              color: "var(--foreground)",
            }}
            disabled={loading !== null}
          />
          <button
            onClick={() => handleVerify("phone", phoneInput, 1)}
            disabled={!phoneInput.trim() || loading !== null}
            className="btn-secondary text-xs px-4 min-h-[40px] flex items-center gap-1.5"
          >
            {loading === "phone" ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Smartphone className="w-3.5 h-3.5" />
            )}
            T1
          </button>
        </div>
      </div>

      {/* SPID verification → T2 */}
      <div className="space-y-2">
        <label className="text-xs font-medium flex items-center gap-1.5" style={{ color: "var(--muted-foreground)" }}>
          <CreditCard className="w-3.5 h-3.5" />
          {t("identity.simulateSPID")} → T2
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            value={fiscalCodeInput}
            onChange={(e) => setFiscalCodeInput(e.target.value.toUpperCase())}
            placeholder={t("identity.fiscalCodePlaceholder")}
            className="flex-1 px-3 py-2 rounded-lg text-sm uppercase"
            style={{
              backgroundColor: "var(--input)",
              border: "1px solid var(--border)",
              color: "var(--foreground)",
            }}
            maxLength={16}
            disabled={loading !== null}
          />
          <button
            onClick={() => handleVerify("spid", fiscalCodeInput, 2)}
            disabled={!fiscalCodeInput.trim() || loading !== null}
            className="btn-primary text-xs px-4 min-h-[40px] flex items-center gap-1.5"
          >
            {loading === "spid" ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <CreditCard className="w-3.5 h-3.5" />
            )}
            T2
          </button>
        </div>
      </div>

      {/* CIE verification → T2 */}
      <div className="space-y-2">
        <label className="text-xs font-medium flex items-center gap-1.5" style={{ color: "var(--muted-foreground)" }}>
          <Fingerprint className="w-3.5 h-3.5" />
          {t("identity.simulateCIE")} → T2
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            value={fiscalCodeInput}
            onChange={(e) => setFiscalCodeInput(e.target.value.toUpperCase())}
            placeholder={t("identity.fiscalCodePlaceholder")}
            className="flex-1 px-3 py-2 rounded-lg text-sm uppercase"
            style={{
              backgroundColor: "var(--input)",
              border: "1px solid var(--border)",
              color: "var(--foreground)",
            }}
            maxLength={16}
            disabled={loading !== null}
          />
          <button
            onClick={() => handleVerify("cie", fiscalCodeInput, 2)}
            disabled={!fiscalCodeInput.trim() || loading !== null}
            className="btn-secondary text-xs px-4 min-h-[40px] flex items-center gap-1.5"
          >
            {loading === "cie" ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Fingerprint className="w-3.5 h-3.5" />
            )}
            T2
          </button>
        </div>
      </div>
    </div>
  );
}

// --- Helpers ---
function tierColor(tier: IdentityTier): string {
  const colors: Record<IdentityTier, string> = {
    0: "var(--muted-foreground)",
    1: "#3b82f6",
    2: "#22c55e",
    3: "#f59e0b",
  };
  return colors[tier];
}

function getTierLabelLocal(tier: IdentityTier, t: (key: string) => string): string {
  const keys: Record<IdentityTier, string> = {
    0: "identity.tierGhost",
    1: "identity.tierResident",
    2: "identity.tierCitizen",
    3: "identity.tierGuarantor",
  };
  return t(keys[tier]);
}

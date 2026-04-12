"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Shield, CheckCircle, XCircle, Loader2 } from "lucide-react";
import { formatHash } from "@/lib/integrity";
import { useLanguage } from "@/components/core/language-provider";
import type { HashEntityType } from "@/lib/types";

interface IntegrityBadgeProps {
  entityType: HashEntityType;
  entityId: string;
  /** Compact mode — small icon only */
  compact?: boolean;
  /** Show the hash text */
  showHash?: boolean;
}

/**
 * IntegrityBadge — shows the integrity status of any hashed record.
 * Fetches the latest hash from content_hashes and displays a badge.
 * Links to /verify for full verification.
 */
export default function IntegrityBadge({
  entityType,
  entityId,
  compact = false,
  showHash = false,
}: IntegrityBadgeProps) {
  const { t } = useLanguage();
  const [hash, setHash] = useState<string | null>(null);
  const [version, setVersion] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [hasHash, setHasHash] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;

    async function fetchHash() {
      const { data } = await supabase
        .from("content_hashes")
        .select("content_hash, version")
        .eq("entity_type", entityType)
        .eq("entity_id", entityId)
        .order("version", { ascending: false })
        .limit(1)
        .single();

      if (!cancelled) {
        if (data) {
          setHash(data.content_hash);
          setVersion(data.version);
          setHasHash(true);
        }
        setLoading(false);
      }
    }

    fetchHash();
    return () => { cancelled = true; };
  }, [entityType, entityId]);

  if (loading) {
    if (compact) return null; // Don't show loading in compact mode
    return (
      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
        <Loader2 className="w-3 h-3 animate-spin" />
      </span>
    );
  }

  if (!hasHash) {
    // No hash recorded yet — show nothing or a subtle indicator
    if (compact) return null;
    return (
      <span
        className="inline-flex items-center gap-1 text-xs text-muted-foreground/50"
        title={t("integrity.notYetHashed")}
      >
        <Shield className="w-3 h-3" />
      </span>
    );
  }

  // Has a valid hash
  if (compact) {
    return (
      <a
        href={`/verify?type=${entityType}&id=${entityId}`}
        className="inline-flex items-center gap-1 text-xs text-green-600 hover:text-green-700 transition-colors"
        title={`${t("integrity.verified")} — v${version} — ${formatHash(hash || "", 12)}`}
      >
        <Shield className="w-3.5 h-3.5" />
        {showHash && (
          <code className="font-mono text-[10px]">{formatHash(hash || "", 8)}</code>
        )}
      </a>
    );
  }

  return (
    <a
      href={`/verify?type=${entityType}&id=${entityId}`}
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-green-50 dark:bg-green-950/20 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800 hover:bg-green-100 dark:hover:bg-green-950/30 transition-colors"
      title={t("integrity.clickToVerify")}
    >
      <CheckCircle className="w-3.5 h-3.5" />
      <span>{t("integrity.verified")}</span>
      {showHash && (
        <code className="font-mono text-[10px] opacity-70">
          {formatHash(hash || "", 8)}
        </code>
      )}
    </a>
  );
}

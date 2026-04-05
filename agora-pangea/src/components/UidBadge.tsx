"use client";

import { useState, useCallback } from "react";
import { Copy, Check, ExternalLink } from "lucide-react";
import { useRouter } from "next/navigation";
import { parseUid, UID_COLORS, copyUidToClipboard, getEntityRoute } from "@/lib/uid";
import { useLanguage } from "@/components/language-provider";
import type { UidPrefix } from "@/lib/uid";

interface UidBadgeProps {
  uid: string;
  size?: "xs" | "sm" | "md";
  clickable?: boolean;
  showCopy?: boolean;
  showType?: boolean;
}

export default function UidBadge({
  uid,
  size = "sm",
  clickable = true,
  showCopy = true,
  showType = false,
}: UidBadgeProps) {
  const { t } = useLanguage();
  const router = useRouter();
  const [copied, setCopied] = useState(false);

  const parsed = parseUid(uid);
  if (!parsed) return null;

  const colors = UID_COLORS[parsed.prefix] || UID_COLORS.CIT;
  const route = getEntityRoute(uid);

  const typeLabel = t(`uid.types.${parsed.prefix.toLowerCase()}`);

  const handleCopy = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation();
    const ok = await copyUidToClipboard(uid);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [uid]);

  const handleClick = useCallback(() => {
    if (clickable && route) {
      router.push(route);
    }
  }, [clickable, route, router]);

  const sizeClasses = {
    xs: "text-[9px] px-1 py-0.5 gap-0.5",
    sm: "text-[10px] px-1.5 py-0.5 gap-1",
    md: "text-xs px-2 py-1 gap-1.5",
  };

  const iconSize = {
    xs: "w-2 h-2",
    sm: "w-2.5 h-2.5",
    md: "w-3 h-3",
  };

  return (
    <span
      className={`
        inline-flex items-center rounded-full border font-mono font-medium
        ${colors.bg} ${colors.text} ${colors.border}
        ${sizeClasses[size]}
        ${clickable && route ? "cursor-pointer hover:opacity-80 transition-opacity" : ""}
      `}
      onClick={clickable && route ? handleClick : undefined}
      title={`${typeLabel}: ${uid}${clickable && route ? ` — ${t("uid.clickToView")}` : ""}`}
    >
      {showType && (
        <span className="opacity-70 font-sans">{typeLabel}</span>
      )}
      <span>{uid}</span>
      {showCopy && (
        <button
          onClick={handleCopy}
          className="ml-0.5 opacity-60 hover:opacity-100 transition-opacity"
          title={t("uid.copy")}
        >
          {copied ? (
            <Check className={`${iconSize[size]} text-green-400`} />
          ) : (
            <Copy className={iconSize[size]} />
          )}
        </button>
      )}
      {clickable && route && (
        <ExternalLink className={`${iconSize[size]} opacity-40`} />
      )}
    </span>
  );
}

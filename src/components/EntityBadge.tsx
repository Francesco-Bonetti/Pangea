"use client";

import { Building2, Flag, User } from "lucide-react";
import { useLanguage } from "@/components/language-provider";

interface EntityBadgeProps {
  entityType: "jurisdiction" | "party" | "citizen";
  size?: "sm" | "md";
}

const ENTITY_CONFIG = {
  jurisdiction: {
    icon: Building2,
    colorClass: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
    labelKey: "messages.entityBadge.jurisdiction",
  },
  party: {
    icon: Flag,
    colorClass: "bg-purple-500/20 text-purple-400 border-purple-500/30",
    labelKey: "messages.entityBadge.party",
  },
  citizen: {
    icon: User,
    colorClass: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    labelKey: "messages.entityBadge.citizen",
  },
};

export default function EntityBadge({ entityType, size = "sm" }: EntityBadgeProps) {
  const { t } = useLanguage();
  const config = ENTITY_CONFIG[entityType] || ENTITY_CONFIG.citizen;
  const Icon = config.icon;
  const label = t(config.labelKey);

  const sizeClasses = size === "sm"
    ? "text-[10px] px-1.5 py-0.5 gap-0.5"
    : "text-xs px-2 py-1 gap-1";

  const iconSize = size === "sm" ? "w-2.5 h-2.5" : "w-3 h-3";

  return (
    <span className={`inline-flex items-center rounded-full border font-medium ${config.colorClass} ${sizeClasses}`}>
      <Icon className={iconSize} />
      {label}
    </span>
  );
}

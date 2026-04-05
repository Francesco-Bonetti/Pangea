"use client";

import { Building2, Flag, User } from "lucide-react";
import { useLanguage } from "@/components/language-provider";

interface EntityBadgeProps {
  entityType: "group" | "citizen";
  size?: "sm" | "md";
}

const ENTITY_CONFIG = {
  group: {
    icon: Flag,
    colorClass: "bg-amber-500/20 text-amber-400 border-amber-500/30",
    labelKey: "messages.entityBadge.group",
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

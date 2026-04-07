"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Globe,
  Landmark,
  Flag,
  Users,
  BookOpen,
  Vote,
  MessageCircle,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import { useLanguage } from "@/components/language-provider";

/* ── Branch configuration ── */
interface TreeBranch {
  id: string;
  href: string;
  iconKey: string;
  labelKey: string;
  subtitleKey: string;
  color: string;
  glowColor: string;
  statKey?: string;
}

const BRANCHES: TreeBranch[] = [
  {
    id: "jurisdictions",
    href: "/groups?type=jurisdiction",
    iconKey: "landmark",
    labelKey: "tree.jurisdictions",
    subtitleKey: "tree.jurisdictionsDesc",
    color: "#3b82f6",
    glowColor: "rgba(59,130,246,0.3)",
  },
  {
    id: "movements",
    href: "/groups?type=party",
    iconKey: "flag",
    labelKey: "tree.movements",
    subtitleKey: "tree.movementsDesc",
    color: "#ef4444",
    glowColor: "rgba(239,68,68,0.3)",
  },
  {
    id: "communities",
    href: "/groups?type=community",
    iconKey: "users",
    labelKey: "tree.communities",
    subtitleKey: "tree.communitiesDesc",
    color: "#8b5cf6",
    glowColor: "rgba(139,92,246,0.3)",
  },
  {
    id: "laws",
    href: "/laws",
    iconKey: "book",
    labelKey: "tree.laws",
    subtitleKey: "tree.lawsDesc",
    color: "#f59e0b",
    glowColor: "rgba(245,158,11,0.3)",
  },
  {
    id: "elections",
    href: "/elections",
    iconKey: "vote",
    labelKey: "tree.elections",
    subtitleKey: "tree.electionsDesc",
    color: "#10b981",
    glowColor: "rgba(16,185,129,0.3)",
  },
  {
    id: "agora",
    href: "/social",
    iconKey: "message",
    labelKey: "tree.agora",
    subtitleKey: "tree.agoraDesc",
    color: "#ec4899",
    glowColor: "rgba(236,72,153,0.3)",
  },
];

const ICON_MAP: Record<string, React.ElementType> = {
  landmark: Landmark,
  flag: Flag,
  users: Users,
  book: BookOpen,
  vote: Vote,
  message: MessageCircle,
};

/* ── Tree Node (branch) ── */
function TreeNode({
  branch,
  index,
  visible,
  hovered,
  onHover,
  stat,
}: {
  branch: TreeBranch;
  index: number;
  visible: boolean;
  hovered: string | null;
  onHover: (id: string | null) => void;
  stat?: number;
}) {
  const { t } = useLanguage();
  const Icon = ICON_MAP[branch.iconKey] || Globe;
  const isHovered = hovered === branch.id;
  const isFaded = hovered !== null && !isHovered;
  const delay = 0.15 + index * 0.1;

  return (
    <Link
      href={branch.href}
      className="tree-node group block"
      onMouseEnter={() => onHover(branch.id)}
      onMouseLeave={() => onHover(null)}
      style={{
        opacity: visible ? (isFaded ? 0.5 : 1) : 0,
        transform: visible
          ? `scale(${isHovered ? 1.05 : 1})`
          : "scale(0.8)",
        transition: `all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) ${delay}s`,
      }}
    >
      <div
        className="relative rounded-2xl p-4 sm:p-5 border transition-all duration-300"
        style={{
          borderColor: isHovered ? branch.color : "var(--border)",
          backgroundColor: "var(--card)",
          boxShadow: isHovered
            ? `0 0 30px ${branch.glowColor}, 0 8px 32px rgba(0,0,0,0.12)`
            : "0 2px 8px rgba(0,0,0,0.06)",
        }}
      >
        {/* Icon circle */}
        <div
          className="w-11 h-11 rounded-xl flex items-center justify-center mb-3 transition-transform duration-300 group-hover:scale-110"
          style={{
            background: `linear-gradient(135deg, ${branch.color}, ${branch.color}dd)`,
          }}
        >
          <Icon className="w-5 h-5 text-white" strokeWidth={2} />
        </div>

        {/* Label */}
        <h3
          className="text-sm font-bold mb-1 tracking-tight"
          style={{ color: "var(--foreground)" }}
        >
          {t(branch.labelKey)}
        </h3>

        {/* Subtitle */}
        <p
          className="text-xs leading-relaxed"
          style={{ color: "var(--muted-foreground)" }}
        >
          {t(branch.subtitleKey)}
        </p>

        {/* Stat badge */}
        {stat !== undefined && stat > 0 && (
          <div
            className="absolute top-3 right-3 px-2 py-0.5 rounded-full text-[10px] font-bold text-white"
            style={{ backgroundColor: branch.color }}
          >
            {stat}
          </div>
        )}

        {/* Arrow indicator */}
        <div
          className="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 transition-all duration-300 group-hover:translate-x-0.5"
          style={{ color: branch.color }}
        >
          <ChevronRight className="w-4 h-4" />
        </div>
      </div>
    </Link>
  );
}

/* ── Main Tree Component ── */
interface PangeaTreeProps {
  stats?: {
    total_users: number;
    total_proposals: number;
    total_votes: number;
    active_proposals: number;
    closed_proposals: number;
  };
  isGuest: boolean;
}

export default function PangeaTree({ stats, isGuest }: PangeaTreeProps) {
  const { t } = useLanguage();
  const [visible, setVisible] = useState(false);
  const [hovered, setHovered] = useState<string | null>(null);
  const [pulseCore, setPulseCore] = useState(false);

  useEffect(() => {
    // Stagger the appearance
    const timer = setTimeout(() => setVisible(true), 100);
    const pulseTimer = setTimeout(() => setPulseCore(true), 600);
    return () => {
      clearTimeout(timer);
      clearTimeout(pulseTimer);
    };
  }, []);

  return (
    <div className="relative w-full">
      {/* ── Central Core Node ── */}
      <div className="flex flex-col items-center mb-8 sm:mb-10">
        <div
          className="relative"
          style={{
            opacity: visible ? 1 : 0,
            transform: visible ? "scale(1)" : "scale(0.5)",
            transition: "all 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)",
          }}
        >
          {/* Pulsing ring */}
          <div
            className="absolute inset-0 rounded-full"
            style={{
              background:
                "radial-gradient(circle, rgba(59,130,246,0.15) 0%, transparent 70%)",
              transform: pulseCore ? "scale(2.5)" : "scale(1)",
              opacity: pulseCore ? 0 : 0.5,
              transition: "all 2s ease-out",
              animation: pulseCore
                ? "treePulse 3s ease-in-out infinite"
                : "none",
            }}
          />

          {/* Core globe */}
          <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-gradient-to-br from-blue-500 via-blue-600 to-blue-800 flex items-center justify-center shadow-2xl shadow-blue-600/30 border-2 border-blue-400/30">
            <Globe
              className="w-10 h-10 sm:w-12 sm:h-12 text-white"
              strokeWidth={1.5}
            />
          </div>
        </div>

        {/* Title + subtitle */}
        <div
          className="text-center mt-4"
          style={{
            opacity: visible ? 1 : 0,
            transform: visible ? "translateY(0)" : "translateY(10px)",
            transition: "all 0.5s ease 0.3s",
          }}
        >
          <h1
            className="text-2xl sm:text-3xl font-extrabold tracking-tight"
            style={{ color: "var(--foreground)" }}
          >
            PANGEA
          </h1>
          <p
            className="text-sm sm:text-base mt-1 max-w-md mx-auto"
            style={{ color: "var(--muted-foreground)" }}
          >
            {t("tree.subtitle")}
          </p>
          {!isGuest && (
            <div
              className="inline-flex items-center gap-1.5 mt-2 px-3 py-1 rounded-full text-xs font-medium"
              style={{
                backgroundColor: "color-mix(in srgb, var(--primary) 10%, transparent)",
                color: "var(--primary)",
              }}
            >
              <Sparkles className="w-3 h-3" />
              {t("tree.welcomeBack")}
            </div>
          )}
        </div>
      </div>

      {/* ── SVG Connections (desktop only) ── */}
      <svg
        className="hidden lg:block absolute inset-0 w-full h-full pointer-events-none"
        style={{ zIndex: 0 }}
        preserveAspectRatio="none"
      >
        {/* Lines are drawn dynamically via CSS positioning — we use gradient fades instead */}
      </svg>

      {/* ── Branch Grid ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4 max-w-4xl mx-auto">
        {BRANCHES.map((branch, i) => (
          <TreeNode
            key={branch.id}
            branch={branch}
            index={i}
            visible={visible}
            hovered={hovered}
            onHover={setHovered}
          />
        ))}
      </div>

      {/* ── Decorative connecting lines (CSS-based) ── */}
      <style jsx global>{`
        @keyframes treePulse {
          0%,
          100% {
            transform: scale(2);
            opacity: 0.15;
          }
          50% {
            transform: scale(2.8);
            opacity: 0;
          }
        }

        /* Connecting line effect from center to grid */
        .tree-connector {
          position: absolute;
          width: 2px;
          background: linear-gradient(
            to bottom,
            var(--primary),
            transparent
          );
          transform-origin: top center;
        }
      `}</style>
    </div>
  );
}

"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Globe,
  Landmark,
  Flag,
  Users,
  BookOpen,
  Vote,
  MessageCircle,
  Plus,
  Sparkles,
} from "lucide-react";
import { useLanguage } from "@/components/language-provider";

/* ── Semantic color palette ── */
const PALETTE = {
  jurisdictions: { main: "#2563eb", light: "#3b82f6", glow: "rgba(37,99,235,0.25)" },
  parties:       { main: "#dc2626", light: "#ef4444", glow: "rgba(220,38,38,0.25)" },
  communities:   { main: "#7c3aed", light: "#8b5cf6", glow: "rgba(124,58,237,0.25)" },
  laws:          { main: "#d97706", light: "#f59e0b", glow: "rgba(217,119,6,0.25)" },
  elections:     { main: "#059669", light: "#10b981", glow: "rgba(5,150,105,0.25)" },
  forum:         { main: "#db2777", light: "#ec4899", glow: "rgba(219,39,119,0.25)" },
} as const;

/* ── Branch configuration ── */
interface TreeBranch {
  id: keyof typeof PALETTE;
  href: string;
  iconKey: string;
  labelKey: string;
  descKey: string;
  canCreate: boolean;
  createHref?: string;
}

const BRANCHES: TreeBranch[] = [
  {
    id: "jurisdictions",
    href: "/groups?type=jurisdiction",
    iconKey: "landmark",
    labelKey: "tree.jurisdictions",
    descKey: "tree.jurisdictionsDesc",
    canCreate: false,
  },
  {
    id: "parties",
    href: "/groups?type=party",
    iconKey: "flag",
    labelKey: "tree.parties",
    descKey: "tree.partiesDesc",
    canCreate: true,
    createHref: "/groups?type=party&create=1",
  },
  {
    id: "communities",
    href: "/groups?type=community",
    iconKey: "users",
    labelKey: "tree.communities",
    descKey: "tree.communitiesDesc",
    canCreate: true,
    createHref: "/groups?type=community&create=1",
  },
  {
    id: "laws",
    href: "/laws",
    iconKey: "book",
    labelKey: "tree.laws",
    descKey: "tree.lawsDesc",
    canCreate: false,
  },
  {
    id: "elections",
    href: "/elections",
    iconKey: "vote",
    labelKey: "tree.elections",
    descKey: "tree.electionsDesc",
    canCreate: false,
  },
  {
    id: "forum",
    href: "/social",
    iconKey: "message",
    labelKey: "tree.forum",
    descKey: "tree.forumDesc",
    canCreate: false,
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

/* ── SVG curved branch path ── */
function BranchPath({
  startX,
  startY,
  endX,
  endY,
  color,
  active,
  delay,
  visible,
}: {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  color: string;
  active: boolean;
  delay: number;
  visible: boolean;
}) {
  // Cubic bezier: vertical drop from center, then curve out to the card
  const midY = startY + (endY - startY) * 0.4;
  const d = `M ${startX} ${startY} C ${startX} ${midY}, ${endX} ${midY}, ${endX} ${endY}`;

  return (
    <path
      d={d}
      fill="none"
      stroke={color}
      strokeWidth={active ? 2.5 : 1.5}
      strokeLinecap="round"
      opacity={visible ? (active ? 0.8 : 0.3) : 0}
      style={{
        transition: `all 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) ${delay}s`,
        filter: active ? `drop-shadow(0 0 6px ${color})` : "none",
      }}
    />
  );
}

/* ── Tree Node Card ── */
function TreeNodeCard({
  branch,
  index,
  visible,
  hovered,
  onHover,
  isGuest,
}: {
  branch: TreeBranch;
  index: number;
  visible: boolean;
  hovered: string | null;
  onHover: (id: string | null) => void;
  isGuest: boolean;
}) {
  const { t } = useLanguage();
  const router = useRouter();
  const Icon = ICON_MAP[branch.iconKey] || Globe;
  const colors = PALETTE[branch.id];
  const isHovered = hovered === branch.id;
  const isFaded = hovered !== null && !isHovered;
  const delay = 0.2 + index * 0.08;

  return (
    <div
      className="tree-card-wrapper relative"
      onMouseEnter={() => onHover(branch.id)}
      onMouseLeave={() => onHover(null)}
      style={{
        opacity: visible ? (isFaded ? 0.55 : 1) : 0,
        transform: visible
          ? `scale(${isHovered ? 1.04 : 1}) translateY(${isHovered ? -4 : 0}px)`
          : "scale(0.85) translateY(12px)",
        transition: `all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) ${delay}s`,
      }}
    >
      <Link href={branch.href} className="block">
        <div
          className="relative rounded-xl p-4 border transition-all duration-300"
          style={{
            borderColor: isHovered ? colors.main : "var(--border)",
            backgroundColor: "var(--card)",
            boxShadow: isHovered
              ? `0 0 24px ${colors.glow}, 0 8px 24px rgba(0,0,0,0.1)`
              : "0 1px 4px rgba(0,0,0,0.06)",
          }}
        >
          {/* Top row: Icon + Label inline */}
          <div className="flex items-center gap-3 mb-2">
            <div
              className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 transition-transform duration-300"
              style={{
                background: `linear-gradient(135deg, ${colors.main}, ${colors.light})`,
                transform: isHovered ? "scale(1.1)" : "scale(1)",
              }}
            >
              <Icon className="w-[18px] h-[18px] text-white" strokeWidth={2} />
            </div>
            <h3
              className="text-base font-bold tracking-tight leading-tight"
              style={{ color: "var(--foreground)" }}
            >
              {t(branch.labelKey)}
            </h3>
          </div>

          {/* Description */}
          <p
            className="text-sm leading-relaxed"
            style={{ color: "var(--muted-foreground)" }}
          >
            {t(branch.descKey)}
          </p>
        </div>
      </Link>

      {/* Create New button (overlaid at bottom-right) */}
      {branch.canCreate && !isGuest && branch.createHref && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            router.push(branch.createHref!);
          }}
          className="absolute -bottom-2 -right-2 flex items-center gap-1 px-2.5 py-1 rounded-full text-white text-[11px] font-semibold shadow-lg transition-all duration-200 hover:scale-105 active:scale-95 z-10"
          style={{
            background: `linear-gradient(135deg, ${colors.main}, ${colors.light})`,
            boxShadow: `0 2px 8px ${colors.glow}`,
            opacity: visible ? 1 : 0,
            transitionDelay: `${delay + 0.2}s`,
          }}
          title={t("tree.createNew")}
        >
          <Plus className="w-3 h-3" />
          {t("tree.createNew")}
        </button>
      )}
    </div>
  );
}

/* ── Main Tree Component ── */
interface PangeaTreeProps {
  isGuest: boolean;
}

export default function PangeaTree({ isGuest }: PangeaTreeProps) {
  const { t } = useLanguage();
  const [visible, setVisible] = useState(false);
  const [hovered, setHovered] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const globeRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [paths, setPaths] = useState<
    { startX: number; startY: number; endX: number; endY: number; color: string; id: string }[]
  >([]);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), 100);
    return () => clearTimeout(timer);
  }, []);

  /* Calculate SVG paths connecting globe to each card */
  const calculatePaths = useCallback(() => {
    const container = containerRef.current;
    const globe = globeRef.current;
    if (!container || !globe) return;

    const containerRect = container.getBoundingClientRect();
    const globeRect = globe.getBoundingClientRect();

    const startX = globeRect.left + globeRect.width / 2 - containerRect.left;
    const startY = globeRect.top + globeRect.height - containerRect.top;

    const newPaths = cardRefs.current.map((card, i) => {
      if (!card) return null;
      const cardRect = card.getBoundingClientRect();
      const endX = cardRect.left + cardRect.width / 2 - containerRect.left;
      const endY = cardRect.top + 4 - containerRect.top;
      const branch = BRANCHES[i];
      return {
        startX,
        startY,
        endX,
        endY,
        color: PALETTE[branch.id].main,
        id: branch.id,
      };
    }).filter(Boolean) as typeof paths;

    setPaths(newPaths);
  }, []);

  useEffect(() => {
    // Recalculate after render + animation settle
    const timers = [
      setTimeout(calculatePaths, 200),
      setTimeout(calculatePaths, 800),
      setTimeout(calculatePaths, 1500),
    ];
    window.addEventListener("resize", calculatePaths);
    return () => {
      timers.forEach(clearTimeout);
      window.removeEventListener("resize", calculatePaths);
    };
  }, [calculatePaths, visible]);

  return (
    <div ref={containerRef} className="relative w-full max-w-4xl mx-auto">
      {/* ── SVG Branch Lines ── */}
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none"
        style={{ zIndex: 0 }}
      >
        {paths.map((p, i) => (
          <BranchPath
            key={p.id}
            startX={p.startX}
            startY={p.startY}
            endX={p.endX}
            endY={p.endY}
            color={p.color}
            active={hovered === p.id}
            delay={0.1 + i * 0.05}
            visible={visible}
          />
        ))}
      </svg>

      {/* ── Central Globe ── */}
      <div className="flex flex-col items-center mb-10 sm:mb-14 relative z-10">
        <div
          ref={globeRef}
          className="relative"
          style={{
            opacity: visible ? 1 : 0,
            transform: visible ? "scale(1)" : "scale(0.5)",
            transition: "all 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)",
          }}
        >
          {/* Pulsing aura */}
          <div
            className="absolute inset-0 rounded-full"
            style={{
              background:
                "radial-gradient(circle, rgba(37,99,235,0.12) 0%, transparent 70%)",
              animation: visible ? "globePulse 3s ease-in-out infinite" : "none",
            }}
          />
          {/* Globe */}
          <div
            className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-full flex items-center justify-center border-2"
            style={{
              background: "linear-gradient(135deg, #2563eb, #1d4ed8, #1e40af)",
              borderColor: "rgba(59,130,246,0.3)",
              boxShadow: "0 0 40px rgba(37,99,235,0.3), 0 8px 32px rgba(0,0,0,0.2)",
              perspective: "800px",
            }}
          >
            <Globe
              className="w-10 h-10 sm:w-12 sm:h-12 text-white"
              strokeWidth={1.5}
            />
          </div>
        </div>

        {/* Title */}
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
                backgroundColor:
                  "color-mix(in srgb, var(--primary) 10%, transparent)",
                color: "var(--primary)",
              }}
            >
              <Sparkles className="w-3 h-3" />
              {t("tree.welcomeBack")}
            </div>
          )}
        </div>
      </div>

      {/* ── Branch Grid ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 sm:gap-5 relative z-10">
        {BRANCHES.map((branch, i) => (
          <div
            key={branch.id}
            ref={(el) => {
              cardRefs.current[i] = el;
            }}
          >
            <TreeNodeCard
              branch={branch}
              index={i}
              visible={visible}
              hovered={hovered}
              onHover={setHovered}
              isGuest={isGuest}
            />
          </div>
        ))}
      </div>

      {/* ── Animations ── */}
      <style jsx global>{`
        @keyframes globePulse {
          0%, 100% {
            transform: scale(2);
            opacity: 0.12;
          }
          50% {
            transform: scale(2.8);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
}

"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Globe,
  Landmark,
  Flag,
  Users,
  BookOpen,
  Vote,
  MessageCircle,
  User,
  Settings,
  Info,
  Search,
  Plus,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Layers,
  Briefcase,
  Scale,
  Bell,
  Heart,
  Shield,
  FileText,
  Sparkles,
  RotateCcw,
} from "lucide-react";
import { useLanguage } from "@/components/language-provider";

/* ═══════════════════════════════════════════════════════════
   Types
   ═══════════════════════════════════════════════════════════ */

interface TreeNode {
  id: string;
  labelKey: string;
  descKey: string;
  iconKey: string;
  color: string;
  colorLight: string;
  glow: string;
  href: string;
  actionKey: string;
  actionHref?: string;
  canCreate?: boolean;
  createHref?: string;
  children?: TreeNode[];
}

/* ═══════════════════════════════════════════════════════════
   Color palette
   ═══════════════════════════════════════════════════════════ */

const C = {
  groups:     { main: "#2563eb", light: "#3b82f6", glow: "rgba(37,99,235,0.25)" },
  laws:       { main: "#d97706", light: "#f59e0b", glow: "rgba(217,119,6,0.25)" },
  agora:      { main: "#db2777", light: "#ec4899", glow: "rgba(219,39,119,0.25)" },
  elections:  { main: "#059669", light: "#10b981", glow: "rgba(5,150,105,0.25)" },
  personal:   { main: "#7c3aed", light: "#8b5cf6", glow: "rgba(124,58,237,0.25)" },
  settings:   { main: "#6b7280", light: "#9ca3af", glow: "rgba(107,114,128,0.25)" },
  about:      { main: "#0891b2", light: "#22d3ee", glow: "rgba(8,145,178,0.25)" },
  // Sub-branch variants (inherit parent hue, slightly different)
  jurisdictions: { main: "#1d4ed8", light: "#3b82f6", glow: "rgba(29,78,216,0.25)" },
  parties:       { main: "#dc2626", light: "#ef4444", glow: "rgba(220,38,38,0.25)" },
  communities:   { main: "#7c3aed", light: "#a78bfa", glow: "rgba(124,58,237,0.25)" },
  workingGroups: { main: "#0d9488", light: "#2dd4bf", glow: "rgba(13,148,136,0.25)" },
  browseLaws:    { main: "#b45309", light: "#f59e0b", glow: "rgba(180,83,9,0.25)" },
  proposeLaw:    { main: "#ea580c", light: "#fb923c", glow: "rgba(234,88,12,0.25)" },
  discussions:   { main: "#be185d", light: "#f472b6", glow: "rgba(190,24,93,0.25)" },
  channels:      { main: "#9d174d", light: "#ec4899", glow: "rgba(157,23,77,0.25)" },
  activeElections: { main: "#047857", light: "#34d399", glow: "rgba(4,120,87,0.25)" },
  pastResults:   { main: "#065f46", light: "#6ee7b7", glow: "rgba(6,95,70,0.25)" },
  profile:       { main: "#6d28d9", light: "#a78bfa", glow: "rgba(109,40,217,0.25)" },
  notifications: { main: "#7e22ce", light: "#c084fc", glow: "rgba(126,34,206,0.25)" },
  account:       { main: "#4b5563", light: "#9ca3af", glow: "rgba(75,85,99,0.25)" },
  preferences:   { main: "#374151", light: "#6b7280", glow: "rgba(55,65,81,0.25)" },
  mission:       { main: "#0e7490", light: "#22d3ee", glow: "rgba(14,116,144,0.25)" },
  charter:       { main: "#155e75", light: "#67e8f9", glow: "rgba(21,94,117,0.25)" },
};

/* ═══════════════════════════════════════════════════════════
   Tree data
   ═══════════════════════════════════════════════════════════ */

const TREE: TreeNode[] = [
  {
    id: "groups", labelKey: "tree.groups", descKey: "tree.groupsDesc",
    iconKey: "users", color: C.groups.main, colorLight: C.groups.light, glow: C.groups.glow,
    href: "/groups", actionKey: "tree.explore",
    children: [
      { id: "jurisdictions", labelKey: "tree.jurisdictions", descKey: "tree.jurisdictionsDesc", iconKey: "landmark", color: C.jurisdictions.main, colorLight: C.jurisdictions.light, glow: C.jurisdictions.glow, href: "/groups?type=jurisdiction", actionKey: "tree.browse" },
      { id: "parties", labelKey: "tree.parties", descKey: "tree.partiesDesc", iconKey: "flag", color: C.parties.main, colorLight: C.parties.light, glow: C.parties.glow, href: "/groups?type=party", actionKey: "tree.browse", canCreate: true, createHref: "/groups?type=party&create=1" },
      { id: "communities", labelKey: "tree.communities", descKey: "tree.communitiesDesc", iconKey: "users", color: C.communities.main, colorLight: C.communities.light, glow: C.communities.glow, href: "/groups?type=community", actionKey: "tree.browse", canCreate: true, createHref: "/groups?type=community&create=1" },
      { id: "workingGroups", labelKey: "tree.workingGroups", descKey: "tree.workingGroupsDesc", iconKey: "briefcase", color: C.workingGroups.main, colorLight: C.workingGroups.light, glow: C.workingGroups.glow, href: "/groups?type=working_group", actionKey: "tree.browse", canCreate: true, createHref: "/groups?type=working_group&create=1" },
    ],
  },
  {
    id: "laws", labelKey: "tree.laws", descKey: "tree.lawsDesc",
    iconKey: "book", color: C.laws.main, colorLight: C.laws.light, glow: C.laws.glow,
    href: "/laws", actionKey: "tree.explore",
    children: [
      { id: "browseLaws", labelKey: "tree.browseLaws", descKey: "tree.browseLawsDesc", iconKey: "search", color: C.browseLaws.main, colorLight: C.browseLaws.light, glow: C.browseLaws.glow, href: "/laws", actionKey: "tree.browse" },
      { id: "proposeLaw", labelKey: "tree.proposeLaw", descKey: "tree.proposeLawDesc", iconKey: "fileText", color: C.proposeLaw.main, colorLight: C.proposeLaw.light, glow: C.proposeLaw.glow, href: "/laws?propose=1", actionKey: "tree.create" },
    ],
  },
  {
    id: "agora", labelKey: "tree.agora", descKey: "tree.agoraDesc",
    iconKey: "message", color: C.agora.main, colorLight: C.agora.light, glow: C.agora.glow,
    href: "/social", actionKey: "tree.explore",
    children: [
      { id: "discussions", labelKey: "tree.discussions", descKey: "tree.discussionsDesc", iconKey: "message", color: C.discussions.main, colorLight: C.discussions.light, glow: C.discussions.glow, href: "/social", actionKey: "tree.browse" },
      { id: "channels", labelKey: "tree.channels", descKey: "tree.channelsDesc", iconKey: "message", color: C.channels.main, colorLight: C.channels.light, glow: C.channels.glow, href: "/social?tab=channels", actionKey: "tree.browse" },
    ],
  },
  {
    id: "elections", labelKey: "tree.elections", descKey: "tree.electionsDesc",
    iconKey: "vote", color: C.elections.main, colorLight: C.elections.light, glow: C.elections.glow,
    href: "/elections", actionKey: "tree.explore",
    children: [
      { id: "activeElections", labelKey: "tree.activeElections", descKey: "tree.activeElectionsDesc", iconKey: "vote", color: C.activeElections.main, colorLight: C.activeElections.light, glow: C.activeElections.glow, href: "/elections?status=active", actionKey: "tree.browse" },
      { id: "pastResults", labelKey: "tree.pastResults", descKey: "tree.pastResultsDesc", iconKey: "scale", color: C.pastResults.main, colorLight: C.pastResults.light, glow: C.pastResults.glow, href: "/elections?status=completed", actionKey: "tree.browse" },
    ],
  },
  {
    id: "personal", labelKey: "tree.personal", descKey: "tree.personalDesc",
    iconKey: "user", color: C.personal.main, colorLight: C.personal.light, glow: C.personal.glow,
    href: "/profile", actionKey: "tree.open",
    children: [
      { id: "profile", labelKey: "tree.profile", descKey: "tree.profileDesc", iconKey: "user", color: C.profile.main, colorLight: C.profile.light, glow: C.profile.glow, href: "/profile", actionKey: "tree.open" },
      { id: "notifications", labelKey: "tree.notifications", descKey: "tree.notificationsDesc", iconKey: "bell", color: C.notifications.main, colorLight: C.notifications.light, glow: C.notifications.glow, href: "/profile?tab=notifications", actionKey: "tree.open" },
    ],
  },
  {
    id: "settings", labelKey: "tree.settings", descKey: "tree.settingsDesc",
    iconKey: "settings", color: C.settings.main, colorLight: C.settings.light, glow: C.settings.glow,
    href: "/settings", actionKey: "tree.open",
    children: [
      { id: "account", labelKey: "tree.account", descKey: "tree.accountDesc", iconKey: "shield", color: C.account.main, colorLight: C.account.light, glow: C.account.glow, href: "/settings?tab=account", actionKey: "tree.open" },
      { id: "preferences", labelKey: "tree.preferences", descKey: "tree.preferencesDesc", iconKey: "settings", color: C.preferences.main, colorLight: C.preferences.light, glow: C.preferences.glow, href: "/settings?tab=preferences", actionKey: "tree.open" },
    ],
  },
  {
    id: "about", labelKey: "tree.about", descKey: "tree.aboutDesc",
    iconKey: "info", color: C.about.main, colorLight: C.about.light, glow: C.about.glow,
    href: "/about", actionKey: "tree.learn",
    children: [
      { id: "mission", labelKey: "tree.mission", descKey: "tree.missionDesc", iconKey: "heart", color: C.mission.main, colorLight: C.mission.light, glow: C.mission.glow, href: "/about#mission", actionKey: "tree.learn" },
      { id: "charter", labelKey: "tree.charter", descKey: "tree.charterDesc", iconKey: "fileText", color: C.charter.main, colorLight: C.charter.light, glow: C.charter.glow, href: "/about#charter", actionKey: "tree.learn" },
    ],
  },
];

/* ═══════════════════════════════════════════════════════════
   Icon map
   ═══════════════════════════════════════════════════════════ */

const ICON_MAP: Record<string, React.ElementType> = {
  globe: Globe, landmark: Landmark, flag: Flag, users: Users,
  book: BookOpen, vote: Vote, message: MessageCircle, user: User,
  settings: Settings, info: Info, search: Search, briefcase: Briefcase,
  scale: Scale, bell: Bell, heart: Heart, shield: Shield,
  fileText: FileText,
};

/* ═══════════════════════════════════════════════════════════
   Geometry helpers — radial layout
   ═══════════════════════════════════════════════════════════ */

interface LayoutNode {
  node: TreeNode;
  x: number;
  y: number;
  level: number;
  parentX?: number;
  parentY?: number;
}

function computeLayout(
  tree: TreeNode[],
  maxDepth: number,
  centerX: number,
  centerY: number,
  radius1: number,
  radius2: number,
): LayoutNode[] {
  const result: LayoutNode[] = [];
  const n = tree.length;

  tree.forEach((node, i) => {
    // Distribute L1 nodes evenly around the circle, starting from top (-90°)
    const angle = ((2 * Math.PI) / n) * i - Math.PI / 2;
    const x = centerX + radius1 * Math.cos(angle);
    const y = centerY + radius1 * Math.sin(angle);
    result.push({ node, x, y, level: 1, parentX: centerX, parentY: centerY });

    if (maxDepth >= 2 && node.children) {
      const childCount = node.children.length;
      // Spread children in a small arc centered on parent angle
      const arcSpread = Math.min(0.35, (0.8 / n));
      node.children.forEach((child, ci) => {
        const offset = childCount === 1
          ? 0
          : (ci / (childCount - 1) - 0.5) * arcSpread * 2 * Math.PI;
        const childAngle = angle + offset;
        const cx = centerX + radius2 * Math.cos(childAngle);
        const cy = centerY + radius2 * Math.sin(childAngle);
        result.push({ node: child, x: cx, y: cy, level: 2, parentX: x, parentY: y });
      });
    }
  });

  return result;
}

/* ═══════════════════════════════════════════════════════════
   SVG curved branch
   ═══════════════════════════════════════════════════════════ */

function Branch({
  x1, y1, x2, y2, color, active, visible, level,
}: {
  x1: number; y1: number; x2: number; y2: number;
  color: string; active: boolean; visible: boolean; level: number;
}) {
  // Curved path: control point at midpoint shifted towards center
  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2;
  const d = `M ${x1} ${y1} Q ${mx} ${my}, ${x2} ${y2}`;

  return (
    <path
      d={d}
      fill="none"
      stroke={color}
      strokeWidth={active ? (level === 1 ? 2.5 : 2) : (level === 1 ? 1.8 : 1.2)}
      strokeLinecap="round"
      opacity={visible ? (active ? 0.85 : 0.3) : 0}
      style={{
        transition: "all 0.5s ease",
        filter: active ? `drop-shadow(0 0 6px ${color})` : "none",
      }}
    />
  );
}

/* ═══════════════════════════════════════════════════════════
   Node card component
   ═══════════════════════════════════════════════════════════ */

function NodeCard({
  layoutNode,
  hovered,
  onHover,
  isGuest,
  visible,
}: {
  layoutNode: LayoutNode;
  hovered: string | null;
  onHover: (id: string | null) => void;
  isGuest: boolean;
  visible: boolean;
}) {
  const { t } = useLanguage();
  const router = useRouter();
  const { node, x, y, level } = layoutNode;
  const Icon = ICON_MAP[node.iconKey] || Globe;
  const isHovered = hovered === node.id;
  const isParentHovered = hovered !== null && node.id !== hovered &&
    TREE.some(b => b.id === hovered && b.children?.some(c => c.id === node.id));
  const isFaded = hovered !== null && !isHovered && !isParentHovered;

  const isL1 = level === 1;
  const cardW = isL1 ? 140 : 120;
  const cardH = isL1 ? 100 : 72;

  return (
    <div
      className="absolute"
      style={{
        left: x - cardW / 2,
        top: y - cardH / 2,
        width: cardW,
        zIndex: isHovered ? 20 : (isL1 ? 10 : 5),
      }}
      onMouseEnter={() => onHover(node.id)}
      onMouseLeave={() => onHover(null)}
      onTouchStart={() => onHover(node.id)}
    >
      <div
        className="cursor-pointer rounded-xl border transition-all duration-300"
        onClick={() => router.push(node.href)}
        style={{
          padding: isL1 ? "12px" : "8px 10px",
          opacity: visible ? (isFaded ? 0.5 : 1) : 0,
          transform: visible
            ? `scale(${isHovered ? 1.08 : 1})`
            : "scale(0.7)",
          borderColor: isHovered ? node.color : "var(--border)",
          backgroundColor: "var(--card)",
          boxShadow: isHovered
            ? `0 0 20px ${node.glow}, 0 8px 24px rgba(0,0,0,0.12)`
            : "0 1px 4px rgba(0,0,0,0.06)",
          transition: "all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)",
        }}
      >
        {/* Icon + Label */}
        <div className="flex items-center gap-2 mb-1">
          <div
            className="shrink-0 rounded-lg flex items-center justify-center transition-transform duration-300"
            style={{
              width: isL1 ? 32 : 26,
              height: isL1 ? 32 : 26,
              background: `linear-gradient(135deg, ${node.color}, ${node.colorLight})`,
              transform: isHovered ? "scale(1.12)" : "scale(1)",
            }}
          >
            <Icon
              className="text-white"
              style={{ width: isL1 ? 16 : 13, height: isL1 ? 16 : 13 }}
              strokeWidth={2}
            />
          </div>
          <span
            className="font-bold leading-tight truncate"
            style={{
              fontSize: isL1 ? 13 : 11,
              color: "var(--foreground)",
            }}
          >
            {t(node.labelKey)}
          </span>
        </div>

        {/* Description (L1 only, on hover show full; otherwise truncated) */}
        {isL1 && (
          <p
            className="leading-snug line-clamp-2"
            style={{
              fontSize: 11,
              color: "var(--muted-foreground)",
              marginTop: 2,
            }}
          >
            {t(node.descKey)}
          </p>
        )}

        {/* Action button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            router.push(node.actionHref || node.href);
          }}
          className="mt-1.5 flex items-center gap-1 text-white font-semibold rounded-full transition-all duration-200 hover:brightness-110 active:scale-95"
          style={{
            fontSize: isL1 ? 10 : 9,
            padding: isL1 ? "3px 8px" : "2px 6px",
            background: `linear-gradient(135deg, ${node.color}, ${node.colorLight})`,
          }}
        >
          <ChevronRight style={{ width: isL1 ? 10 : 8, height: isL1 ? 10 : 8 }} />
          {t(node.actionKey)}
        </button>
      </div>

      {/* Create New badge */}
      {node.canCreate && !isGuest && node.createHref && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            router.push(node.createHref!);
          }}
          className="absolute -bottom-2 -right-2 flex items-center gap-0.5 px-2 py-0.5 rounded-full text-white font-semibold shadow-lg transition-all duration-200 hover:scale-105 active:scale-95 z-20"
          style={{
            fontSize: 9,
            background: `linear-gradient(135deg, ${node.color}, ${node.colorLight})`,
            boxShadow: `0 2px 8px ${node.glow}`,
            opacity: visible ? 1 : 0,
          }}
          title={t("tree.createNew")}
        >
          <Plus style={{ width: 9, height: 9 }} />
          {t("tree.createNew")}
        </button>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   Main PangeaTree component
   ═══════════════════════════════════════════════════════════ */

interface PangeaTreeProps {
  isGuest: boolean;
}

export default function PangeaTree({ isGuest }: PangeaTreeProps) {
  const { t } = useLanguage();
  const containerRef = useRef<HTMLDivElement>(null);

  // State
  const [visible, setVisible] = useState(false);
  const [hovered, setHovered] = useState<string | null>(null);
  const [depth, setDepth] = useState(1);         // 1 = L1 only, 2 = L1+L2
  const [rotX, setRotX] = useState(0);            // 3D rotation X (deg)
  const [rotY, setRotY] = useState(0);            // 3D rotation Y (deg)
  const [zoom, setZoom] = useState(1);            // zoom scale
  const [dragging, setDragging] = useState(false);
  const lastPointer = useRef({ x: 0, y: 0 });

  // Responsive sizing
  const [sceneSize, setSceneSize] = useState({ w: 800, h: 800 });

  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), 100);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    function handleResize() {
      const w = Math.min(window.innerWidth - 32, 900);
      const h = Math.min(w, 800);
      setSceneSize({ w, h });
    }
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Layout computation
  const layout = useMemo(() => {
    const cx = sceneSize.w / 2;
    const cy = sceneSize.h / 2;
    const r1 = Math.min(sceneSize.w, sceneSize.h) * 0.3;
    const r2 = Math.min(sceneSize.w, sceneSize.h) * 0.47;
    return computeLayout(TREE, depth, cx, cy, r1, r2);
  }, [depth, sceneSize]);

  /* ── Drag handlers (mouse + touch) ── */

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    // Don't start drag on interactive elements
    if ((e.target as HTMLElement).closest("button, a")) return;
    setDragging(true);
    lastPointer.current = { x: e.clientX, y: e.clientY };
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  }, []);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragging) return;
    const dx = e.clientX - lastPointer.current.x;
    const dy = e.clientY - lastPointer.current.y;
    lastPointer.current = { x: e.clientX, y: e.clientY };
    setRotY(prev => prev + dx * 0.3);
    setRotX(prev => Math.max(-40, Math.min(40, prev - dy * 0.3)));
  }, [dragging]);

  const onPointerUp = useCallback(() => {
    setDragging(false);
  }, []);

  /* ── Scroll zoom ── */
  const onWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    setZoom(prev => Math.max(0.5, Math.min(1.8, prev - e.deltaY * 0.001)));
  }, []);

  /* ── Reset view ── */
  const resetView = useCallback(() => {
    setRotX(0);
    setRotY(0);
    setZoom(1);
  }, []);

  const cx = sceneSize.w / 2;
  const cy = sceneSize.h / 2;

  return (
    <div className="relative w-full flex flex-col items-center">
      {/* ── Controls bar ── */}
      <div className="flex items-center gap-2 mb-4 z-30 relative">
        {/* Depth controls */}
        <div className="flex items-center gap-1 rounded-full px-3 py-1.5 border"
          style={{ backgroundColor: "var(--card)", borderColor: "var(--border)" }}
        >
          <Layers className="w-3.5 h-3.5" style={{ color: "var(--muted-foreground)" }} />
          <button
            onClick={() => setDepth(d => Math.max(1, d - 1))}
            disabled={depth <= 1}
            className="w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold transition-colors disabled:opacity-30"
            style={{ color: "var(--foreground)" }}
            aria-label={t("tree.lessDepth")}
          >
            −
          </button>
          <span className="text-xs font-medium px-1" style={{ color: "var(--foreground)" }}>
            {depth}
          </span>
          <button
            onClick={() => setDepth(d => Math.min(2, d + 1))}
            disabled={depth >= 2}
            className="w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold transition-colors disabled:opacity-30"
            style={{ color: "var(--foreground)" }}
            aria-label={t("tree.moreDepth")}
          >
            +
          </button>
        </div>

        {/* Zoom controls */}
        <div className="flex items-center gap-1 rounded-full px-2 py-1.5 border"
          style={{ backgroundColor: "var(--card)", borderColor: "var(--border)" }}
        >
          <button
            onClick={() => setZoom(z => Math.max(0.5, z - 0.15))}
            className="w-6 h-6 rounded-full flex items-center justify-center transition-colors hover:bg-black/5"
            aria-label="Zoom out"
          >
            <ZoomOut className="w-3.5 h-3.5" style={{ color: "var(--foreground)" }} />
          </button>
          <button
            onClick={() => setZoom(z => Math.min(1.8, z + 0.15))}
            className="w-6 h-6 rounded-full flex items-center justify-center transition-colors hover:bg-black/5"
            aria-label="Zoom in"
          >
            <ZoomIn className="w-3.5 h-3.5" style={{ color: "var(--foreground)" }} />
          </button>
        </div>

        {/* Reset */}
        <button
          onClick={resetView}
          className="w-8 h-8 rounded-full flex items-center justify-center border transition-colors hover:bg-black/5"
          style={{ backgroundColor: "var(--card)", borderColor: "var(--border)" }}
          aria-label={t("tree.resetView")}
          title={t("tree.resetView")}
        >
          <RotateCcw className="w-3.5 h-3.5" style={{ color: "var(--foreground)" }} />
        </button>
      </div>

      {/* ── 3D Scene ── */}
      <div
        ref={containerRef}
        className="relative select-none"
        style={{
          width: sceneSize.w,
          height: sceneSize.h,
          perspective: "1200px",
          cursor: dragging ? "grabbing" : "grab",
        }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onWheel={onWheel}
      >
        <div
          className="absolute inset-0"
          style={{
            transformStyle: "preserve-3d",
            transform: `rotateX(${rotX}deg) rotateY(${rotY}deg) scale(${zoom})`,
            transition: dragging ? "none" : "transform 0.3s ease-out",
          }}
        >
          {/* ── SVG layer for branches ── */}
          <svg
            className="absolute inset-0 w-full h-full pointer-events-none"
            viewBox={`0 0 ${sceneSize.w} ${sceneSize.h}`}
            style={{ zIndex: 1 }}
          >
            {layout.map((ln) => {
              if (ln.parentX === undefined || ln.parentY === undefined) return null;
              return (
                <Branch
                  key={`branch-${ln.node.id}`}
                  x1={ln.parentX}
                  y1={ln.parentY}
                  x2={ln.x}
                  y2={ln.y}
                  color={ln.node.color}
                  active={hovered === ln.node.id ||
                    (ln.level === 2 && TREE.some(b => b.id === hovered && b.children?.some(c => c.id === ln.node.id))) ||
                    (ln.level === 1 && TREE.find(b => b.id === ln.node.id)?.children?.some(c => c.id === hovered) === true)
                  }
                  visible={visible}
                  level={ln.level}
                />
              );
            })}
          </svg>

          {/* ── Central Globe ── */}
          <div
            className="absolute flex flex-col items-center"
            style={{
              left: cx - 52,
              top: cy - 52,
              width: 104,
              zIndex: 15,
              opacity: visible ? 1 : 0,
              transform: visible ? "scale(1)" : "scale(0.5)",
              transition: "all 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)",
            }}
          >
            {/* Pulsing aura */}
            <div
              className="absolute rounded-full"
              style={{
                width: 104,
                height: 104,
                background: "radial-gradient(circle, rgba(37,99,235,0.12) 0%, transparent 70%)",
                animation: visible ? "globePulse 3s ease-in-out infinite" : "none",
              }}
            />
            {/* Globe circle */}
            <div
              className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-full flex items-center justify-center border-2"
              style={{
                background: "linear-gradient(135deg, #2563eb, #1d4ed8, #1e40af)",
                borderColor: "rgba(59,130,246,0.3)",
                boxShadow: "0 0 40px rgba(37,99,235,0.3), 0 8px 32px rgba(0,0,0,0.2)",
              }}
            >
              <Globe className="w-10 h-10 sm:w-12 sm:h-12 text-white" strokeWidth={1.5} />
            </div>
            {/* Title */}
            <h1
              className="text-lg sm:text-xl font-extrabold tracking-tight mt-1"
              style={{ color: "var(--foreground)" }}
            >
              PANGEA
            </h1>
            <p className="text-[10px] sm:text-xs text-center max-w-[160px]"
              style={{ color: "var(--muted-foreground)" }}
            >
              {t("tree.subtitle")}
            </p>
            {!isGuest && (
              <div
                className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full"
                style={{
                  fontSize: 9,
                  backgroundColor: "color-mix(in srgb, var(--primary) 10%, transparent)",
                  color: "var(--primary)",
                }}
              >
                <Sparkles style={{ width: 9, height: 9 }} />
                {t("tree.welcomeBack")}
              </div>
            )}
          </div>

          {/* ── Node cards ── */}
          {layout.map((ln) => (
            <NodeCard
              key={ln.node.id}
              layoutNode={ln}
              hovered={hovered}
              onHover={setHovered}
              isGuest={isGuest}
              visible={visible}
            />
          ))}
        </div>
      </div>

      {/* Drag hint */}
      <p className="text-[10px] mt-2" style={{ color: "var(--muted-foreground)" }}>
        {t("tree.dragHint")}
      </p>

      {/* ── Animations ── */}
      <style jsx global>{`
        @keyframes globePulse {
          0%, 100% { transform: scale(1); opacity: 0.12; }
          50% { transform: scale(1.8); opacity: 0; }
        }
      `}</style>
    </div>
  );
}

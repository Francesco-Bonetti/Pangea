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

interface Vec3 {
  x: number;
  y: number;
  z: number;
}

interface LayoutNode3D {
  node: TreeNode;
  pos: Vec3;        // 3D position in scene space
  level: number;
  parentId?: string; // for branch drawing
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
  jurisdictions: { main: "#1d4ed8", light: "#3b82f6", glow: "rgba(29,78,216,0.25)" },
  parties:       { main: "#dc2626", light: "#ef4444", glow: "rgba(220,38,38,0.25)" },
  communities:   { main: "#7c3aed", light: "#a78bfa", glow: "rgba(124,58,237,0.25)" },
  workingGroups: { main: "#0d9488", light: "#2dd4bf", glow: "rgba(13,148,136,0.25)" },
  religions:     { main: "#0f766e", light: "#5eead4", glow: "rgba(15,118,110,0.25)" },
  browseLaws:    { main: "#b45309", light: "#f59e0b", glow: "rgba(180,83,9,0.25)" },
  proposeLaw:    { main: "#ea580c", light: "#fb923c", glow: "rgba(234,88,12,0.25)" },
  proposals:     { main: "#c2410c", light: "#fb923c", glow: "rgba(194,65,12,0.25)" },
  activeProposals: { main: "#ea580c", light: "#fdba74", glow: "rgba(234,88,12,0.25)" },
  curation:      { main: "#9a3412", light: "#f97316", glow: "rgba(154,52,18,0.25)" },
  archiveProposals: { main: "#78350f", light: "#d97706", glow: "rgba(120,53,15,0.25)" },
  discussions:   { main: "#be185d", light: "#f472b6", glow: "rgba(190,24,93,0.25)" },
  channels:      { main: "#9d174d", light: "#ec4899", glow: "rgba(157,23,77,0.25)" },
  activeElections: { main: "#047857", light: "#34d399", glow: "rgba(4,120,87,0.25)" },
  pastResults:   { main: "#065f46", light: "#6ee7b7", glow: "rgba(6,95,70,0.25)" },
  profile:       { main: "#6d28d9", light: "#a78bfa", glow: "rgba(109,40,217,0.25)" },
  messages:      { main: "#7e22ce", light: "#c084fc", glow: "rgba(126,34,206,0.25)" },
  feed:          { main: "#5b21b6", light: "#a78bfa", glow: "rgba(91,33,182,0.25)" },
  delegations:   { main: "#4c1d95", light: "#8b5cf6", glow: "rgba(76,29,149,0.25)" },
  positions:     { main: "#6d28d9", light: "#c4b5fd", glow: "rgba(109,40,217,0.25)" },
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
      { id: "religions", labelKey: "tree.religions", descKey: "tree.religionsDesc", iconKey: "heart", color: C.religions.main, colorLight: C.religions.light, glow: C.religions.glow, href: "/groups?type=religion", actionKey: "tree.browse", canCreate: true, createHref: "/groups?type=religion&create=1" },
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
    id: "proposals", labelKey: "tree.proposals", descKey: "tree.proposalsDesc",
    iconKey: "fileText", color: C.proposals.main, colorLight: C.proposals.light, glow: C.proposals.glow,
    href: "/proposals", actionKey: "tree.explore",
    children: [
      { id: "activeProposals", labelKey: "tree.activeProposals", descKey: "tree.activeProposalsDesc", iconKey: "vote", color: C.activeProposals.main, colorLight: C.activeProposals.light, glow: C.activeProposals.glow, href: "/proposals?status=active", actionKey: "tree.browse" },
      { id: "curation", labelKey: "tree.curation", descKey: "tree.curationDesc", iconKey: "search", color: C.curation.main, colorLight: C.curation.light, glow: C.curation.glow, href: "/proposals?status=curation", actionKey: "tree.browse" },
      { id: "archiveProposals", labelKey: "tree.archiveProposals", descKey: "tree.archiveProposalsDesc", iconKey: "book", color: C.archiveProposals.main, colorLight: C.archiveProposals.light, glow: C.archiveProposals.glow, href: "/proposals?status=closed", actionKey: "tree.browse" },
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
    href: "/settings", actionKey: "tree.open",
    children: [
      { id: "profile", labelKey: "tree.profile", descKey: "tree.profileDesc", iconKey: "user", color: C.profile.main, colorLight: C.profile.light, glow: C.profile.glow, href: "/settings", actionKey: "tree.open" },
      { id: "messagesNode", labelKey: "tree.messages", descKey: "tree.messagesDesc", iconKey: "message", color: C.messages.main, colorLight: C.messages.light, glow: C.messages.glow, href: "/messages", actionKey: "tree.open" },
      { id: "feedNode", labelKey: "tree.feed", descKey: "tree.feedDesc", iconKey: "bell", color: C.feed.main, colorLight: C.feed.light, glow: C.feed.glow, href: "/feed", actionKey: "tree.open" },
      { id: "delegationsNode", labelKey: "tree.delegations", descKey: "tree.delegationsDesc", iconKey: "users", color: C.delegations.main, colorLight: C.delegations.light, glow: C.delegations.glow, href: "/dashboard/delegations", actionKey: "tree.open" },
      { id: "positions", labelKey: "tree.positions", descKey: "tree.positionsDesc", iconKey: "shield", color: C.positions.main, colorLight: C.positions.light, glow: C.positions.glow, href: "/admin", actionKey: "tree.open" },
      { id: "settingsNode", labelKey: "tree.settings", descKey: "tree.settingsDesc", iconKey: "settings", color: C.settings.main, colorLight: C.settings.light, glow: C.settings.glow, href: "/settings", actionKey: "tree.open" },
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
   3D Math: rotation matrix + perspective projection
   ═══════════════════════════════════════════════════════════ */

const DEG = Math.PI / 180;

/** Rotate point by rotX (pitch) then rotY (yaw) — in radians */
function rotate3D(p: Vec3, rx: number, ry: number): Vec3 {
  // Rotate around X
  const cosX = Math.cos(rx), sinX = Math.sin(rx);
  const y1 = p.y * cosX - p.z * sinX;
  const z1 = p.y * sinX + p.z * cosX;
  // Rotate around Y
  const cosY = Math.cos(ry), sinY = Math.sin(ry);
  const x2 = p.x * cosY + z1 * sinY;
  const z2 = -p.x * sinY + z1 * cosY;
  return { x: x2, y: y1, z: z2 };
}

/** Project 3D point to 2D screen coords with perspective */
function project(p: Vec3, perspective: number, cx: number, cy: number): { sx: number; sy: number; scale: number } {
  const d = perspective + p.z;
  const scale = d > 10 ? perspective / d : 0.01;
  return {
    sx: cx + p.x * scale,
    sy: cy + p.y * scale,
    scale,
  };
}

/* ═══════════════════════════════════════════════════════════
   3D Layout: spherical positioning
   ═══════════════════════════════════════════════════════════ */

function computeLayout3D(tree: TreeNode[], maxDepth: number, r1: number, r2: number): LayoutNode3D[] {
  const result: LayoutNode3D[] = [];
  const n = tree.length;

  tree.forEach((node, i) => {
    // L1: horizontal ring around Y axis, slightly tilted for visual depth
    const angle = (2 * Math.PI / n) * i;
    const tilt = Math.sin(angle * 2) * 0.15; // subtle vertical variation
    const pos: Vec3 = {
      x: r1 * Math.cos(angle),
      y: r1 * tilt,
      z: r1 * Math.sin(angle),
    };
    result.push({ node, pos, level: 1 });

    if (maxDepth >= 2 && node.children) {
      const childCount = node.children.length;
      const arcSpread = Math.min(0.4, 0.9 / n);
      node.children.forEach((child, ci) => {
        const offset = childCount === 1
          ? 0
          : (ci / (childCount - 1) - 0.5) * arcSpread * 2 * Math.PI;
        const childAngle = angle + offset;
        // L2: further out, slightly lower
        const childPos: Vec3 = {
          x: r2 * Math.cos(childAngle),
          y: r2 * tilt - 15 + ci * 10,
          z: r2 * Math.sin(childAngle),
        };
        result.push({ node: child, pos: childPos, level: 2, parentId: node.id });
      });
    }
  });

  return result;
}

/* ═══════════════════════════════════════════════════════════
   Node Card — always faces viewer (billboard)
   ═══════════════════════════════════════════════════════════ */

function NodeCard3D({
  ln,
  sx, sy, depthScale,
  hovered,
  onHover,
  isGuest,
  visible,
}: {
  ln: LayoutNode3D;
  sx: number;
  sy: number;
  depthScale: number;
  hovered: string | null;
  onHover: (id: string | null) => void;
  isGuest: boolean;
  visible: boolean;
}) {
  const { t } = useLanguage();
  const router = useRouter();
  const { node, level } = ln;
  const Icon = ICON_MAP[node.iconKey] || Globe;
  const isHovered = hovered === node.id;
  const isFaded = hovered !== null && !isHovered;
  const isL1 = level === 1;

  // Scale cards by perspective depth
  const cardScale = Math.max(0.4, Math.min(1.2, depthScale));
  const baseW = isL1 ? 140 : 115;
  const w = baseW * cardScale;

  return (
    <div
      className="absolute"
      style={{
        left: sx - w / 2,
        top: sy - (isL1 ? 30 : 20) * cardScale,
        width: w,
        zIndex: Math.round(depthScale * 100),
        pointerEvents: depthScale < 0.3 ? "none" : "auto",
      }}
      onMouseEnter={() => onHover(node.id)}
      onMouseLeave={() => onHover(null)}
      onTouchStart={() => onHover(node.id)}
    >
      <div
        className="cursor-pointer rounded-xl border transition-all duration-200"
        onClick={() => router.push(node.href)}
        style={{
          padding: `${(isL1 ? 10 : 7) * cardScale}px`,
          opacity: visible ? (isFaded ? 0.45 : Math.max(0.3, depthScale)) : 0,
          transform: `scale(${isHovered ? 1.1 : 1})`,
          borderColor: isHovered ? node.color : "var(--border)",
          backgroundColor: "var(--card)",
          boxShadow: isHovered
            ? `0 0 20px ${node.glow}, 0 8px 24px rgba(0,0,0,0.12)`
            : "0 1px 4px rgba(0,0,0,0.06)",
          transition: "transform 0.2s ease, opacity 0.4s ease, border-color 0.2s ease, box-shadow 0.2s ease",
        }}
      >
        {/* Icon + Label */}
        <div className="flex items-center gap-2 mb-1">
          <div
            className="shrink-0 rounded-lg flex items-center justify-center"
            style={{
              width: (isL1 ? 28 : 22) * cardScale,
              height: (isL1 ? 28 : 22) * cardScale,
              background: `linear-gradient(135deg, ${node.color}, ${node.colorLight})`,
            }}
          >
            <Icon
              className="text-white"
              style={{
                width: (isL1 ? 14 : 11) * cardScale,
                height: (isL1 ? 14 : 11) * cardScale,
              }}
              strokeWidth={2}
            />
          </div>
          <span
            className="font-bold leading-tight truncate"
            style={{
              fontSize: Math.max(9, (isL1 ? 12 : 10) * cardScale),
              color: "var(--foreground)",
            }}
          >
            {t(node.labelKey)}
          </span>
        </div>

        {/* Description (L1 only) */}
        {isL1 && cardScale > 0.6 && (
          <p
            className="leading-snug line-clamp-2"
            style={{
              fontSize: Math.max(8, 10 * cardScale),
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
          className="mt-1 flex items-center gap-0.5 text-white font-semibold rounded-full hover:brightness-110 active:scale-95"
          style={{
            fontSize: Math.max(8, (isL1 ? 10 : 9) * cardScale),
            padding: `${2 * cardScale}px ${6 * cardScale}px`,
            background: `linear-gradient(135deg, ${node.color}, ${node.colorLight})`,
          }}
        >
          <ChevronRight style={{ width: 8 * cardScale, height: 8 * cardScale }} />
          {t(node.actionKey)}
        </button>
      </div>

      {/* Create New badge */}
      {node.canCreate && !isGuest && node.createHref && cardScale > 0.5 && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            router.push(node.createHref!);
          }}
          className="absolute -bottom-2 -right-2 flex items-center gap-0.5 px-2 py-0.5 rounded-full text-white font-semibold shadow-lg hover:scale-105 active:scale-95 z-20"
          style={{
            fontSize: 9 * cardScale,
            background: `linear-gradient(135deg, ${node.color}, ${node.colorLight})`,
            boxShadow: `0 2px 8px ${node.glow}`,
            opacity: visible ? 1 : 0,
          }}
          title={t("tree.createNew")}
        >
          <Plus style={{ width: 9 * cardScale, height: 9 * cardScale }} />
          {t("tree.createNew")}
        </button>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   Main PangeaTree component — true 3D
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
  const [depth, setDepth] = useState(1);
  const [rotX, setRotX] = useState(-10);       // slight pitch for perspective feel
  const [rotY, setRotY] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [dragging, setDragging] = useState(false);
  const lastPointer = useRef({ x: 0, y: 0 });

  // Responsive scene size
  const [sceneW, setSceneW] = useState(800);
  const [sceneH, setSceneH] = useState(700);

  const PERSPECTIVE = 800;

  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), 100);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    function handleResize() {
      const w = Math.min(window.innerWidth - 32, 900);
      setSceneW(w);
      setSceneH(Math.min(w * 0.85, 750));
    }
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // 3D layout
  const r1 = Math.min(sceneW, sceneH) * 0.28 * zoom;
  const r2 = Math.min(sceneW, sceneH) * 0.46 * zoom;

  const layout3D = useMemo(
    () => computeLayout3D(TREE, depth, r1, r2),
    [depth, r1, r2],
  );

  // Build a map nodeId → LayoutNode3D for branch lookups
  const nodeMap = useMemo(() => {
    const map: Record<string, LayoutNode3D> = {};
    layout3D.forEach(ln => { map[ln.node.id] = ln; });
    return map;
  }, [layout3D]);

  // Project all nodes + globe center
  const rxRad = rotX * DEG;
  const ryRad = rotY * DEG;
  const cx = sceneW / 2;
  const cy = sceneH / 2;

  const projected = useMemo(() => {
    return layout3D.map(ln => {
      const rotated = rotate3D(ln.pos, rxRad, ryRad);
      const proj = project(rotated, PERSPECTIVE, cx, cy);
      return { ln, ...proj };
    });
  }, [layout3D, rxRad, ryRad, cx, cy]);

  // Globe center projection (always at origin)
  const globeProj = useMemo(() => {
    const rotated = rotate3D({ x: 0, y: 0, z: 0 }, rxRad, ryRad);
    return project(rotated, PERSPECTIVE, cx, cy);
  }, [rxRad, ryRad, cx, cy]);

  /* ── Drag handlers ── */
  const onPointerDown = useCallback((e: React.PointerEvent) => {
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
    setRotY(prev => prev + dx * 0.4);
    setRotX(prev => Math.max(-60, Math.min(60, prev - dy * 0.4)));
  }, [dragging]);

  const onPointerUp = useCallback(() => setDragging(false), []);

  /* ── Scroll zoom ── */
  const onWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    setZoom(prev => Math.max(0.5, Math.min(2, prev - e.deltaY * 0.001)));
  }, []);

  const resetView = useCallback(() => {
    setRotX(-10);
    setRotY(0);
    setZoom(1);
  }, []);

  /* ── Sort by z-depth for correct layering ── */
  const sortedProjected = useMemo(
    () => [...projected].sort((a, b) => a.scale - b.scale),
    [projected],
  );

  return (
    <div className="relative w-full flex flex-col items-center">
      {/* ── Controls ── */}
      <div className="flex items-center gap-2 mb-3 z-30 relative">
        <div className="flex items-center gap-1 rounded-full px-3 py-1.5 border"
          style={{ backgroundColor: "var(--card)", borderColor: "var(--border)" }}>
          <Layers className="w-3.5 h-3.5" style={{ color: "var(--muted-foreground)" }} />
          <button onClick={() => setDepth(d => Math.max(1, d - 1))} disabled={depth <= 1}
            className="w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold disabled:opacity-30"
            style={{ color: "var(--foreground)" }} aria-label={t("tree.lessDepth")}>−</button>
          <span className="text-xs font-medium px-1" style={{ color: "var(--foreground)" }}>{depth}</span>
          <button onClick={() => setDepth(d => Math.min(2, d + 1))} disabled={depth >= 2}
            className="w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold disabled:opacity-30"
            style={{ color: "var(--foreground)" }} aria-label={t("tree.moreDepth")}>+</button>
        </div>

        <div className="flex items-center gap-1 rounded-full px-2 py-1.5 border"
          style={{ backgroundColor: "var(--card)", borderColor: "var(--border)" }}>
          <button onClick={() => setZoom(z => Math.max(0.5, z - 0.15))}
            className="w-6 h-6 rounded-full flex items-center justify-center hover:bg-black/5" aria-label="Zoom out">
            <ZoomOut className="w-3.5 h-3.5" style={{ color: "var(--foreground)" }} />
          </button>
          <button onClick={() => setZoom(z => Math.min(2, z + 0.15))}
            className="w-6 h-6 rounded-full flex items-center justify-center hover:bg-black/5" aria-label="Zoom in">
            <ZoomIn className="w-3.5 h-3.5" style={{ color: "var(--foreground)" }} />
          </button>
        </div>

        <button onClick={resetView}
          className="w-8 h-8 rounded-full flex items-center justify-center border hover:bg-black/5"
          style={{ backgroundColor: "var(--card)", borderColor: "var(--border)" }}
          aria-label={t("tree.resetView")} title={t("tree.resetView")}>
          <RotateCcw className="w-3.5 h-3.5" style={{ color: "var(--foreground)" }} />
        </button>
      </div>

      {/* ── 3D Scene ── */}
      <div
        ref={containerRef}
        className="relative select-none overflow-hidden"
        style={{
          width: sceneW,
          height: sceneH,
          cursor: dragging ? "grabbing" : "grab",
        }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onWheel={onWheel}
      >
        {/* ── SVG branches (projected 2D) ── */}
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none"
          viewBox={`0 0 ${sceneW} ${sceneH}`}
          style={{ zIndex: 1 }}
        >
          {projected.map(({ ln, sx, sy, scale }) => {
            // Branch from parent (or globe center) to this node
            let psx: number, psy: number;
            if (ln.parentId && nodeMap[ln.parentId]) {
              const parent = nodeMap[ln.parentId];
              const pRot = rotate3D(parent.pos, rxRad, ryRad);
              const pProj = project(pRot, PERSPECTIVE, cx, cy);
              psx = pProj.sx;
              psy = pProj.sy;
            } else if (ln.level === 1) {
              psx = globeProj.sx;
              psy = globeProj.sy;
            } else {
              return null;
            }

            const isActive =
              hovered === ln.node.id ||
              (ln.parentId && hovered === ln.parentId) ||
              (ln.level === 1 && TREE.find(b => b.id === ln.node.id)?.children?.some(c => c.id === hovered));

            // Quadratic bezier for gentle curve
            const mx = (psx + sx) / 2;
            const my = (psy + sy) / 2 - 10;
            const d = `M ${psx} ${psy} Q ${mx} ${my}, ${sx} ${sy}`;

            return (
              <path
                key={`br-${ln.node.id}`}
                d={d}
                fill="none"
                stroke={ln.node.color}
                strokeWidth={isActive ? 2.5 : 1.5}
                strokeLinecap="round"
                opacity={visible ? (isActive ? 0.8 : 0.25) : 0}
                style={{
                  transition: "opacity 0.3s, stroke-width 0.2s",
                  filter: isActive ? `drop-shadow(0 0 4px ${ln.node.color})` : "none",
                }}
              />
            );
          })}
        </svg>

        {/* ── Globe (projected center) ── */}
        <div
          className="absolute flex flex-col items-center"
          style={{
            left: globeProj.sx - 52,
            top: globeProj.sy - 52,
            width: 104,
            zIndex: Math.round(globeProj.scale * 100) + 1,
            opacity: visible ? 1 : 0,
            transform: visible ? `scale(${globeProj.scale})` : `scale(${globeProj.scale * 0.5})`,
            transition: "opacity 0.6s ease, transform 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)",
          }}
        >
          <div className="absolute rounded-full" style={{
            width: 104, height: 104,
            background: "radial-gradient(circle, rgba(37,99,235,0.12) 0%, transparent 70%)",
            animation: visible ? "globePulse 3s ease-in-out infinite" : "none",
          }} />
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
          <h1 className="text-base sm:text-lg font-extrabold tracking-tight mt-1"
            style={{ color: "var(--foreground)" }}>PANGEA</h1>
          <p className="text-[9px] sm:text-[10px] text-center max-w-[140px]"
            style={{ color: "var(--muted-foreground)" }}>{t("tree.subtitle")}</p>
          {!isGuest && (
            <div className="inline-flex items-center gap-1 mt-0.5 px-2 py-0.5 rounded-full"
              style={{ fontSize: 8, backgroundColor: "color-mix(in srgb, var(--primary) 10%, transparent)", color: "var(--primary)" }}>
              <Sparkles style={{ width: 8, height: 8 }} />
              {t("tree.welcomeBack")}
            </div>
          )}
        </div>

        {/* ── Node cards (sorted by z-depth, furthest first) ── */}
        {sortedProjected.map(({ ln, sx, sy, scale }) => (
          <NodeCard3D
            key={ln.node.id}
            ln={ln}
            sx={sx}
            sy={sy}
            depthScale={scale}
            hovered={hovered}
            onHover={setHovered}
            isGuest={isGuest}
            visible={visible}
          />
        ))}
      </div>

      {/* Drag hint */}
      <p className="text-[10px] mt-2" style={{ color: "var(--muted-foreground)" }}>
        {t("tree.dragHint")}
      </p>

      <style jsx global>{`
        @keyframes globePulse {
          0%, 100% { transform: scale(1); opacity: 0.12; }
          50% { transform: scale(1.8); opacity: 0; }
        }
      `}</style>
    </div>
  );
}

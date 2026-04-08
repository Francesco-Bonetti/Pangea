"use client";

import { useState, useEffect, useRef, useCallback, useMemo, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  Globe,
  Plus,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Layers,
  RotateCcw,
} from "lucide-react";
import { useLanguage } from "@/components/language-provider";
import { ICON_MAP, type PlatformTreeNode } from "@/lib/platform-nodes";

/* ═══════════════════════════════════════════════════════════
   Types
   ═══════════════════════════════════════════════════════════ */

interface Vec3 { x: number; y: number; z: number }

interface LayoutNode3D {
  node: PlatformTreeNode;
  pos: Vec3;
  level: number;
  parentId?: string;
}

/* ═══════════════════════════════════════════════════════════
   3D Math
   ═══════════════════════════════════════════════════════════ */

const DEG = Math.PI / 180;
const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5)); // ~2.399 rad

function rotate3D(p: Vec3, rx: number, ry: number): Vec3 {
  const cosX = Math.cos(rx), sinX = Math.sin(rx);
  const y1 = p.y * cosX - p.z * sinX;
  const z1 = p.y * sinX + p.z * cosX;
  const cosY = Math.cos(ry), sinY = Math.sin(ry);
  const x2 = p.x * cosY + z1 * sinY;
  const z2 = -p.x * sinY + z1 * cosY;
  return { x: x2, y: y1, z: z2 };
}

function project(p: Vec3, perspective: number, cx: number, cy: number) {
  const d = perspective + p.z;
  const scale = d > 10 ? perspective / d : 0.01;
  return { sx: cx + p.x * scale, sy: cy + p.y * scale, scale };
}

/* ═══════════════════════════════════════════════════════════
   Fibonacci Sphere Layout — TRUE 3D distribution
   Points are uniformly distributed on a sphere surface.
   When rotated, you see nodes in front, behind, above, below.
   ═══════════════════════════════════════════════════════════ */

function fibonacciSphere(n: number, radius: number, center: Vec3 = { x: 0, y: 0, z: 0 }): Vec3[] {
  if (n === 0) return [];
  if (n === 1) return [{ x: center.x + radius, y: center.y, z: center.z }];

  const points: Vec3[] = [];
  for (let i = 0; i < n; i++) {
    // y goes from +1 to -1 (top to bottom of sphere)
    const y = 1 - (2 * i) / (n - 1);
    const radiusAtY = Math.sqrt(1 - y * y);
    const theta = GOLDEN_ANGLE * i;
    points.push({
      x: center.x + radius * radiusAtY * Math.cos(theta),
      y: center.y + radius * y,
      z: center.z + radius * radiusAtY * Math.sin(theta),
    });
  }
  return points;
}

function computeLayout3D(
  tree: PlatformTreeNode[],
  maxDepth: number,
  r1: number,
  r2: number,
): LayoutNode3D[] {
  const result: LayoutNode3D[] = [];

  // Level 1: distribute root nodes on a sphere of radius r1
  const l1Positions = fibonacciSphere(tree.length, r1);

  tree.forEach((node, i) => {
    result.push({ node, pos: l1Positions[i], level: 1 });

    // Level 2: distribute children on a smaller sub-sphere centered on parent
    if (maxDepth >= 2 && node.children && node.children.length > 0) {
      const parentPos = l1Positions[i];
      // Direction from origin to parent — children cluster around parent
      const dist = Math.sqrt(parentPos.x ** 2 + parentPos.y ** 2 + parentPos.z ** 2) || 1;
      // Push children outward from parent along the same radial direction
      const pushX = (parentPos.x / dist) * (r2 - r1);
      const pushY = (parentPos.y / dist) * (r2 - r1);
      const pushZ = (parentPos.z / dist) * (r2 - r1);

      const childCenter: Vec3 = {
        x: parentPos.x + pushX * 0.5,
        y: parentPos.y + pushY * 0.5,
        z: parentPos.z + pushZ * 0.5,
      };

      const childRadius = r1 * 0.35; // sub-sphere smaller than main
      const childPositions = fibonacciSphere(node.children.length, childRadius, childCenter);

      node.children.forEach((child, ci) => {
        result.push({ node: child, pos: childPositions[ci], level: 2, parentId: node.id });
      });
    }
  });

  return result;
}

/* ═══════════════════════════════════════════════════════════
   Node Card — billboard (always faces viewer as HTML div)
   ═══════════════════════════════════════════════════════════ */

function NodeCard3D({
  ln, sx, sy, depthScale, hovered, onHover, isGuest, visible,
}: {
  ln: LayoutNode3D;
  sx: number; sy: number; depthScale: number;
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

  const cardScale = Math.max(0.35, Math.min(1.3, depthScale));
  const baseW = isL1 ? 140 : 110;
  const w = baseW * cardScale;

  // Depth-based opacity: nodes behind the sphere are more transparent
  const depthOpacity = Math.max(0.15, Math.min(1, depthScale * 1.1));

  return (
    <div
      className="absolute"
      style={{
        left: sx - w / 2,
        top: sy - (isL1 ? 30 : 20) * cardScale,
        width: w,
        zIndex: Math.round(depthScale * 1000),
        pointerEvents: depthScale < 0.35 ? "none" : "auto",
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
          opacity: visible ? (isFaded ? 0.3 : depthOpacity) : 0,
          transform: `scale(${isHovered ? 1.12 : 1})`,
          borderColor: isHovered ? node.color : "var(--border)",
          backgroundColor: "var(--card)",
          boxShadow: isHovered
            ? `0 0 24px ${node.glow}, 0 8px 24px rgba(0,0,0,0.15)`
            : "0 1px 4px rgba(0,0,0,0.06)",
          transition: "transform 0.2s ease, opacity 0.5s ease, border-color 0.2s ease, box-shadow 0.2s ease",
        }}
      >
        <div className="flex items-center gap-2 mb-1">
          <div
            className="shrink-0 rounded-lg flex items-center justify-center"
            style={{
              width: (isL1 ? 28 : 22) * cardScale,
              height: (isL1 ? 28 : 22) * cardScale,
              background: `linear-gradient(135deg, ${node.color}, ${node.colorLight})`,
            }}
          >
            <Icon className="text-white" style={{ width: (isL1 ? 14 : 11) * cardScale, height: (isL1 ? 14 : 11) * cardScale }} strokeWidth={2} />
          </div>
          <span className="font-bold leading-tight truncate" style={{ fontSize: Math.max(9, (isL1 ? 12 : 10) * cardScale), color: "var(--foreground)" }}>
            {t(node.labelKey)}
          </span>
        </div>

        {isL1 && cardScale > 0.55 && (
          <p className="leading-snug line-clamp-2" style={{ fontSize: Math.max(8, 10 * cardScale), color: "var(--muted-foreground)", marginTop: 2 }}>
            {t(node.descKey)}
          </p>
        )}

        <button
          onClick={(e) => { e.stopPropagation(); router.push(node.actionHref || node.href); }}
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

      {node.canCreate && !isGuest && node.createHref && cardScale > 0.5 && (
        <button
          onClick={(e) => { e.stopPropagation(); router.push(node.createHref!); }}
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
   TreeViewer3D — Generic reusable 3D tree viewer
   ═══════════════════════════════════════════════════════════ */

export interface TreeViewer3DProps {
  nodes: PlatformTreeNode[];
  isGuest?: boolean;
  /** Render prop for center content (e.g. globe orb). Receives `visible` for entrance animation. */
  centerContent?: (visible: boolean) => ReactNode;
  initialRotX?: number;
  initialRotY?: number;
  maxDepthLimit?: number;
}

export default function TreeViewer3D({
  nodes,
  isGuest = false,
  centerContent,
  initialRotX = -12,
  initialRotY = 25,
  maxDepthLimit = 2,
}: TreeViewer3DProps) {
  const { t } = useLanguage();
  const containerRef = useRef<HTMLDivElement>(null);

  const [visible, setVisible] = useState(false);
  const [hovered, setHovered] = useState<string | null>(null);
  const [depth, setDepth] = useState(1);
  const [rotX, setRotX] = useState(initialRotX);
  const [rotY, setRotY] = useState(initialRotY);
  const [zoom, setZoom] = useState(1);
  const [dragging, setDragging] = useState(false);
  const lastPointer = useRef({ x: 0, y: 0 });

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
      setSceneH(Math.min(w * 0.88, 780));
    }
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Sphere radii scale with scene size and zoom
  const baseR = Math.min(sceneW, sceneH) * 0.30 * zoom;
  const r1 = baseR;
  const r2 = baseR * 1.65;

  const layout3D = useMemo(() => computeLayout3D(nodes, depth, r1, r2), [nodes, depth, r1, r2]);

  const nodeMap = useMemo(() => {
    const map: Record<string, LayoutNode3D> = {};
    layout3D.forEach(ln => { map[ln.node.id] = ln; });
    return map;
  }, [layout3D]);

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

  const globeProj = useMemo(() => {
    return project(rotate3D({ x: 0, y: 0, z: 0 }, rxRad, ryRad), PERSPECTIVE, cx, cy);
  }, [rxRad, ryRad, cx, cy]);

  /* ── Drag ── */
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
    setRotX(prev => Math.max(-80, Math.min(80, prev - dy * 0.4)));
  }, [dragging]);

  const onPointerUp = useCallback(() => setDragging(false), []);

  const onWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    setZoom(prev => Math.max(0.4, Math.min(2.2, prev - e.deltaY * 0.001)));
  }, []);

  const resetView = useCallback(() => {
    setRotX(initialRotX);
    setRotY(initialRotY);
    setZoom(1);
  }, [initialRotX, initialRotY]);

  const sortedProjected = useMemo(
    () => [...projected].sort((a, b) => a.scale - b.scale),
    [projected],
  );

  return (
    <div className="relative w-full flex flex-col items-center">
      {/* Controls */}
      <div className="flex items-center gap-2 mb-3 z-30 relative">
        <div className="flex items-center gap-1 rounded-full px-3 py-1.5 border" style={{ backgroundColor: "var(--card)", borderColor: "var(--border)" }}>
          <Layers className="w-3.5 h-3.5" style={{ color: "var(--muted-foreground)" }} />
          <button onClick={() => setDepth(d => Math.max(1, d - 1))} disabled={depth <= 1}
            className="w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold disabled:opacity-30"
            style={{ color: "var(--foreground)" }} aria-label={t("tree.lessDepth")}>−</button>
          <span className="text-xs font-medium px-1" style={{ color: "var(--foreground)" }}>{depth}</span>
          <button onClick={() => setDepth(d => Math.min(maxDepthLimit, d + 1))} disabled={depth >= maxDepthLimit}
            className="w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold disabled:opacity-30"
            style={{ color: "var(--foreground)" }} aria-label={t("tree.moreDepth")}>+</button>
        </div>

        <div className="flex items-center gap-1 rounded-full px-2 py-1.5 border" style={{ backgroundColor: "var(--card)", borderColor: "var(--border)" }}>
          <button onClick={() => setZoom(z => Math.max(0.4, z - 0.15))}
            className="w-6 h-6 rounded-full flex items-center justify-center hover:bg-black/5" aria-label="Zoom out">
            <ZoomOut className="w-3.5 h-3.5" style={{ color: "var(--foreground)" }} />
          </button>
          <button onClick={() => setZoom(z => Math.min(2.2, z + 0.15))}
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

      {/* 3D Scene */}
      <div
        ref={containerRef}
        className="relative select-none overflow-hidden"
        style={{ width: sceneW, height: sceneH, cursor: dragging ? "grabbing" : "grab" }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onWheel={onWheel}
      >
        {/* SVG branches */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox={`0 0 ${sceneW} ${sceneH}`} style={{ zIndex: 1 }}>
          {projected.map(({ ln, sx, sy }) => {
            let psx: number, psy: number;
            if (ln.parentId && nodeMap[ln.parentId]) {
              const parent = nodeMap[ln.parentId];
              const pRot = rotate3D(parent.pos, rxRad, ryRad);
              const pProj = project(pRot, PERSPECTIVE, cx, cy);
              psx = pProj.sx; psy = pProj.sy;
            } else if (ln.level === 1) {
              psx = globeProj.sx; psy = globeProj.sy;
            } else {
              return null;
            }

            const isActive = hovered === ln.node.id
              || (ln.parentId && hovered === ln.parentId)
              || (ln.level === 1 && nodes.find(b => b.id === ln.node.id)?.children?.some(c => c.id === hovered));

            const mx = (psx + sx) / 2;
            const my = (psy + sy) / 2 - 8;
            const d = `M ${psx} ${psy} Q ${mx} ${my}, ${sx} ${sy}`;

            return (
              <path
                key={`br-${ln.node.id}`}
                d={d}
                fill="none"
                stroke={ln.node.color}
                strokeWidth={isActive ? 2.5 : 1.2}
                strokeLinecap="round"
                opacity={visible ? (isActive ? 0.85 : 0.2) : 0}
                style={{ transition: "opacity 0.3s, stroke-width 0.2s", filter: isActive ? `drop-shadow(0 0 4px ${ln.node.color})` : "none" }}
              />
            );
          })}
        </svg>

        {/* Center content (rendered via prop) */}
        {centerContent && (
          <div
            className="absolute flex flex-col items-center"
            style={{
              left: "50%",
              top: "50%",
              transform: "translate(-50%, -50%)",
              zIndex: Math.round(globeProj.scale * 1000) + 1,
            }}
          >
            {centerContent(visible)}
          </div>
        )}

        {/* Node cards (z-sorted) */}
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

      <p className="text-[10px] mt-2" style={{ color: "var(--muted-foreground)" }}>
        {t("tree.dragHint")}
      </p>
    </div>
  );
}

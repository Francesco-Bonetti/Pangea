"use client";

import {
  useState,
  useRef,
  useEffect,
  useCallback,
  useMemo,
  type ReactNode,
  type MouseEvent,
} from "react";
import { useRouter } from "next/navigation";
import { Globe, Plus, ChevronRight, Box } from "lucide-react";
import { useLanguage } from "@/components/language-provider";
import { ICON_MAP, type PlatformTreeNode } from "@/lib/platform-nodes";

/* ═══════════════════════════════════════════════════════════
   TreeViewer2D v2 — Generic horizontal tree with glassmorphism
   ─────────────────────────────────────────────────────────
   • Compact cards → root level fits on screen without scroll
   • Expand reveals children to the right
   • Breadcrumb trail for navigation context
   • Dimming of non-active siblings for visual focus
   • Reusable: works for any PlatformTreeNode[] data
   ═══════════════════════════════════════════════════════════ */

export interface TreeViewer2DProps {
  /** Tree data — any nested PlatformTreeNode array */
  nodes: PlatformTreeNode[];
  isGuest?: boolean;
  /** Callback to switch to 3D view */
  onToggle3D?: () => void;
  /** Custom root element (left of the tree) */
  rootContent?: () => ReactNode;
  /** Hide the breadcrumb (e.g. when used inside a section) */
  hideBreadcrumb?: boolean;
  /** Hide the 3D toggle button */
  hideToggle3D?: boolean;
}

/* ── Helpers ───────────────────────────────────────────── */

function buildLookup(
  nodes: PlatformTreeNode[],
  map: Map<string, PlatformTreeNode> = new Map(),
): Map<string, PlatformTreeNode> {
  for (const n of nodes) {
    map.set(n.id, n);
    if (n.children) buildLookup(n.children, map);
  }
  return map;
}

/* ── Compact Node Card ─────────────────────────────────── */

function TreeNodeCard({
  node,
  isExpanded,
  isDimmed,
  onToggleExpand,
  isGuest,
  enterDelay,
}: {
  node: PlatformTreeNode;
  isExpanded: boolean;
  isDimmed: boolean;
  onToggleExpand: () => void;
  isGuest: boolean;
  enterDelay: number;
}) {
  const { t } = useLanguage();
  const router = useRouter();
  const Icon = ICON_MAP[node.iconKey] || Globe;
  const hasChildren = (node.children?.length ?? 0) > 0;
  const childCount = node.children?.length ?? 0;
  const [hovered, setHovered] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const id = setTimeout(() => setVisible(true), enterDelay);
    return () => clearTimeout(id);
  }, [enterDelay]);

  const handleCardClick = useCallback(
    (e: MouseEvent) => {
      const t = e.target as HTMLElement;
      if (t.closest("[data-expand-btn]") || t.closest("[data-create-btn]")) return;
      router.push(node.actionHref || node.href);
    },
    [router, node.actionHref, node.href],
  );

  return (
    <div
      style={{
        opacity: visible ? (isDimmed ? 0.4 : 1) : 0,
        transform: visible
          ? isDimmed
            ? "scale(0.97)"
            : "translateX(0)"
          : "translateX(-10px)",
        transition: "all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)",
        filter: isDimmed ? "grayscale(0.25)" : "none",
        pointerEvents: isDimmed ? "none" as const : "auto" as const,
      }}
    >
      <div
        className="relative flex items-center gap-2.5 rounded-xl cursor-pointer"
        onClick={handleCardClick}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          width: 232,
          padding: "10px 10px 10px 14px",
          background: isExpanded
            ? `color-mix(in srgb, ${node.color} 6%, var(--card))`
            : "var(--card)",
          border: `1px solid ${
            isExpanded
              ? node.color + "45"
              : hovered
                ? node.color + "22"
                : "var(--border)"
          }`,
          boxShadow: isExpanded
            ? `0 4px 24px ${node.glow}, inset 0 1px 0 ${node.color}08`
            : hovered
              ? `0 4px 16px rgba(0,0,0,0.05), 0 0 0 1px ${node.color}0a`
              : "0 1px 3px rgba(0,0,0,0.02)",
          transform: hovered && !isExpanded ? "translateY(-1px)" : "none",
          transition: "all 0.22s cubic-bezier(0.4, 0, 0.2, 1)",
        }}
      >
        {/* Left accent bar */}
        <div
          className="absolute left-0 top-2.5 bottom-2.5 w-[3px] rounded-r-full"
          style={{
            background: `linear-gradient(180deg, ${node.color}, ${node.colorLight})`,
            opacity: isExpanded ? 1 : 0,
            transform: isExpanded ? "scaleY(1)" : "scaleY(0)",
            transition: "all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)",
            boxShadow: isExpanded ? `0 0 8px ${node.glow}` : "none",
          }}
        />

        {/* Icon badge */}
        <div
          className="shrink-0 w-9 h-9 rounded-lg flex items-center justify-center"
          style={{
            background: `linear-gradient(135deg, ${node.color}, ${node.colorLight})`,
            boxShadow: `0 2px 8px ${node.glow}`,
            transition: "transform 0.2s ease",
            transform: hovered ? "scale(1.06)" : "scale(1)",
          }}
        >
          <Icon className="w-[17px] h-[17px] text-white" strokeWidth={1.8} />
        </div>

        {/* Text */}
        <div className="min-w-0 flex-1">
          <span
            className="text-[13px] font-semibold leading-tight block truncate"
            style={{ color: "var(--foreground)" }}
          >
            {t(node.labelKey)}
          </span>
          <p
            className="text-[10px] leading-snug mt-0.5 truncate"
            style={{ color: "var(--muted-foreground)" }}
          >
            {t(node.descKey)}
          </p>
        </div>

        {/* Expand button + count */}
        {hasChildren && (
          <button
            data-expand-btn=""
            onClick={(e) => {
              e.stopPropagation();
              onToggleExpand();
            }}
            className="shrink-0 flex items-center gap-px h-7 rounded-lg transition-all duration-200 hover:scale-105 active:scale-95"
            style={{
              padding: isExpanded ? "0 6px" : "0 5px 0 7px",
              backgroundColor: isExpanded
                ? node.color
                : "color-mix(in srgb, var(--foreground) 5%, transparent)",
              color: isExpanded ? "#fff" : "var(--muted-foreground)",
              boxShadow: isExpanded ? `0 2px 8px ${node.glow}` : "none",
            }}
            title={t("tree.expandBranch")}
          >
            {!isExpanded && (
              <span className="text-[10px] font-medium tabular-nums">
                {childCount}
              </span>
            )}
            <ChevronRight
              className="w-3.5 h-3.5 transition-transform duration-300"
              style={{
                transform: isExpanded ? "rotate(90deg)" : "rotate(0deg)",
              }}
            />
          </button>
        )}

        {/* Navigate hint on hover */}
        {!hasChildren && hovered && (
          <ChevronRight
            className="shrink-0 w-4 h-4"
            style={{
              color: node.color,
              opacity: 0.6,
              animation: "fadeIn 0.15s ease",
            }}
          />
        )}

        {/* Create badge */}
        {node.canCreate && !isGuest && node.createHref && (
          <button
            data-create-btn=""
            onClick={(e) => {
              e.stopPropagation();
              router.push(node.createHref!);
            }}
            className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full flex items-center justify-center text-white shadow-md hover:scale-110 active:scale-95 z-10 transition-transform duration-200"
            style={{
              background: `linear-gradient(135deg, ${node.color}, ${node.colorLight})`,
              boxShadow: `0 2px 6px ${node.glow}`,
            }}
            title={t("tree.createNew")}
          >
            <Plus className="w-3 h-3" strokeWidth={2.5} />
          </button>
        )}
      </div>
    </div>
  );
}

/* ── Branch connector between columns ────────────────── */

function BranchLine({ color }: { color: string }) {
  return (
    <div className="shrink-0 flex items-center">
      <div
        className="w-5 sm:w-8 h-[2px] rounded-full"
        style={{
          background: `linear-gradient(90deg, ${color}55, ${color}12)`,
          animation: "branchGrow 0.35s ease-out both",
          transformOrigin: "left center",
        }}
      />
    </div>
  );
}

/* ── Breadcrumb trail ────────────────────────────────── */

function TreeBreadcrumb({
  path,
  onNavigateToLevel,
  onReset,
}: {
  path: { labelKey: string; color: string }[];
  onNavigateToLevel: (level: number) => void;
  onReset: () => void;
}) {
  const { t } = useLanguage();

  if (path.length === 0) return null;

  return (
    <nav
      className="flex items-center gap-0.5 mb-2.5 px-1"
      style={{ animation: "fadeIn 0.25s ease" }}
    >
      <button
        onClick={onReset}
        className="flex items-center gap-1 px-2 py-1 rounded-md text-[11px] transition-opacity hover:opacity-70"
        style={{ color: "var(--muted-foreground)" }}
      >
        <Globe className="w-3 h-3" />
        Pangea
      </button>

      {path.map((seg, i) => (
        <div key={i} className="flex items-center gap-0.5">
          <ChevronRight
            className="w-3 h-3"
            style={{ color: "var(--muted-foreground)", opacity: 0.35 }}
          />
          <button
            onClick={() => onNavigateToLevel(i)}
            className="px-2 py-1 rounded-md text-[11px] font-semibold transition-opacity hover:opacity-75"
            style={{ color: seg.color }}
          >
            {t(seg.labelKey)}
          </button>
        </div>
      ))}
    </nav>
  );
}

/* ═══════════════════════════════════════════════════════════
   Main TreeViewer2D
   ═══════════════════════════════════════════════════════════ */

export default function TreeViewer2D({
  nodes,
  isGuest = false,
  onToggle3D,
  rootContent,
  hideBreadcrumb = false,
  hideToggle3D = false,
}: TreeViewer2DProps) {
  const { t } = useLanguage();
  const scrollRef = useRef<HTMLDivElement>(null);
  const lookup = useRef(buildLookup(nodes));

  const [expandedAtLevel, setExpandedAtLevel] = useState<
    Record<number, string>
  >({});
  const [entered, setEntered] = useState(false);

  // Entrance animation
  useEffect(() => {
    const id = setTimeout(() => setEntered(true), 50);
    return () => clearTimeout(id);
  }, []);

  // Auto-scroll right when deeper columns appear
  const prevColCount = useRef(1);
  useEffect(() => {
    const numCols = 1 + Object.keys(expandedAtLevel).length;
    if (numCols > prevColCount.current && scrollRef.current) {
      scrollRef.current.scrollTo({
        left: scrollRef.current.scrollWidth,
        behavior: "smooth",
      });
    }
    prevColCount.current = numCols;
  }, [expandedAtLevel]);

  /* ── Expand / collapse ─────────────────────────────── */

  const toggleExpand = useCallback((nodeId: string, level: number) => {
    setExpandedAtLevel((prev) => {
      const next: Record<number, string> = {};
      for (const [k, v] of Object.entries(prev)) {
        const lvl = Number(k);
        if (lvl < level) next[lvl] = v;
      }
      if (prev[level] !== nodeId) next[level] = nodeId;
      return next;
    });
  }, []);

  const collapseToLevel = useCallback((level: number) => {
    setExpandedAtLevel((prev) => {
      const next: Record<number, string> = {};
      for (const [k, v] of Object.entries(prev)) {
        const lvl = Number(k);
        if (lvl <= level) next[lvl] = v;
      }
      return next;
    });
  }, []);

  const collapseAll = useCallback(() => setExpandedAtLevel({}), []);

  /* ── Build visible columns ─────────────────────────── */

  const columns: {
    nodes: PlatformTreeNode[];
    level: number;
    parentColor: string;
  }[] = [];

  columns.push({ nodes, level: 0, parentColor: "#2563eb" });

  let lvl = 0;
  while (expandedAtLevel[lvl] !== undefined) {
    const parent = lookup.current.get(expandedAtLevel[lvl]);
    if (parent?.children?.length) {
      columns.push({
        nodes: parent.children,
        level: lvl + 1,
        parentColor: parent.color,
      });
    } else {
      break;
    }
    lvl++;
  }

  /* ── Breadcrumb path ───────────────────────────────── */

  const breadcrumbPath = useMemo(() => {
    const path: { labelKey: string; color: string }[] = [];
    let l = 0;
    while (expandedAtLevel[l]) {
      const node = lookup.current.get(expandedAtLevel[l]);
      if (node) path.push({ labelKey: node.labelKey, color: node.color });
      l++;
    }
    return path;
  }, [expandedAtLevel]);

  /* ── Active section color (for ambient glow) ───────── */

  const activeColor =
    breadcrumbPath.length > 0
      ? breadcrumbPath[breadcrumbPath.length - 1].color
      : "#2563eb";

  return (
    <div className="relative w-full">
      {/* Ambient background glow (follows active section color) */}
      <div
        className="absolute inset-0 pointer-events-none rounded-2xl"
        style={{
          background: `radial-gradient(ellipse at 20% 50%, ${activeColor}05 0%, transparent 65%)`,
          transition: "background 0.6s ease",
        }}
      />

      {/* Breadcrumb */}
      {!hideBreadcrumb && (
        <TreeBreadcrumb
          path={breadcrumbPath}
          onNavigateToLevel={collapseToLevel}
          onReset={collapseAll}
        />
      )}

      {/* Scroll container (horizontal scroll only for deep trees) */}
      <div
        ref={scrollRef}
        className="w-full overflow-x-auto overflow-y-hidden"
      >
        <div
          className="flex items-center px-1 sm:px-2 py-2"
          style={{
            opacity: entered ? 1 : 0,
            transition: "opacity 0.35s ease",
          }}
        >
          {/* Root orb */}
          <div className="shrink-0 flex flex-col items-center justify-center px-2 sm:px-4">
            {rootContent ? (
              rootContent()
            ) : (
              <div className="flex flex-col items-center">
                <div
                  className="w-14 h-14 rounded-full flex items-center justify-center"
                  style={{
                    background:
                      "linear-gradient(135deg, #2563eb, #1d4ed8, #1e40af)",
                    boxShadow:
                      "0 0 28px rgba(37,99,235,0.2), 0 4px 16px rgba(0,0,0,0.12)",
                  }}
                >
                  <Globe
                    className="w-7 h-7 text-white"
                    strokeWidth={1.5}
                  />
                </div>
                <span
                  className="text-xs font-bold tracking-tight mt-1.5"
                  style={{ color: "var(--foreground)" }}
                >
                  PANGEA
                </span>
              </div>
            )}
          </div>

          {/* Root → first column connector */}
          <BranchLine color="#2563eb" />

          {/* Tree columns */}
          {columns.map((col, colIdx) => {
            const expandedId = expandedAtLevel[col.level];

            return (
              <div key={`col-${col.level}`} className="flex items-center">
                {/* Cards stack */}
                <div
                  className="flex flex-col gap-1.5 py-1"
                  style={{
                    animation:
                      colIdx > 0
                        ? "treeSlideIn 0.35s cubic-bezier(0.34,1.56,0.64,1) both"
                        : undefined,
                  }}
                >
                  {col.nodes.map((node, nodeIdx) => (
                    <TreeNodeCard
                      key={node.id}
                      node={node}
                      isExpanded={expandedId === node.id}
                      isDimmed={!!expandedId && expandedId !== node.id}
                      onToggleExpand={() =>
                        toggleExpand(node.id, col.level)
                      }
                      isGuest={isGuest}
                      enterDelay={colIdx * 100 + nodeIdx * 30}
                    />
                  ))}
                </div>

                {/* Connector to next column */}
                {expandedId && colIdx < columns.length - 1 && (
                  <BranchLine
                    color={
                      lookup.current.get(expandedId)?.color ?? "#666"
                    }
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Floating 3D toggle */}
      {!hideToggle3D && onToggle3D && (
        <button
          onClick={onToggle3D}
          className="absolute bottom-3 right-3 flex items-center gap-1.5 px-3.5 py-2 rounded-full text-white text-xs font-medium shadow-lg transition-all duration-200 hover:scale-105 active:scale-95 z-30"
          style={{
            background: "linear-gradient(135deg, #2563eb, #4f46e5)",
            boxShadow: "0 4px 16px rgba(37,99,235,0.3)",
          }}
        >
          <Box className="w-3.5 h-3.5" />
          {t("tree.switch3D")}
        </button>
      )}

      {/* Global keyframes */}
      <style jsx global>{`
        @keyframes treeSlideIn {
          from {
            opacity: 0;
            transform: translateX(-16px) scale(0.97);
          }
          to {
            opacity: 1;
            transform: translateX(0) scale(1);
          }
        }
        @keyframes branchGrow {
          from {
            transform: scaleX(0);
          }
          to {
            transform: scaleX(1);
          }
        }
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}

"use client";

import {
  useState,
  useRef,
  useEffect,
  useCallback,
  useMemo,
  type ReactNode,
  type MouseEvent as ReactMouseEvent,
} from "react";
import { useRouter } from "next/navigation";
import { Globe, Plus, ChevronRight, Box } from "lucide-react";
import { useLanguage } from "@/components/language-provider";
import { ICON_MAP, type PlatformTreeNode } from "@/lib/platform-nodes";

/* ═══════════════════════════════════════════════════════════
   TreeViewer2D v3 — Horizontal tree with SVG bezier connectors
   ─────────────────────────────────────────────────────────
   • SVG curves connect FROM the expanded node TO each child
   • Hover expands card to show full description
   • Wider cards (300px) for readability
   • Auto-shifts left when children overflow viewport
   • Generic: works for any PlatformTreeNode[] data
   ═══════════════════════════════════════════════════════════ */

export interface TreeViewer2DProps {
  nodes: PlatformTreeNode[];
  isGuest?: boolean;
  onToggle3D?: () => void;
  rootContent?: () => ReactNode;
  hideBreadcrumb?: boolean;
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

/* ── TreeNodeCard ─────────────────────────────────────── */

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
    (e: ReactMouseEvent) => {
      const el = e.target as HTMLElement;
      if (el.closest("[data-expand-btn]") || el.closest("[data-create-btn]"))
        return;
      router.push(node.actionHref || node.href);
    },
    [router, node.actionHref, node.href],
  );

  return (
    <div
      style={{
        opacity: visible ? (isDimmed ? 0.3 : 1) : 0,
        transform: visible
          ? isDimmed
            ? "scale(0.96)"
            : "translateX(0)"
          : "translateX(-12px)",
        transition: "all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)",
        filter: isDimmed ? "grayscale(0.3)" : "none",
        pointerEvents: isDimmed ? ("none" as const) : ("auto" as const),
      }}
    >
      <div
        className="relative flex items-start gap-3 rounded-2xl cursor-pointer"
        onClick={handleCardClick}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          width: 300,
          padding: "14px 14px 14px 18px",
          background: isExpanded
            ? `color-mix(in srgb, ${node.color} 7%, var(--card))`
            : "var(--card)",
          border: `1px solid ${
            isExpanded
              ? node.color + "50"
              : hovered
                ? node.color + "25"
                : "var(--border)"
          }`,
          boxShadow: isExpanded
            ? `0 6px 28px ${node.glow}, inset 0 1px 0 ${node.color}0a`
            : hovered
              ? `0 6px 24px rgba(0,0,0,0.07), 0 0 0 1px ${node.color}10`
              : "0 1px 4px rgba(0,0,0,0.03)",
          transform:
            hovered && !isExpanded && !isDimmed
              ? "translateY(-2px)"
              : "none",
          transition: "all 0.22s cubic-bezier(0.4, 0, 0.2, 1)",
        }}
      >
        {/* Left accent bar */}
        <div
          className="absolute left-0 top-3 bottom-3 w-[3px] rounded-r-full"
          style={{
            background: `linear-gradient(180deg, ${node.color}, ${node.colorLight})`,
            opacity: isExpanded ? 1 : 0,
            transform: isExpanded ? "scaleY(1)" : "scaleY(0)",
            transition: "all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)",
            boxShadow: isExpanded ? `0 0 10px ${node.glow}` : "none",
          }}
        />

        {/* Icon badge */}
        <div
          className="shrink-0 w-11 h-11 rounded-xl flex items-center justify-center mt-px"
          style={{
            background: `linear-gradient(135deg, ${node.color}, ${node.colorLight})`,
            boxShadow: `0 3px 12px ${node.glow}`,
            transition: "transform 0.2s ease",
            transform: hovered ? "scale(1.06)" : "scale(1)",
          }}
        >
          <Icon className="w-[22px] h-[22px] text-white" strokeWidth={1.8} />
        </div>

        {/* Text content */}
        <div className="min-w-0 flex-1">
          <span
            className="text-[15px] font-semibold leading-tight block"
            style={{ color: "var(--foreground)" }}
          >
            {t(node.labelKey)}
          </span>
          {/* Description — expands on hover */}
          <div
            style={{
              maxHeight: hovered ? "80px" : "20px",
              overflow: "hidden",
              transition: "max-height 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
            }}
          >
            <p
              className="text-[12px] leading-relaxed mt-1"
              style={{ color: "var(--muted-foreground)" }}
            >
              {t(node.descKey)}
            </p>
          </div>
        </div>

        {/* Expand button with child count */}
        {hasChildren && (
          <button
            data-expand-btn=""
            onClick={(e) => {
              e.stopPropagation();
              onToggleExpand();
            }}
            className="shrink-0 flex items-center gap-0.5 h-9 rounded-xl transition-all duration-200 hover:scale-105 active:scale-95 mt-px"
            style={{
              padding: isExpanded ? "0 8px" : "0 7px 0 10px",
              backgroundColor: isExpanded
                ? node.color
                : "color-mix(in srgb, var(--foreground) 6%, transparent)",
              color: isExpanded ? "#fff" : "var(--muted-foreground)",
              boxShadow: isExpanded ? `0 3px 10px ${node.glow}` : "none",
            }}
            title={t("tree.expandBranch")}
          >
            {!isExpanded && (
              <span className="text-[11px] font-semibold tabular-nums">
                {childCount}
              </span>
            )}
            <ChevronRight
              className="w-4 h-4 transition-transform duration-300"
              style={{
                transform: isExpanded ? "rotate(90deg)" : "rotate(0deg)",
              }}
            />
          </button>
        )}

        {/* Navigate arrow for leaf nodes */}
        {!hasChildren && hovered && (
          <ChevronRight
            className="shrink-0 w-5 h-5 mt-1"
            style={{
              color: node.color,
              opacity: 0.5,
              animation: "tvFadeIn 0.15s ease",
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
            className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full flex items-center justify-center text-white shadow-md hover:scale-110 active:scale-95 z-10 transition-transform"
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
      className="flex items-center gap-0.5 mb-3 px-1 flex-wrap"
      style={{ animation: "tvFadeIn 0.25s ease" }}
    >
      <button
        onClick={onReset}
        className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs transition-opacity hover:opacity-70"
        style={{ color: "var(--muted-foreground)" }}
      >
        <Globe className="w-3.5 h-3.5" />
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
            className="px-2.5 py-1 rounded-lg text-xs font-semibold transition-opacity hover:opacity-75"
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
  const router = useRouter();
  const scrollRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const columnRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const lookup = useRef(buildLookup(nodes));
  const nodesRef = useRef(nodes);
  nodesRef.current = nodes;

  const [expandedAtLevel, setExpandedAtLevel] = useState<
    Record<number, string>
  >({});
  const [entered, setEntered] = useState(false);
  const [connectorPaths, setConnectorPaths] = useState<
    { d: string; color: string; key: string }[]
  >([]);

  // Entrance animation
  useEffect(() => {
    const id = setTimeout(() => setEntered(true), 50);
    return () => clearTimeout(id);
  }, []);

  /* ── Build visible columns ─────────────────────────── */

  const columns = useMemo(() => {
    const cols: {
      nodes: PlatformTreeNode[];
      level: number;
      parentColor: string;
    }[] = [{ nodes, level: 0, parentColor: "#2563eb" }];

    let lvl = 0;
    while (expandedAtLevel[lvl] !== undefined) {
      const parent = lookup.current.get(expandedAtLevel[lvl]);
      if (parent?.children?.length) {
        cols.push({
          nodes: parent.children,
          level: lvl + 1,
          parentColor: parent.color,
        });
      } else {
        break;
      }
      lvl++;
    }
    return cols;
  }, [nodes, expandedAtLevel]);

  /* ── Compute SVG connector paths ───────────────────── */

  const computePaths = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;
    const containerRect = container.getBoundingClientRect();

    const newPaths: { d: string; color: string; key: string }[] = [];

    // Rebuild columns internally for accuracy
    const rootNodes = nodesRef.current;
    const cols: PlatformTreeNode[][] = [rootNodes];
    let lvl = 0;
    while (expandedAtLevel[lvl] !== undefined) {
      const parent = lookup.current.get(expandedAtLevel[lvl]);
      if (parent?.children?.length) {
        cols.push(parent.children);
      } else break;
      lvl++;
    }

    for (let level = 0; level < cols.length - 1; level++) {
      const expandedId = expandedAtLevel[level];
      if (!expandedId) continue;

      const parentCol = columnRefs.current.get(level);
      const childCol = columnRefs.current.get(level + 1);
      if (!parentCol || !childCol) continue;

      const expandedIndex = cols[level].findIndex(
        (n) => n.id === expandedId,
      );
      if (expandedIndex < 0) continue;

      const parentCards = parentCol.children;
      const expandedCard = parentCards[expandedIndex] as
        | HTMLElement
        | undefined;
      if (!expandedCard) continue;

      const node = lookup.current.get(expandedId);
      const color = node?.color ?? "#666";

      // Start: right edge center of expanded card
      const eRect = expandedCard.getBoundingClientRect();
      const startX = eRect.right - containerRect.left + 2;
      const startY = eRect.top + eRect.height / 2 - containerRect.top;

      // End: left edge center of each child card
      const childCards = childCol.children;
      for (let i = 0; i < childCards.length; i++) {
        const cRect = (childCards[i] as HTMLElement).getBoundingClientRect();
        const endX = cRect.left - containerRect.left - 2;
        const endY = cRect.top + cRect.height / 2 - containerRect.top;
        const dx = endX - startX;

        newPaths.push({
          d: `M ${startX} ${startY} C ${startX + dx * 0.5} ${startY}, ${endX - dx * 0.5} ${endY}, ${endX} ${endY}`,
          color,
          key: `${level}-${i}`,
        });
      }
    }

    setConnectorPaths(newPaths);
  }, [expandedAtLevel]);

  // Recompute paths after animations + on resize
  useEffect(() => {
    if (!entered) {
      setConnectorPaths([]);
      return;
    }

    // Initial delayed computation (after slide-in animation)
    const timer = setTimeout(computePaths, 400);

    // Recompute on column resize (hover expand, window resize)
    let debounce: ReturnType<typeof setTimeout>;
    const observer =
      typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(() => {
            clearTimeout(debounce);
            debounce = setTimeout(computePaths, 50);
          })
        : null;

    columnRefs.current.forEach((el) => {
      observer?.observe(el);
    });

    return () => {
      clearTimeout(timer);
      clearTimeout(debounce);
      observer?.disconnect();
    };
  }, [entered, expandedAtLevel, computePaths]);

  /* ── Auto-scroll right when deeper columns appear ──── */

  const prevColCount = useRef(1);
  useEffect(() => {
    const numCols = columns.length;
    if (numCols > prevColCount.current && scrollRef.current) {
      requestAnimationFrame(() => {
        scrollRef.current?.scrollTo({
          left: scrollRef.current!.scrollWidth,
          behavior: "smooth",
        });
      });
    }
    prevColCount.current = numCols;
  }, [columns.length]);

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

  /* ── Breadcrumb path ───────────────────────────────── */

  const breadcrumbPath = useMemo(() => {
    const path: { labelKey: string; color: string }[] = [];
    let l = 0;
    while (expandedAtLevel[l] !== undefined) {
      const node = lookup.current.get(expandedAtLevel[l]);
      if (node) path.push({ labelKey: node.labelKey, color: node.color });
      l++;
    }
    return path;
  }, [expandedAtLevel]);

  /* ── Active color for ambient glow ─────────────────── */

  const activeColor =
    breadcrumbPath.length > 0
      ? breadcrumbPath[breadcrumbPath.length - 1].color
      : "#2563eb";

  /* ── Render ────────────────────────────────────────── */

  return (
    <div className="relative w-full">
      {/* Ambient glow */}
      <div
        className="absolute inset-0 pointer-events-none rounded-2xl"
        style={{
          background: `radial-gradient(ellipse at 15% 50%, ${activeColor}06 0%, transparent 65%)`,
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

      {/* Scroll container */}
      <div
        ref={scrollRef}
        className="w-full overflow-x-auto overflow-y-hidden"
      >
        <div
          ref={containerRef}
          className="relative flex items-center px-1 sm:px-3 py-3"
          style={{
            opacity: entered ? 1 : 0,
            transition: "opacity 0.35s ease",
          }}
        >
          {/* Root orb */}
          <div className="shrink-0 flex flex-col items-center justify-center px-3 sm:px-5">
            {rootContent ? (
              rootContent()
            ) : (
              <div className="flex flex-col items-center">
                <div
                  className="w-16 h-16 rounded-full flex items-center justify-center"
                  style={{
                    background:
                      "linear-gradient(135deg, #2563eb, #1d4ed8, #1e40af)",
                    boxShadow:
                      "0 0 32px rgba(37,99,235,0.2), 0 4px 20px rgba(0,0,0,0.12)",
                  }}
                >
                  <Globe
                    className="w-8 h-8 text-white"
                    strokeWidth={1.5}
                  />
                </div>
                <span
                  className="text-sm font-bold tracking-tight mt-2"
                  style={{ color: "var(--foreground)" }}
                >
                  PANGEA
                </span>
              </div>
            )}
          </div>

          {/* Root → first column connector */}
          <div className="shrink-0 flex items-center">
            <div
              className="w-6 sm:w-10 h-[2px] rounded-full"
              style={{
                background:
                  "linear-gradient(90deg, rgba(37,99,235,0.4), rgba(37,99,235,0.08))",
              }}
            />
          </div>

          {/* Tree columns */}
          {columns.map((col, colIdx) => {
            const expandedId = expandedAtLevel[col.level];

            return (
              <div
                key={`col-${col.level}`}
                className="flex items-center"
              >
                {/* Column of cards */}
                <div
                  ref={(el) => {
                    if (el) columnRefs.current.set(col.level, el);
                  }}
                  className="flex flex-col gap-2 py-1"
                  style={{
                    animation:
                      colIdx > 0
                        ? "tvSlideIn 0.35s cubic-bezier(0.34,1.56,0.64,1) both"
                        : undefined,
                  }}
                >
                  {col.nodes.map((node, nodeIdx) => (
                    <TreeNodeCard
                      key={node.id}
                      node={node}
                      isExpanded={expandedId === node.id}
                      isDimmed={
                        !!expandedId && expandedId !== node.id
                      }
                      onToggleExpand={() =>
                        toggleExpand(node.id, col.level)
                      }
                      isGuest={isGuest}
                      enterDelay={colIdx * 100 + nodeIdx * 30}
                    />
                  ))}
                </div>

                {/* Spacer between columns (SVG curves render here) */}
                {expandedId && colIdx < columns.length - 1 && (
                  <div className="shrink-0 w-10 sm:w-16" />
                )}
              </div>
            );
          })}

          {/* SVG connector overlay — bezier curves from expanded nodes to children */}
          <svg
            className="absolute inset-0 pointer-events-none"
            style={{ overflow: "visible", zIndex: 1 }}
          >
            {connectorPaths.map(({ d, color, key }) => (
              <g key={key}>
                <path
                  d={d}
                  fill="none"
                  stroke={color}
                  strokeWidth={2}
                  strokeLinecap="round"
                  opacity={0.22}
                  style={{ animation: "tvFadeIn 0.4s ease-out both" }}
                />
                {/* Small dot at child endpoint */}
                {(() => {
                  // Extract endpoint from path: last coordinates
                  const parts = d.split(" ");
                  const endY = parseFloat(parts[parts.length - 1]);
                  const endX = parseFloat(
                    parts[parts.length - 2].replace(",", ""),
                  );
                  return (
                    <circle
                      cx={endX}
                      cy={endY}
                      r={3}
                      fill={color}
                      opacity={0.3}
                      style={{
                        animation: "tvFadeIn 0.3s ease-out 0.2s both",
                      }}
                    />
                  );
                })()}
              </g>
            ))}
          </svg>
        </div>
      </div>

      {/* Floating 3D toggle */}
      {!hideToggle3D && onToggle3D && (
        <button
          onClick={onToggle3D}
          className="absolute bottom-3 right-3 flex items-center gap-1.5 px-4 py-2.5 rounded-full text-white text-xs font-medium shadow-lg transition-all duration-200 hover:scale-105 active:scale-95 z-30"
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
        @keyframes tvSlideIn {
          from {
            opacity: 0;
            transform: translateX(-18px) scale(0.97);
          }
          to {
            opacity: 1;
            transform: translateX(0) scale(1);
          }
        }
        @keyframes tvFadeIn {
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

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
import { Globe, Plus, ChevronRight, Loader2 } from "lucide-react";
import { useLanguage } from "@/components/core/language-provider";
import { ICON_MAP, type PlatformTreeNode } from "@/lib/platform-nodes";

/* ═══════════════════════════════════════════════════════════
   TreeViewer2D v4 — Dynamic mega-tree with lazy loading
   ─────────────────────────────────────────────────────────
   • SVG bezier curves from expanded node to each child
   • Slower, smoother hover animations
   • Root orb stays fixed (no movement on hover)
   • Longer description expansion on hover
   • Auto-color derivation for dynamic (DB-loaded) nodes
   • Loading spinner for async children
   • No 3D toggle
   ═══════════════════════════════════════════════════════════ */

export interface TreeViewer2DProps {
  nodes: PlatformTreeNode[];
  isGuest?: boolean;
  rootContent?: () => ReactNode;
  hideBreadcrumb?: boolean;
  /** Called when user expands a node that has dynamicChildSource */
  onRequestChildren?: (
    nodeId: string,
    node: PlatformTreeNode,
    parentDbId?: string,
  ) => void;
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
  const hasChildren =
    (node.children?.length ?? 0) > 0 || !!node.dynamicChildSource;
  const childCount = node.children?.length ?? 0;
  const [hovered, setHovered] = useState(false);
  const [visible, setVisible] = useState(false);

  // Resolve label: raw (DB) or i18n key
  const label = node.rawLabel ? node.labelKey : t(node.labelKey);
  const desc = node.rawDesc ? node.descKey : t(node.descKey);

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

  /* Fixed wrapper height so that card expansion overlaps without shifting siblings */
  const CARD_H = 74;

  return (
    <div
      style={{
        position: "relative",
        height: CARD_H,
        width: 300,
        zIndex: hovered ? 20 : 1,
        opacity: visible ? (isDimmed ? 0.35 : 1) : 0,
        transform: visible ? "translateX(0)" : "translateX(-12px)",
        transition: "opacity 0.6s ease, transform 0.6s ease, filter 0.4s ease, z-index 0s",
        filter: isDimmed ? "grayscale(0.3)" : "none",
        pointerEvents: "auto" as const,
      }}
    >
      {/* Create badge — outside overflow:hidden card */}
      {node.canCreate && !isGuest && node.createHref && (
        <button
          data-create-btn=""
          onClick={(e) => {
            e.stopPropagation();
            router.push(node.createHref!);
          }}
          className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full flex items-center justify-center text-white shadow-md hover:scale-110 active:scale-95 transition-transform"
          style={{
            zIndex: 25,
            background: `linear-gradient(135deg, ${node.color}, ${node.colorLight})`,
            boxShadow: `0 2px 6px ${node.glow}`,
          }}
          title={node.rawLabel ? "Create" : t("tree.createNew")}
        >
          <Plus className="w-3 h-3" strokeWidth={2.5} />
        </button>
      )}

      {/* Inner card — absolute, expands on hover via max-height */}
      <div
        className="absolute top-0 left-0 flex items-start gap-3 rounded-2xl cursor-pointer"
        onClick={handleCardClick}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          width: 300,
          maxHeight: hovered ? 200 : CARD_H,
          overflow: "hidden",
          padding: "14px 14px 14px 18px",
          background: isExpanded
            ? `color-mix(in srgb, ${node.color} 7%, var(--card))`
            : hovered
              ? `color-mix(in srgb, ${node.color} 4%, var(--card))`
              : "var(--card)",
          border: `1px solid ${
            isExpanded
              ? node.color + "50"
              : hovered
                ? node.color + "30"
                : "var(--border)"
          }`,
          boxShadow: isExpanded
            ? `0 6px 28px ${node.glow}, inset 0 1px 0 ${node.color}0a`
            : hovered
              ? `0 8px 30px rgba(0,0,0,0.12), 0 0 0 1px ${node.color}18`
              : "0 1px 4px rgba(0,0,0,0.03)",
          transform: hovered && !isDimmed ? "scale(1.03)" : "scale(1)",
          transformOrigin: "top left",
          transition:
            "max-height 0.4s cubic-bezier(0.34,1.2,0.64,1), border 0.7s ease, box-shadow 0.7s ease, transform 0.5s cubic-bezier(0.34,1.2,0.64,1), background 0.4s ease",
        }}
      >
        {/* Left accent bar */}
        <div
          className="absolute left-0 top-3 bottom-3 w-[3px] rounded-r-full"
          style={{
            background: `linear-gradient(180deg, ${node.color}, ${node.colorLight})`,
            opacity: isExpanded ? 1 : 0,
            transform: isExpanded ? "scaleY(1)" : "scaleY(0)",
            transition: "all 0.5s cubic-bezier(0.34, 1.2, 0.64, 1)",
            boxShadow: isExpanded ? `0 0 10px ${node.glow}` : "none",
          }}
        />

        {/* Icon badge */}
        <div
          className="shrink-0 w-11 h-11 rounded-xl flex items-center justify-center mt-px"
          style={{
            background: `linear-gradient(135deg, ${node.color}, ${node.colorLight})`,
            boxShadow: `0 3px 12px ${node.glow}`,
          }}
        >
          <Icon className="w-[22px] h-[22px] text-white" strokeWidth={1.8} />
        </div>

        {/* Text content — description expands on hover */}
        <div className="min-w-0 flex-1">
          <span
            className="text-[15px] font-semibold leading-tight block"
            style={{ color: "var(--foreground)" }}
          >
            {label}
          </span>
          <p
            className={`text-[12px] leading-snug mt-1 ${hovered ? "" : "truncate"}`}
            style={{ color: "var(--muted-foreground)" }}
          >
            {desc}
          </p>
        </div>

        {/* Expand button with child count */}
        {hasChildren && (
          <button
            data-expand-btn=""
            onClick={(e) => {
              e.stopPropagation();
              onToggleExpand();
            }}
            className="shrink-0 flex items-center gap-0.5 h-9 rounded-xl transition-all duration-300 hover:scale-105 active:scale-95 mt-px"
            style={{
              padding: isExpanded ? "0 8px" : "0 7px 0 10px",
              backgroundColor: isExpanded
                ? node.color
                : "color-mix(in srgb, var(--foreground) 6%, transparent)",
              color: isExpanded ? "#fff" : "var(--muted-foreground)",
              boxShadow: isExpanded ? `0 3px 10px ${node.glow}` : "none",
            }}
            title={node.rawLabel ? "Expand" : t("tree.expandBranch")}
          >
            {node.isLoading ? (
              <Loader2
                className="w-4 h-4 animate-spin"
                style={{ color: isExpanded ? "#fff" : node.color }}
              />
            ) : (
              <>
                {!isExpanded && childCount > 0 && (
                  <span className="text-[11px] font-semibold tabular-nums">
                    {childCount}
                  </span>
                )}
                {!isExpanded && childCount === 0 && node.dynamicChildSource && (
                  <span className="text-[11px] font-semibold tabular-nums opacity-60">
                    …
                  </span>
                )}
                <ChevronRight
                  className="w-4 h-4 transition-transform duration-500"
                  style={{
                    transform: isExpanded ? "rotate(90deg)" : "rotate(0deg)",
                  }}
                />
              </>
            )}
          </button>
        )}

        {/* Navigate arrow for leaf nodes */}
        {!hasChildren && hovered && (
          <ChevronRight
            className="shrink-0 w-5 h-5 mt-1"
            style={{
              color: node.color,
              opacity: 0.5,
              animation: "tvFadeIn 0.2s ease",
            }}
          />
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
  path: { label: string; color: string }[];
  onNavigateToLevel: (level: number) => void;
  onReset: () => void;
}) {
  return (
    <nav
      className="flex items-center gap-0.5 mb-3 px-1 flex-wrap"
      style={{ minHeight: 32 }}
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
            {seg.label}
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
  rootContent,
  hideBreadcrumb = false,
  onRequestChildren,
}: TreeViewer2DProps) {
  const { t } = useLanguage();
  const scrollRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const columnRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const lookupRef = useRef(buildLookup(nodes));
  const nodesRef = useRef(nodes);

  // Rebuild lookup when nodes change (e.g., after dynamic load)
  useEffect(() => {
    lookupRef.current = buildLookup(nodes);
    nodesRef.current = nodes;
  }, [nodes]);

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
    // Build a fresh lookup from current nodes to avoid stale lookupRef during render
    const freshLookup = buildLookup(nodes);

    const cols: {
      nodes: PlatformTreeNode[];
      level: number;
      parentColor: string;
    }[] = [{ nodes, level: 0, parentColor: "#2563eb" }];

    let lvl = 0;
    while (expandedAtLevel[lvl] !== undefined) {
      const parent = freshLookup.get(expandedAtLevel[lvl]);
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

    const rootNodes = nodesRef.current;
    const cols: PlatformTreeNode[][] = [rootNodes];
    let lvl = 0;
    while (expandedAtLevel[lvl] !== undefined) {
      const parent = lookupRef.current.get(expandedAtLevel[lvl]);
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

      const node = lookupRef.current.get(expandedId);
      const color = node?.color ?? "#666";

      const eRect = expandedCard.getBoundingClientRect();
      const startX = eRect.right - containerRect.left + 2;
      const startY = eRect.top + eRect.height / 2 - containerRect.top;

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

    const timer = setTimeout(computePaths, 500);

    let debounce: ReturnType<typeof setTimeout>;
    const observer =
      typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(() => {
            clearTimeout(debounce);
            debounce = setTimeout(computePaths, 80);
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
  }, [entered, expandedAtLevel, computePaths, nodes]);

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

  const toggleExpand = useCallback(
    (nodeId: string, level: number) => {
      setExpandedAtLevel((prev) => {
        const next: Record<number, string> = {};
        for (const [k, v] of Object.entries(prev)) {
          const lvl = Number(k);
          if (lvl < level) next[lvl] = v;
        }
        if (prev[level] !== nodeId) next[level] = nodeId;
        return next;
      });

      // Trigger dynamic child loading if needed
      const node = lookupRef.current.get(nodeId);
      if (node && node.dynamicChildSource && !node.childrenLoaded && onRequestChildren) {
        // Extract DB id from dynamic node id (dyn-table-uuid)
        const dbId = nodeId.startsWith("dyn-")
          ? nodeId.split("-").slice(2).join("-")
          : undefined;
        onRequestChildren(nodeId, node, dbId);
      }
    },
    [onRequestChildren],
  );

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
    const path: { label: string; color: string }[] = [];
    let l = 0;
    while (expandedAtLevel[l] !== undefined) {
      const node = lookupRef.current.get(expandedAtLevel[l]);
      if (node) {
        path.push({
          label: node.rawLabel ? node.labelKey : t(node.labelKey),
          color: node.color,
        });
      }
      l++;
    }
    return path;
  }, [expandedAtLevel, t, nodes]);

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
          transition: "background 0.8s ease",
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
            transition: "opacity 0.5s ease",
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
              <div key={`col-${col.level}`} className="flex items-center">
                {/* Column of cards */}
                <div
                  ref={(el) => {
                    if (el) columnRefs.current.set(col.level, el);
                  }}
                  className="flex flex-col gap-2 py-1"
                  style={{
                    animation:
                      colIdx > 0
                        ? "tvSlideIn 0.45s cubic-bezier(0.34,1.2,0.64,1) both"
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
                      enterDelay={colIdx * 120 + nodeIdx * 40}
                    />
                  ))}
                </div>

                {/* Spacer between columns */}
                {expandedId && colIdx < columns.length - 1 && (
                  <div className="shrink-0 w-10 sm:w-16" />
                )}
              </div>
            );
          })}

          {/* SVG connector overlay */}
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
                  style={{ animation: "tvFadeIn 0.5s ease-out both" }}
                />
                {(() => {
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
                        animation: "tvFadeIn 0.4s ease-out 0.2s both",
                      }}
                    />
                  );
                })()}
              </g>
            ))}
          </svg>
        </div>
      </div>

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
        /* tvDescIn removed — description now expands inline */
      `}</style>
    </div>
  );
}

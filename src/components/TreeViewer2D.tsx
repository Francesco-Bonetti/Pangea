"use client";

import {
  useState,
  useRef,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import {
  Globe,
  Plus,
  ChevronRight,
  Box,
} from "lucide-react";
import { useLanguage } from "@/components/language-provider";
import { ICON_MAP, type PlatformTreeNode } from "@/lib/platform-nodes";

/* ═══════════════════════════════════════════════════════════
   TreeViewer2D — Horizontal Miller-column tree
   Root on left → children expand right → auto-scroll
   ═══════════════════════════════════════════════════════════ */

/* ── Types ─────────────────────────────────────────────── */

export interface TreeViewer2DProps {
  nodes: PlatformTreeNode[];
  isGuest?: boolean;
  /** Called when user clicks "3D View" button */
  onToggle3D?: () => void;
  /** Render prop for the root orb — receives nothing, PangeaTree supplies it */
  rootContent?: () => ReactNode;
}

/* ── Helpers ───────────────────────────────────────────── */

/** Build a flat lookup: id → PlatformTreeNode */
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

/* ── Connector line (SVG curved) ─────────────────────── */

function ConnectorLine({ color, height }: { color: string; height: number }) {
  const w = 48;
  const h = Math.abs(height);
  const sign = height >= 0 ? 1 : -1;
  const y2 = sign * h;

  return (
    <svg
      width={w}
      height={h + 4}
      viewBox={`0 ${sign < 0 ? -h - 2 : -2} ${w} ${h + 4}`}
      className="shrink-0 hidden sm:block"
      style={{ overflow: "visible" }}
    >
      <path
        d={`M 0 0 C ${w * 0.5} 0, ${w * 0.5} ${y2}, ${w} ${y2}`}
        fill="none"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        opacity={0.35}
      />
    </svg>
  );
}

/* ── Single node card ────────────────────────────────── */

function NodeCard2D({
  node,
  isExpanded,
  onToggleExpand,
  isGuest,
  isActive,
}: {
  node: PlatformTreeNode;
  isExpanded: boolean;
  onToggleExpand: () => void;
  isGuest: boolean;
  isActive: boolean;
}) {
  const { t } = useLanguage();
  const router = useRouter();
  const Icon = ICON_MAP[node.iconKey] || Globe;
  const hasChildren = (node.children?.length ?? 0) > 0;

  return (
    <div
      className="relative flex flex-col rounded-2xl border backdrop-blur-sm transition-all duration-300"
      style={{
        minWidth: 220,
        maxWidth: 300,
        padding: "16px 18px",
        borderColor: isActive
          ? node.color
          : "var(--border)",
        backgroundColor: isActive
          ? `color-mix(in srgb, ${node.color} 6%, var(--card))`
          : "var(--card)",
        boxShadow: isActive
          ? `0 0 20px ${node.glow}, 0 4px 20px rgba(0,0,0,0.12)`
          : "0 1px 6px rgba(0,0,0,0.06)",
      }}
    >
      {/* Header: icon + title */}
      <div className="flex items-start gap-3 mb-2">
        <div
          className="shrink-0 w-10 h-10 rounded-xl flex items-center justify-center"
          style={{
            background: `linear-gradient(135deg, ${node.color}, ${node.colorLight})`,
            boxShadow: `0 2px 10px ${node.glow}`,
          }}
        >
          <Icon className="w-5 h-5 text-white" strokeWidth={2} />
        </div>
        <div className="min-w-0 flex-1">
          <h3
            className="text-base font-bold leading-tight truncate"
            style={{ color: "var(--foreground)" }}
          >
            {t(node.labelKey)}
          </h3>
          <p
            className="text-xs leading-snug mt-0.5 line-clamp-2"
            style={{ color: "var(--muted-foreground)" }}
          >
            {t(node.descKey)}
          </p>
        </div>
      </div>

      {/* Buttons */}
      <div className="flex items-center gap-2 mt-auto pt-3 border-t"
        style={{ borderColor: "color-mix(in srgb, var(--border) 50%, transparent)" }}
      >
        {/* Action button */}
        <button
          onClick={() => router.push(node.actionHref || node.href)}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-white text-sm font-semibold transition-all duration-200 hover:brightness-110 active:scale-[0.97]"
          style={{
            background: `linear-gradient(135deg, ${node.color}, ${node.colorLight})`,
            boxShadow: `0 2px 8px ${node.glow}`,
          }}
        >
          <ChevronRight className="w-3.5 h-3.5" />
          {t(node.actionKey)}
        </button>

        {/* Expand button */}
        {hasChildren && (
          <button
            onClick={onToggleExpand}
            className="shrink-0 w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300 hover:scale-105 active:scale-95"
            style={{
              backgroundColor: isExpanded
                ? node.color
                : "color-mix(in srgb, var(--foreground) 8%, transparent)",
              color: isExpanded ? "#fff" : "var(--foreground)",
              boxShadow: isExpanded ? `0 2px 10px ${node.glow}` : "none",
            }}
            title={t("tree.expandBranch")}
          >
            <ChevronRight
              className="w-5 h-5 transition-transform duration-300"
              style={{ transform: isExpanded ? "rotate(90deg)" : "rotate(0deg)" }}
            />
          </button>
        )}
      </div>

      {/* Create badge */}
      {node.canCreate && !isGuest && node.createHref && (
        <button
          onClick={() => router.push(node.createHref!)}
          className="absolute -top-2 -right-2 flex items-center gap-0.5 px-2.5 py-1 rounded-full text-white text-[10px] font-bold shadow-lg hover:scale-105 active:scale-95 z-10 transition-transform"
          style={{
            background: `linear-gradient(135deg, ${node.color}, ${node.colorLight})`,
            boxShadow: `0 2px 8px ${node.glow}`,
          }}
        >
          <Plus className="w-3 h-3" />
          {t("tree.createNew")}
        </button>
      )}
    </div>
  );
}

/* ── Main component ──────────────────────────────────── */

export default function TreeViewer2D({
  nodes,
  isGuest = false,
  onToggle3D,
  rootContent,
}: TreeViewer2DProps) {
  const { t } = useLanguage();
  const scrollRef = useRef<HTMLDivElement>(null);
  const lookup = useRef(buildLookup(nodes));

  // expandedAtLevel[level] = nodeId — only one expanded per level
  const [expandedAtLevel, setExpandedAtLevel] = useState<
    Record<number, string>
  >({});

  // Entrance animation
  const [entered, setEntered] = useState(false);
  useEffect(() => {
    const id = setTimeout(() => setEntered(true), 80);
    return () => clearTimeout(id);
  }, []);

  // Auto-scroll right when new columns appear
  const colCount = useRef(1);
  useEffect(() => {
    const numCols = 1 + Object.keys(expandedAtLevel).length;
    if (numCols > colCount.current && scrollRef.current) {
      scrollRef.current.scrollTo({
        left: scrollRef.current.scrollWidth,
        behavior: "smooth",
      });
    }
    colCount.current = numCols;
  }, [expandedAtLevel]);

  const toggleExpand = useCallback(
    (nodeId: string, level: number) => {
      setExpandedAtLevel((prev) => {
        const next: Record<number, string> = {};
        // Keep all levels < current level
        for (const [k, v] of Object.entries(prev)) {
          const lvl = Number(k);
          if (lvl < level) next[lvl] = v;
        }
        // Toggle this level
        if (prev[level] !== nodeId) {
          next[level] = nodeId;
        }
        // Deeper levels are cleared (already not copied)
        return next;
      });
    },
    [],
  );

  /* Build visible columns */
  const columns: { nodes: PlatformTreeNode[]; level: number; parentColor: string }[] = [];

  // Column 0: root-level nodes
  columns.push({ nodes, level: 0, parentColor: "#2563eb" });

  // Deeper columns from expanded nodes
  let lvl = 0;
  while (expandedAtLevel[lvl] !== undefined) {
    const parentId = expandedAtLevel[lvl];
    const parent = lookup.current.get(parentId);
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

  return (
    <div className="relative w-full">
      {/* Scroll container */}
      <div
        ref={scrollRef}
        className="w-full overflow-x-auto overflow-y-hidden"
        style={{ minHeight: "75vh" }}
      >
        <div
          className="flex items-stretch gap-0 sm:gap-2 px-2 sm:px-6 py-6 transition-all duration-500"
          style={{
            minHeight: "75vh",
            opacity: entered ? 1 : 0,
            transform: entered ? "translateX(0)" : "translateX(-20px)",
            transition: "opacity 0.5s ease, transform 0.5s ease",
          }}
        >
          {/* Root orb — leftmost */}
          <div className="shrink-0 flex flex-col items-center justify-center px-2 sm:px-6">
            {rootContent ? (
              rootContent()
            ) : (
              <div className="flex flex-col items-center">
                <div
                  className="w-20 h-20 rounded-full flex items-center justify-center border-2"
                  style={{
                    background:
                      "linear-gradient(135deg, #2563eb, #1d4ed8, #1e40af)",
                    borderColor: "rgba(59,130,246,0.3)",
                    boxShadow:
                      "0 0 40px rgba(37,99,235,0.3), 0 8px 32px rgba(0,0,0,0.2)",
                  }}
                >
                  <Globe
                    className="w-10 h-10 text-white"
                    strokeWidth={1.5}
                  />
                </div>
                <h1
                  className="text-lg font-extrabold tracking-tight mt-2"
                  style={{ color: "var(--foreground)" }}
                >
                  PANGEA
                </h1>
                <p
                  className="text-[10px] text-center max-w-[120px]"
                  style={{ color: "var(--muted-foreground)" }}
                >
                  {t("tree.subtitle")}
                </p>
              </div>
            )}
          </div>

          {/* Connector from root to first column */}
          <div className="shrink-0 flex items-center">
            <div
              className="w-6 sm:w-10 h-0.5 rounded-full"
              style={{
                background:
                  "linear-gradient(90deg, rgba(37,99,235,0.4), rgba(37,99,235,0.1))",
              }}
            />
          </div>

          {/* Columns */}
          {columns.map((col, colIdx) => (
            <div key={`col-${colIdx}`} className="flex items-stretch gap-0 sm:gap-2">
              {/* Column of node cards */}
              <div
                className="flex flex-col justify-center gap-3 py-4"
                style={{
                  animation: colIdx > 0 ? "treeColIn 0.4s ease both" : undefined,
                  animationDelay: colIdx > 0 ? "0.05s" : undefined,
                }}
              >
                {col.nodes.map((node, nodeIdx) => {
                  const isExpanded = expandedAtLevel[col.level] === node.id;
                  return (
                    <div
                      key={node.id}
                      style={{
                        opacity: entered ? 1 : 0,
                        transform: entered
                          ? "translateX(0)"
                          : "translateX(-16px)",
                        transition: `opacity 0.4s ease ${
                          colIdx * 0.15 + nodeIdx * 0.04
                        }s, transform 0.4s ease ${
                          colIdx * 0.15 + nodeIdx * 0.04
                        }s`,
                      }}
                    >
                      <NodeCard2D
                        node={node}
                        isExpanded={isExpanded}
                        onToggleExpand={() =>
                          toggleExpand(node.id, col.level)
                        }
                        isGuest={isGuest}
                        isActive={isExpanded}
                      />
                    </div>
                  );
                })}
              </div>

              {/* Connector to next column */}
              {expandedAtLevel[col.level] !== undefined &&
                colIdx < columns.length - 1 && (
                  <div className="shrink-0 flex items-center">
                    <div
                      className="w-6 sm:w-10 h-0.5 rounded-full"
                      style={{
                        background: `linear-gradient(90deg, ${
                          lookup.current.get(expandedAtLevel[col.level])
                            ?.color ?? "#666"
                        }66, ${
                          lookup.current.get(expandedAtLevel[col.level])
                            ?.color ?? "#666"
                        }1a)`,
                      }}
                    />
                  </div>
                )}
            </div>
          ))}
        </div>
      </div>

      {/* Floating 3D button */}
      {onToggle3D && (
        <button
          onClick={onToggle3D}
          className="absolute bottom-4 right-4 flex items-center gap-2 px-5 py-2.5 rounded-full text-white text-sm font-semibold shadow-lg transition-all duration-200 hover:scale-105 active:scale-95 z-30"
          style={{
            background: "linear-gradient(135deg, #2563eb, #4f46e5)",
            boxShadow:
              "0 4px 20px rgba(37,99,235,0.35), 0 2px 8px rgba(0,0,0,0.15)",
          }}
        >
          <Box className="w-4 h-4" />
          {t("tree.switch3D")}
        </button>
      )}

      {/* Keyframes */}
      <style jsx global>{`
        @keyframes treeColIn {
          from {
            opacity: 0;
            transform: translateX(-24px) scale(0.96);
          }
          to {
            opacity: 1;
            transform: translateX(0) scale(1);
          }
        }
      `}</style>
    </div>
  );
}

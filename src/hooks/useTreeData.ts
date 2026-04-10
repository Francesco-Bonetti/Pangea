"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import type {
  PlatformTreeNode,
  DynamicChildSource,
} from "@/lib/platform-nodes";
import { generateNodeColors } from "@/lib/tree-colors";

/* ═══════════════════════════════════════════════════════════
   useTreeData — Hydrates static platform tree with DB data
   ─────────────────────────────────────────────────────────
   • Preloads first 4 levels of dynamic children on mount
   • Deeper levels loaded on demand via loadChildren(nodeId)
   • Caches loaded data to avoid refetching
   ═══════════════════════════════════════════════════════════ */

/* Color derivation now uses the shared tree-colors algorithm */

/** Convert a DB row into a PlatformTreeNode */
function dbRowToTreeNode(
  row: Record<string, unknown>,
  source: DynamicChildSource,
  parentNode: PlatformTreeNode,
  index: number,
  hasChildren: boolean,
  totalRows: number,
): PlatformTreeNode {
  const id = String(row.id ?? row.uid ?? `dyn-${index}`);
  const name = String(row[source.nameField ?? "name"] ?? "Untitled");
  const description = row.description ? String(row.description) : "";
  const emoji = row.logo_emoji ? String(row.logo_emoji) : undefined;
  const colors = generateNodeColors(2, index, parentNode.hue ?? 220, totalRows);

  return {
    id: `dyn-${source.table}-${id}`,
    href: `${source.hrefPrefix ?? "/"}${id}`,
    labelKey: emoji ? `${emoji} ${name}` : name,
    rawLabel: true,
    iconKey: source.childIconKey ?? parentNode.iconKey,
    color: colors.color,
    colorLight: colors.colorLight,
    glow: colors.glow,
    hue: colors.hue,
    descKey: description || name,
    rawDesc: true,
    actionKey: "tree.open",
    // If this table supports recursion and this row has children, mark as expandable
    ...(source.parentField && hasChildren
      ? {
          dynamicChildSource: {
            ...source,
            filter: {}, // children will be filtered by parentField
          },
          children: [], // empty = expandable, will be loaded on demand
        }
      : {}),
  };
}

/** Fetch rows from Supabase for a given source */
async function fetchDynamicChildren(
  supabase: ReturnType<typeof createClient>,
  source: DynamicChildSource,
  parentDbId?: string,
): Promise<Record<string, unknown>[]> {
  let query = supabase
    .from(source.table)
    .select(source.select ?? "*");

  // Apply static filters
  if (source.filter) {
    for (const [col, val] of Object.entries(source.filter)) {
      if (val) query = query.eq(col, val);
    }
  }

  // For recursive tables, filter by parent
  if (source.parentField) {
    if (parentDbId) {
      query = query.eq(source.parentField, parentDbId);
    } else {
      query = query.is(source.parentField, null);
    }
  }

  if (source.orderField) {
    query = query.order(source.orderField, { ascending: true });
  }

  if (source.limit) {
    query = query.limit(source.limit);
  }

  const { data, error } = await query;
  if (error) {
    console.error(`[useTreeData] Error fetching ${source.table}:`, error.message);
    return [];
  }
  return (data ?? []) as unknown as Record<string, unknown>[];
}

/** Check which rows have children (for showing expand button) */
async function fetchChildCounts(
  supabase: ReturnType<typeof createClient>,
  source: DynamicChildSource,
  parentIds: string[],
): Promise<Set<string>> {
  if (!source.parentField || parentIds.length === 0) return new Set();

  const { data } = await supabase
    .from(source.table)
    .select(`${source.parentField}`)
    .in(source.parentField, parentIds);

  const withChildren = new Set<string>();
  for (const row of data ?? []) {
    const pid = (row as unknown as Record<string, unknown>)[source.parentField!];
    if (pid) withChildren.add(String(pid));
  }
  return withChildren;
}

/* ── Main hook ─────────────────────────────────────────── */

export function useTreeData(initialTree: PlatformTreeNode[]) {
  const [tree, setTree] = useState<PlatformTreeNode[]>(initialTree);
  const loadedCache = useRef<Set<string>>(new Set());
  const supabaseRef = useRef(createClient());

  /** Deep-clone and inject children into a node by ID */
  const injectChildren = useCallback(
    (
      nodes: PlatformTreeNode[],
      targetId: string,
      children: PlatformTreeNode[],
      markLoaded: boolean,
    ): PlatformTreeNode[] => {
      return nodes.map((node) => {
        if (node.id === targetId) {
          return {
            ...node,
            children:
              (node.children?.filter((c) => !c.id.startsWith("dyn-")) ?? []).concat(children),
            isLoading: false,
            childrenLoaded: markLoaded,
          };
        }
        if (node.children) {
          return {
            ...node,
            children: injectChildren(node.children, targetId, children, markLoaded),
          };
        }
        return node;
      });
    },
    [],
  );

  /** Set loading state on a node */
  const setNodeLoading = useCallback(
    (nodes: PlatformTreeNode[], targetId: string, loading: boolean): PlatformTreeNode[] => {
      return nodes.map((node) => {
        if (node.id === targetId) return { ...node, isLoading: loading };
        if (node.children)
          return { ...node, children: setNodeLoading(node.children, targetId, loading) };
        return node;
      });
    },
    [],
  );

  /** Load dynamic children for a specific node */
  const loadChildren = useCallback(
    async (nodeId: string, node: PlatformTreeNode, parentDbId?: string) => {
      if (loadedCache.current.has(nodeId) || !node.dynamicChildSource) return;
      loadedCache.current.add(nodeId);

      setTree((prev) => setNodeLoading(prev, nodeId, true));

      const source = node.dynamicChildSource;
      const supabase = supabaseRef.current;

      try {
        const rows = await fetchDynamicChildren(supabase, source, parentDbId);

        // Check which rows have sub-children (for recursive tables)
        let withChildren = new Set<string>();
        if (source.parentField && rows.length > 0) {
          const rowIds = rows.map((r) => String(r.id));
          withChildren = await fetchChildCounts(supabase, source, rowIds);
        }

        const childNodes = rows.map((row, i) =>
          dbRowToTreeNode(row, source, node, i, withChildren.has(String(row.id)), rows.length),
        );

        setTree((prev) => injectChildren(prev, nodeId, childNodes, true));
      } catch (err) {
        console.error(`[useTreeData] Failed to load children for ${nodeId}:`, err);
        setTree((prev) => setNodeLoading(prev, nodeId, false));
        loadedCache.current.delete(nodeId);
      }
    },
    [injectChildren, setNodeLoading],
  );

  /** Preload first N levels of dynamic data */
  useEffect(() => {
    const preload = async () => {
      const supabase = supabaseRef.current;

      // Collect all nodes at levels 0-3 that have dynamicChildSource
      const queue: { node: PlatformTreeNode; depth: number }[] = [];
      const walk = (nodes: PlatformTreeNode[], depth: number) => {
        for (const n of nodes) {
          if (depth <= 3 && n.dynamicChildSource && !loadedCache.current.has(n.id)) {
            queue.push({ node: n, depth });
          }
          if (n.children && depth < 3) walk(n.children, depth + 1);
        }
      };
      walk(initialTree, 0);

      // Load all in parallel
      await Promise.all(
        queue.map(({ node }) => loadChildren(node.id, node)),
      );
    };

    preload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { tree, loadChildren };
}

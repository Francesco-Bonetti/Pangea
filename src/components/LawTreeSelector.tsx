"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useLanguage } from "@/components/language-provider";
import {
  ChevronRight,
  ChevronDown,
  Plus,
  BookOpen,
  FileText,
  Scale,
  Scroll,
  X,
  RefreshCw,
} from "lucide-react";

interface LawNode {
  id: string;
  parent_id: string | null;
  title: string;
  law_type: "code" | "book" | "title" | "chapter" | "section" | "article";
  code: string | null;
  article_number: number | null;
  order_index: number;
  jurisdiction_id: string | null;
  children?: LawNode[];
}

interface LawTreeSelectorProps {
  selectedParentId: string | null;
  onSelect: (parentId: string | null, replacesId: string | null) => void;
  replacesNodeId: string | null;
}

const typeIcons: Record<
  "code" | "book" | "title" | "chapter" | "section" | "article",
  React.ReactNode
> = {
  code: <Scale className="w-4 h-4" />,
  book: <BookOpen className="w-4 h-4" />,
  title: <Scroll className="w-4 h-4" />,
  chapter: <FileText className="w-4 h-4" />,
  section: <FileText className="w-4 h-4" />,
  article: <FileText className="w-4 h-4" />,
};

function buildTree(
  nodes: LawNode[],
  parentId: string | null = null
): LawNode[] {
  return nodes
    .filter((node) => node.parent_id === parentId)
    .map((node) => ({
      ...node,
      children: buildTree(nodes, node.id),
    }))
    .sort((a, b) => a.order_index - b.order_index);
}

function TreeNode({
  node,
  selectedParentId,
  replacesNodeId,
  onSelectParent,
  onSelectReplace,
  depth = 0,
}: {
  node: LawNode;
  selectedParentId: string | null;
  replacesNodeId: string | null;
  onSelectParent: (nodeId: string) => void;
  onSelectReplace: (nodeId: string) => void;
  depth?: number;
}): React.ReactNode {
  const [expanded, setExpanded] = useState(false);
  const hasChildren = node.children && node.children.length > 0;
  const isSelectedParent = selectedParentId === node.id;
  const isSelectedReplace = replacesNodeId === node.id;

  return (
    <div key={node.id}>
      <div
        className={`
          flex items-center gap-2 px-3 py-2 rounded-md text-sm
          transition-colors duration-200
          ${
            isSelectedParent || isSelectedReplace
              ? "bg-theme-muted border border-pangea-500"
              : "hover:bg-theme-card border border-transparent"
          }
        `}
        style={{ paddingLeft: `${12 + depth * 16}px` }}
      >
        {hasChildren ? (
          <button
            onClick={() => setExpanded(!expanded)}
            className="p-0 hover:bg-theme-muted rounded transition-colors"
          >
            {expanded ? (
              <ChevronDown className="w-4 h-4 text-fg-muted" />
            ) : (
              <ChevronRight className="w-4 h-4 text-fg-muted" />
            )}
          </button>
        ) : (
          <div className="w-4" />
        )}

        <div className="text-fg-muted">{typeIcons[node.law_type]}</div>

        <div className="flex-1 min-w-0">
          <div className="text-fg truncate">
            {node.code && (
              <span className="text-fg-muted font-mono text-xs mr-2">
                {node.code}
              </span>
            )}
            {node.article_number && (
              <span className="text-fg-muted text-xs mr-2">
                Art. {node.article_number}
              </span>
            )}
            <span>{node.title}</span>
          </div>
        </div>

        <div className="flex items-center gap-1 opacity-70 hover:opacity-100 transition-opacity">
          <button
            onClick={() => onSelectParent(node.id)}
            className={`
              p-1 rounded transition-colors
              ${
                isSelectedParent
                  ? "bg-theme-primary/30 text-fg-primary"
                  : "bg-theme-muted text-fg-muted hover:bg-theme-muted hover:text-fg"
              }
            `}
            title="Add below"
          >
            <Plus className="w-4 h-4" />
          </button>
          <button
            onClick={() => onSelectReplace(node.id)}
            className={`
              p-1 rounded transition-colors
              ${
                isSelectedReplace
                  ? "bg-theme-primary/30 text-fg-primary"
                  : "bg-theme-muted text-fg-muted hover:bg-theme-muted hover:text-fg"
              }
            `}
            title="Replace"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {expanded && hasChildren && (
        <div>
          {node.children!.map((child) => (
            <TreeNode
              key={child.id}
              node={child}
              selectedParentId={selectedParentId}
              replacesNodeId={replacesNodeId}
              onSelectParent={onSelectParent}
              onSelectReplace={onSelectReplace}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function LawTreeSelector({
  selectedParentId,
  onSelect,
  replacesNodeId,
}: LawTreeSelectorProps) {
  const { t } = useLanguage();
  const [laws, setLaws] = useState<LawNode[]>([]);
  const [treeData, setTreeData] = useState<LawNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch laws from Supabase
  useEffect(() => {
    const fetchLaws = async () => {
      try {
        setLoading(true);
        setError(null);

        const supabase = createClient();
        const { data, error: fetchError } = await supabase
          .from("laws")
          .select(
            "id, parent_id, title, law_type, code, article_number, order_index, jurisdiction_id"
          )
          .order("order_index");

        if (fetchError) {
          throw new Error(fetchError.message);
        }

        if (data) {
          const typedData = data as LawNode[];
          setLaws(typedData);
          const tree = buildTree(typedData);
          setTreeData(tree);
        }
      } catch (err) {
        setError(
          err instanceof Error ? err.message : t("laws.errorLoading")
        );
      } finally {
        setLoading(false);
      }
    };

    fetchLaws();
  }, []);

  const handleSelectParent = (nodeId: string) => {
    onSelect(nodeId, null);
  };

  const handleSelectReplace = (nodeId: string) => {
    onSelect(selectedParentId, nodeId);
  };

  const handleClearSelection = () => {
    onSelect(null, null);
  };

  // Find selected nodes for info display
  const selectedParentNode = laws.find((l) => l.id === selectedParentId);
  const replacesNode = laws.find((l) => l.id === replacesNodeId);

  return (
    <div className="flex flex-col gap-4">
      {/* Clear selection button */}
      <button
        onClick={handleClearSelection}
        className={`
          flex items-center gap-2 px-3 py-2 rounded-md text-sm
          transition-colors duration-200
          ${
            !selectedParentId && !replacesNodeId
              ? "bg-theme-muted border border-pangea-500 text-fg"
              : "border border-theme text-fg-muted hover:bg-theme-card hover:text-fg"
          }
        `}
      >
        <X className="w-4 h-4" />
        <span>No specific position</span>
      </button>

      {/* Info messages */}
      {selectedParentNode && (
        <div className="px-3 py-2 bg-theme-card border border-theme rounded-md text-sm text-fg">
          The new law will be added under:{" "}
          <span className="font-semibold text-fg">
            {selectedParentNode.title}
          </span>
        </div>
      )}

      {replacesNode && (
        <div className="px-3 py-2 bg-theme-card border border-theme rounded-md text-sm text-fg">
          The new law will replace:{" "}
          <span className="font-semibold text-fg">
            {replacesNode.title}
          </span>
        </div>
      )}

      {/* Tree container */}
      <div className="border border-theme rounded-md bg-[var(--background)] overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center p-8">
            <div className="text-fg-muted text-sm">Loading laws...</div>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center p-8">
            <div className="text-fg-danger text-sm">{error}</div>
          </div>
        ) : treeData.length === 0 ? (
          <div className="flex items-center justify-center p-8">
            <div className="text-fg-muted text-sm">No laws found</div>
          </div>
        ) : (
          <div className="max-h-96 overflow-y-auto">
            {treeData.map((node) => (
              <TreeNode
                key={node.id}
                node={node}
                selectedParentId={selectedParentId}
                replacesNodeId={replacesNodeId}
                onSelectParent={handleSelectParent}
                onSelectReplace={handleSelectReplace}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

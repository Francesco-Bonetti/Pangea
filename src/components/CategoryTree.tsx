"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  ChevronRight,
  ChevronDown,
  Plus,
  Folder,
  FileText,
  X,
} from "lucide-react";

interface Category {
  id: string;
  name: string;
  description: string;
  parent_id: string | null;
  created_by: string;
}

interface Law {
  id: string;
  title: string;
  content: string;
  status: "closed" | "repealed";
  category_id: string | null;
  created_at: string;
}

interface CategoryTreeProps {
  categories: Category[];
  laws: Law[];
  onCreateSubcategory: (parentCategoryId: string, name: string) => Promise<void>;
}

interface ExpandedState {
  [key: string]: boolean;
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString("it-IT", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function getStatusLabel(status: string): string {
  return status === "closed" ? "Deliberata" : "Abrogata";
}

function getStatusColor(status: string): string {
  return status === "closed"
    ? "bg-green-900/30 text-green-300 border-green-700/50"
    : "bg-slate-700/50 text-slate-400";
}

export default function CategoryTree({
  categories,
  laws,
  onCreateSubcategory,
}: CategoryTreeProps) {
  const [expanded, setExpanded] = useState<ExpandedState>({});
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(
    null
  );
  const [creatingSubcategoryId, setCreatingSubcategoryId] = useState<
    string | null
  >(null);
  const [newSubcategoryName, setNewSubcategoryName] = useState("");
  const [creatingLoading, setCreatingLoading] = useState(false);

  // Build a tree structure for categories
  const categoryTree = useMemo(() => {
    const map = new Map<string, Category & { children: string[] }>();
    categories.forEach((cat) => {
      map.set(cat.id, { ...cat, children: [] });
    });

    categories.forEach((cat) => {
      if (cat.parent_id && map.has(cat.parent_id)) {
        map.get(cat.parent_id)!.children.push(cat.id);
      }
    });

    return {
      root: categories
        .filter((cat) => cat.parent_id === null)
        .map((cat) => cat.id),
      map,
    };
  }, [categories]);

  // Count laws per category (including subcategories)
  const lawCountByCategory = useMemo(() => {
    const counts = new Map<string, number>();

    const countLaws = (categoryId: string): number => {
      if (counts.has(categoryId)) return counts.get(categoryId)!;

      let count = laws.filter(
        (law) => law.category_id === categoryId
      ).length;

      const catData = categoryTree.map.get(categoryId);
      if (catData) {
        catData.children.forEach((childId) => {
          count += countLaws(childId);
        });
      }

      counts.set(categoryId, count);
      return count;
    };

    categoryTree.root.forEach((rootId) => countLaws(rootId));
    categories.forEach((cat) => {
      if (!counts.has(cat.id)) countLaws(cat.id);
    });

    return counts;
  }, [laws, categories, categoryTree]);

  const toggleExpanded = (categoryId: string) => {
    setExpanded((prev) => ({
      ...prev,
      [categoryId]: !prev[categoryId],
    }));
  };

  const handleCreateSubcategory = async (categoryId: string) => {
    if (!newSubcategoryName.trim()) return;

    try {
      setCreatingLoading(true);
      await onCreateSubcategory(categoryId, newSubcategoryName);
      setNewSubcategoryName("");
      setCreatingSubcategoryId(null);
      setExpanded((prev) => ({ ...prev, [categoryId]: true }));
    } finally {
      setCreatingLoading(false);
    }
  };

  const renderCategoryNode = (
    categoryId: string,
    depth: number
  ): JSX.Element => {
    const category = categoryTree.map.get(categoryId);
    if (!category) return <></>;

    const isExpanded = expanded[categoryId];
    const hasChildren = category.children.length > 0;
    const lawCount = lawCountByCategory.get(categoryId) || 0;
    const isSelected = selectedCategoryId === categoryId;

    return (
      <div key={categoryId} className="space-y-1">
        {/* Category Header */}
        <div
          className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all ${
            isSelected
              ? "bg-pangea-900/40 border border-pangea-700/50"
              : "hover:bg-slate-700/30"
          }`}
          style={{ marginLeft: `${depth * 1.5}rem` }}
        >
          {/* Expand/Collapse Toggle */}
          <button
            onClick={() => toggleExpanded(categoryId)}
            className={`p-0.5 transition-transform ${
              hasChildren ? "cursor-pointer" : "opacity-0"
            }`}
          >
            {isExpanded ? (
              <ChevronDown className="w-4 h-4 text-pangea-400" />
            ) : (
              <ChevronRight className="w-4 h-4 text-slate-500" />
            )}
          </button>

          {/* Folder Icon */}
          <Folder className="w-4 h-4 text-pangea-400 shrink-0" />

          {/* Category Name and Law Count */}
          <button
            onClick={() =>
              setSelectedCategoryId(isSelected ? null : categoryId)
            }
            className="flex-1 text-left"
          >
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-slate-200 hover:text-white transition-colors">
                {category.name}
              </span>
              <span className="text-xs text-slate-500 bg-slate-700/50 px-2 py-0.5 rounded-full">
                {lawCount}
              </span>
            </div>
            {category.description && (
              <p className="text-xs text-slate-500 mt-0.5">
                {category.description}
              </p>
            )}
          </button>

          {/* Add Subcategory Button */}
          <button
            onClick={() => setCreatingSubcategoryId(categoryId)}
            className="p-1 text-slate-500 hover:text-pangea-400 transition-colors shrink-0"
            title="Aggiungi sottocategoria"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        {/* Add Subcategory Form */}
        {creatingSubcategoryId === categoryId && (
          <div
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-800/50"
            style={{ marginLeft: `${(depth + 1) * 1.5}rem` }}
          >
            <input
              type="text"
              value={newSubcategoryName}
              onChange={(e) => setNewSubcategoryName(e.target.value)}
              placeholder="Nome della sottocategoria..."
              className="input-field text-xs py-1.5"
              autoFocus
              disabled={creatingLoading}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleCreateSubcategory(categoryId);
                }
              }}
            />
            <button
              onClick={() => handleCreateSubcategory(categoryId)}
              disabled={creatingLoading || !newSubcategoryName.trim()}
              className="btn-primary text-xs py-1.5 px-3 whitespace-nowrap disabled:opacity-50"
            >
              Salva
            </button>
            <button
              onClick={() => {
                setCreatingSubcategoryId(null);
                setNewSubcategoryName("");
              }}
              disabled={creatingLoading}
              className="p-1 text-slate-500 hover:text-slate-300 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Expanded Content: Children and Laws */}
        {isExpanded && (
          <div className="space-y-1">
            {/* Child Categories */}
            {category.children.map((childId) =>
              renderCategoryNode(childId, depth + 1)
            )}

            {/* Laws in this Category */}
            {isSelected && (
              <div className="space-y-1">
                {laws
                  .filter((law) => law.category_id === categoryId)
                  .map((law) => (
                    <Link
                      key={law.id}
                      href={`/proposals/${law.id}`}
                      className="flex items-start gap-3 px-3 py-2 rounded-lg hover:bg-slate-700/40 transition-all group"
                      style={{ marginLeft: `${(depth + 1) * 1.5}rem` }}
                    >
                      <FileText className="w-4 h-4 text-slate-500 group-hover:text-slate-400 shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-slate-200 group-hover:text-white transition-colors line-clamp-1">
                          {law.title}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <span
                            className={`text-xs font-medium px-2 py-0.5 rounded-full border ${getStatusColor(law.status)}`}
                          >
                            {getStatusLabel(law.status)}
                          </span>
                          <span className="text-xs text-slate-500">
                            {formatDate(law.created_at)}
                          </span>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-slate-400 shrink-0 mt-0.5" />
                    </Link>
                  ))}

                {/* Empty state for category */}
                {laws.filter((law) => law.category_id === categoryId).length ===
                  0 && (
                  <div className="px-3 py-2 text-xs text-slate-500 italic">
                    Nessuna legge in questa categoria
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-1">
      {/* Root Categories */}
      {categoryTree.root.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-slate-500 text-sm">
            Nessuna categoria disponibile.
          </p>
        </div>
      ) : (
        categoryTree.root.map((categoryId) => renderCategoryNode(categoryId, 0))
      )}

      {/* Laws Without Category */}
      {laws.filter((law) => !law.category_id).length > 0 && (
        <div className="mt-6 pt-6 border-t border-slate-700">
          <div className="px-3 py-2">
            <h3 className="text-sm font-medium text-slate-300 mb-2">
              Leggi Senza Categoria
            </h3>
          </div>
          {laws
            .filter((law) => !law.category_id)
            .map((law) => (
              <Link
                key={law.id}
                href={`/proposals/${law.id}`}
                className="flex items-start gap-3 px-3 py-2 rounded-lg hover:bg-slate-700/40 transition-all group"
              >
                <FileText className="w-4 h-4 text-slate-500 group-hover:text-slate-400 shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-slate-200 group-hover:text-white transition-colors line-clamp-1">
                    {law.title}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <span
                      className={`text-xs font-medium px-2 py-0.5 rounded-full border ${getStatusColor(law.status)}`}
                    >
                      {getStatusLabel(law.status)}
                    </span>
                    <span className="text-xs text-slate-500">
                      {formatDate(law.created_at)}
                    </span>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-slate-400 shrink-0 mt-0.5" />
              </Link>
            ))}
        </div>
      )}
    </div>
  );
}

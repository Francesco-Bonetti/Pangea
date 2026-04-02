"use client";

import { useState } from "react";
import { ChevronRight, ChevronDown, BookOpen, FileText, Scale, Scroll, Edit3, Trash2, Save, X, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { LawNode } from "@/app/laws/page";

interface LawTreeProps {
  node: LawNode;
  depth: number;
  isAdmin?: boolean;
  onDelete?: (id: string) => void;
  onUpdate?: (id: string, updates: Partial<LawNode>) => void;
}

const typeConfig: Record<string, { icon: typeof BookOpen; color: string; bg: string; label: string }> = {
  code: { icon: Scale, color: "text-blue-400", bg: "bg-blue-900/20 border-blue-800/30", label: "Codice" },
  book: { icon: BookOpen, color: "text-pangea-400", bg: "bg-pangea-900/20 border-pangea-800/30", label: "Libro" },
  title: { icon: Scroll, color: "text-amber-400", bg: "bg-amber-900/20 border-amber-800/30", label: "Titolo" },
  chapter: { icon: FileText, color: "text-green-400", bg: "bg-green-900/20 border-green-800/30", label: "Capitolo" },
  section: { icon: FileText, color: "text-slate-400", bg: "bg-slate-800/50 border-slate-700/30", label: "Sezione" },
  article: { icon: FileText, color: "text-slate-300", bg: "bg-slate-800/30 border-slate-700/20", label: "Articolo" },
};

export default function LawTree({ node, depth, isAdmin, onDelete, onUpdate }: LawTreeProps) {
  const [expanded, setExpanded] = useState(depth === 0);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [editTitle, setEditTitle] = useState(node.title);
  const [editSummary, setEditSummary] = useState(node.summary ?? "");
  const [editContent, setEditContent] = useState(node.content ?? "");
  const [editCode, setEditCode] = useState(node.code ?? "");
  const [localNode, setLocalNode] = useState(node);
  const [deleted, setDeleted] = useState(false);
  const [message, setMessage] = useState<{ type: "error" | "success"; text: string } | null>(null);

  const hasChildren = localNode.children && localNode.children.length > 0;
  const isArticle = localNode.law_type === "article";
  const config = typeConfig[localNode.law_type] || typeConfig.section;
  const Icon = config.icon;

  if (deleted) return null;

  async function handleSave() {
    setSaving(true);
    setMessage(null);
    const supabase = createClient();

    const updates: Record<string, string | null> = {
      title: editTitle.trim(),
      summary: editSummary.trim() || null,
      content: editContent.trim() || null,
      code: editCode.trim() || null,
    };

    const { error } = await supabase
      .from("laws")
      .update(updates)
      .eq("id", localNode.id);

    if (error) {
      setMessage({ type: "error", text: error.message });
    } else {
      setLocalNode(prev => ({ ...prev, ...updates }));
      setEditing(false);
      setMessage({ type: "success", text: "Salvato" });
      if (onUpdate) onUpdate(localNode.id, updates);
      setTimeout(() => setMessage(null), 2000);
    }
    setSaving(false);
  }

  async function handleDelete() {
    if (!confirm(`Eliminare "${localNode.title}"${hasChildren ? ` e tutti i suoi ${localNode.children!.length} sotto-elementi` : ""}? L'azione è irreversibile.`)) return;
    setDeleting(true);
    setMessage(null);
    const supabase = createClient();

    // Recursive delete: children first (DB cascade may handle this, but let's be safe)
    async function deleteRecursive(id: string) {
      // Get children
      const { data: children } = await supabase.from("laws").select("id").eq("parent_id", id);
      if (children) {
        for (const child of children) {
          await deleteRecursive(child.id);
        }
      }
      await supabase.from("laws").delete().eq("id", id);
    }

    try {
      await deleteRecursive(localNode.id);
      setDeleted(true);
      if (onDelete) onDelete(localNode.id);
    } catch {
      setMessage({ type: "error", text: "Errore durante l'eliminazione" });
    }
    setDeleting(false);
  }

  function startEditing(e: React.MouseEvent) {
    e.stopPropagation();
    setEditTitle(localNode.title);
    setEditSummary(localNode.summary ?? "");
    setEditContent(localNode.content ?? "");
    setEditCode(localNode.code ?? "");
    setEditing(true);
    setExpanded(true);
  }

  function cancelEditing(e: React.MouseEvent) {
    e.stopPropagation();
    setEditing(false);
  }

  function handleChildDelete(childId: string) {
    setLocalNode(prev => ({
      ...prev,
      children: prev.children?.filter(c => c.id !== childId),
    }));
  }

  return (
    <div className={depth === 0 ? "" : "ml-4 sm:ml-6"}>
      {/* Message feedback */}
      {message && (
        <div className={`mb-1 px-3 py-1.5 rounded text-xs ${
          message.type === "success" ? "bg-green-900/30 text-green-300 border border-green-700/30" : "bg-red-900/30 text-red-300 border border-red-700/30"
        }`}>
          {message.text}
        </div>
      )}

      {/* Nodo header */}
      <div
        className={`card border ${config.bg} transition-all duration-200 ${
          hasChildren || isArticle ? "cursor-pointer hover:border-slate-500" : ""
        } ${expanded && (hasChildren || (isArticle && (localNode.content || editing))) ? "rounded-b-none border-b-0" : ""}`}
        onClick={() => {
          if (!editing && (hasChildren || isArticle)) setExpanded(!expanded);
        }}
      >
        <div className="p-4 flex items-start gap-3">
          {/* Expand/collapse indicator */}
          <div className="mt-0.5 shrink-0">
            {hasChildren ? (
              expanded ? (
                <ChevronDown className={`w-4 h-4 ${config.color}`} />
              ) : (
                <ChevronRight className={`w-4 h-4 ${config.color}`} />
              )
            ) : (
              <Icon className={`w-4 h-4 ${config.color}`} />
            )}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              {localNode.article_number && (
                <span className="text-xs font-medium text-slate-500 bg-slate-700/50 px-1.5 py-0.5 rounded shrink-0">
                  {localNode.article_number}
                </span>
              )}
              {localNode.code && depth === 0 && (
                <span className="text-xs font-medium text-slate-500 bg-slate-700/50 px-1.5 py-0.5 rounded shrink-0">
                  {editCode || localNode.code}
                </span>
              )}
              <h3 className={`font-semibold ${
                depth === 0 ? "text-lg text-white" :
                depth === 1 ? "text-base text-slate-200" :
                "text-sm text-slate-300"
              }`}>
                {localNode.title}
              </h3>
            </div>

            {/* Summary (per nodi non-articolo) */}
            {localNode.summary && !isArticle && !editing && (
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                {localNode.summary}
              </p>
            )}

            {/* Conteggio figli */}
            {hasChildren && !expanded && (
              <p className="text-xs text-slate-600 mt-1">
                {localNode.children!.length} {localNode.children!.length === 1 ? "elemento" : "elementi"}
              </p>
            )}
          </div>

          {/* Admin action buttons */}
          {isAdmin && !editing && (
            <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
              <button
                onClick={startEditing}
                className="p-1.5 rounded-lg text-blue-400 hover:bg-blue-900/30 transition-colors"
                title="Modifica"
              >
                <Edit3 className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); handleDelete(); }}
                disabled={deleting}
                className="p-1.5 rounded-lg text-red-400 hover:bg-red-900/30 transition-colors"
                title="Elimina"
              >
                {deleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Edit form */}
      {editing && (
        <div className={`card border ${config.bg} rounded-t-none border-t border-slate-700/20 p-4`} onClick={(e) => e.stopPropagation()}>
          <div className="space-y-3">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Titolo</label>
              <input
                type="text"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-pangea-500"
              />
            </div>
            {depth === 0 && (
              <div>
                <label className="block text-xs text-slate-400 mb-1">Codice</label>
                <input
                  type="text"
                  value={editCode}
                  onChange={(e) => setEditCode(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-pangea-500"
                  placeholder="Es. LUX, ADM, COM"
                />
              </div>
            )}
            <div>
              <label className="block text-xs text-slate-400 mb-1">Sommario</label>
              <textarea
                value={editSummary}
                onChange={(e) => setEditSummary(e.target.value)}
                rows={2}
                className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-pangea-500 resize-y"
                placeholder="Breve descrizione..."
              />
            </div>
            {(isArticle || localNode.content) && (
              <div>
                <label className="block text-xs text-slate-400 mb-1">Contenuto</label>
                <textarea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  rows={6}
                  className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-pangea-500 resize-y font-mono"
                  placeholder="Testo completo dell'articolo..."
                />
              </div>
            )}
            <div className="flex items-center gap-2 pt-1">
              <button
                onClick={(e) => { e.stopPropagation(); handleSave(); }}
                disabled={saving || !editTitle.trim()}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-pangea-600 hover:bg-pangea-500 text-white text-sm rounded-lg transition-colors disabled:opacity-50"
              >
                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                Salva
              </button>
              <button
                onClick={cancelEditing}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-300 text-sm rounded-lg transition-colors"
              >
                <X className="w-3.5 h-3.5" />
                Annulla
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Contenuto articolo espanso (non in editing) */}
      {expanded && isArticle && localNode.content && !editing && (
        <div className="card border border-slate-700/20 rounded-t-none border-t-0 bg-slate-900/50">
          <div className="p-4 pl-11">
            <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">
              {localNode.content}
            </p>
          </div>
        </div>
      )}

      {/* Figli espansi */}
      {expanded && hasChildren && !editing && (
        <div className={`card border ${config.bg} rounded-t-none border-t border-slate-700/20 pb-2 pt-1`}>
          <div className="space-y-2 px-2">
            {localNode.children!.map((child) => (
              <LawTree
                key={child.id}
                node={child}
                depth={depth + 1}
                isAdmin={isAdmin}
                onDelete={handleChildDelete}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

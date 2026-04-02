"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { Send, Loader2, Trash2, AlertTriangle } from "lucide-react";

interface DraftActionsProps {
  proposalId: string;
  authorId: string;
  userId: string;
  hasOptions: boolean;
}

export default function DraftActions({
  proposalId,
  authorId,
  userId,
  hasOptions,
}: DraftActionsProps) {
  const [publishing, setPublishing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();

  // Solo l'autore vede le azioni
  if (authorId !== userId) return null;

  async function publishToCuration() {
    setError(null);
    setPublishing(true);

    try {
      const { error: updateError } = await supabase
        .from("proposals")
        .update({ status: "curation" })
        .eq("id", proposalId)
        .eq("author_id", userId);

      if (updateError) throw updateError;

      router.refresh();
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Errore durante la pubblicazione";
      setError(msg);
    } finally {
      setPublishing(false);
    }
  }

  async function deleteProposal() {
    setError(null);
    setDeleting(true);

    try {
      // Prima elimina le opzioni collegate
      await supabase
        .from("proposal_options")
        .delete()
        .eq("proposal_id", proposalId);

      // Poi elimina la proposta
      const { error: deleteError } = await supabase
        .from("proposals")
        .delete()
        .eq("id", proposalId)
        .eq("author_id", userId);

      if (deleteError) throw deleteError;

      router.push("/dashboard");
      router.refresh();
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Errore durante l'eliminazione";
      setError(msg);
    } finally {
      setDeleting(false);
      setConfirmDelete(false);
    }
  }

  return (
    <div className="card p-5 mb-6 bg-amber-900/5 border-amber-800/20">
      <h3 className="text-base font-semibold text-slate-200 mb-2">
        Azioni Bozza
      </h3>
      <p className="text-xs text-slate-500 mb-4">
        Questa proposta è ancora una bozza. Pubblicala per raccogliere
        il supporto dei cittadini.
      </p>

      {!hasOptions && (
        <div className="flex gap-2 p-3 mb-4 bg-amber-900/20 border border-amber-700/30 rounded-lg">
          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <p className="text-xs text-amber-300">
            Questa bozza non ha opzioni deliberative. Verrà votata con il
            sistema semplice (Favorevole / Contrario / Astenuto).
          </p>
        </div>
      )}

      {error && (
        <div className="mb-4 p-3 bg-red-900/30 border border-red-700/50 rounded-lg text-red-300 text-xs">
          {error}
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-3">
        <button
          onClick={publishToCuration}
          disabled={publishing || deleting}
          className="btn-primary flex items-center justify-center gap-2 flex-1"
        >
          {publishing ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Send className="w-4 h-4" />
          )}
          {publishing
            ? "Pubblicazione..."
            : "Pubblica Proposta"}
        </button>

        {!confirmDelete ? (
          <button
            onClick={() => setConfirmDelete(true)}
            disabled={publishing || deleting}
            className="btn-ghost flex items-center justify-center gap-2 text-slate-500 hover:text-red-400"
          >
            <Trash2 className="w-4 h-4" />
            Elimina
          </button>
        ) : (
          <div className="flex gap-2">
            <button
              onClick={deleteProposal}
              disabled={deleting}
              className="btn-ghost flex items-center justify-center gap-2 text-red-400 hover:bg-red-900/20 border-red-700/50"
            >
              {deleting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Trash2 className="w-4 h-4" />
              )}
              Conferma
            </button>
            <button
              onClick={() => setConfirmDelete(false)}
              className="btn-ghost text-slate-500"
            >
              Annulla
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

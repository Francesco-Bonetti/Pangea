"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import { ArrowLeft, Save, Send, FileText, Info, Loader2 } from "lucide-react";
import Link from "next/link";

export default function NewProposalPage() {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [dispositivo, setDispositivo] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();

  async function saveProposal(status: "draft" | "active") {
    setError(null);
    const isSave = status === "draft";
    if (isSave) setSaving(true);
    else setPublishing(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/auth");
        return;
      }

      const payload = {
        author_id: user.id,
        title: title.trim(),
        content: content.trim(),
        dispositivo: dispositivo.trim() || null,
        status,
        expires_at: expiresAt ? new Date(expiresAt).toISOString() : null,
      };

      const { data, error: insertError } = await supabase
        .from("proposals")
        .insert(payload)
        .select()
        .single();

      if (insertError) throw insertError;

      if (status === "draft") {
        router.push("/dashboard");
      } else {
        router.push(`/proposals/${data.id}`);
      }
      router.refresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Errore durante il salvataggio";
      setError(msg);
    } finally {
      setSaving(false);
      setPublishing(false);
    }
  }

  const isValid = title.trim().length >= 5 && content.trim().length >= 20;

  return (
    <div className="min-h-screen bg-[#0c1220]">
      <Navbar />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link
            href="/dashboard"
            className="p-2 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <FileText className="w-6 h-6 text-pangea-400" />
              Nuova Proposta Legislativa
            </h1>
            <p className="text-sm text-slate-400 mt-0.5">
              Redigi un atto normativo per la deliberazione del popolo di Pangea
            </p>
          </div>
        </div>

        {/* Guida */}
        <div className="card p-4 mb-6 bg-pangea-900/10 border-pangea-800/30 flex gap-3">
          <Info className="w-5 h-5 text-pangea-400 shrink-0 mt-0.5" />
          <div className="text-sm text-slate-400">
            <p className="text-slate-300 font-medium mb-1">Come redigere una proposta</p>
            <p>
              Ogni proposta è composta da: un <strong className="text-slate-200">titolo</strong> sintetico,
              un <strong className="text-slate-200">contesto</strong> che illustra il problema e la soluzione,
              e un <strong className="text-slate-200">dispositivo normativo</strong> con gli articoli della legge.
            </p>
          </div>
        </div>

        <div className="space-y-6">
          {/* Titolo */}
          <div>
            <label className="label">
              Titolo della Proposta <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              className="input-field text-lg"
              placeholder="Es: Istituzione del diritto universale all'istruzione digitale"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={200}
              required
            />
            <p className="text-xs text-slate-600 mt-1.5">{title.length}/200 caratteri</p>
          </div>

          {/* Contesto */}
          <div>
            <label className="label">
              Contesto e Motivazione <span className="text-red-400">*</span>
            </label>
            <textarea
              className="input-field min-h-[180px] resize-y"
              placeholder="Descrivi il problema che questa proposta intende risolvere, il contesto normativo esistente, e le motivazioni che giustificano questa iniziativa legislativa..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              required
            />
            <p className="text-xs text-slate-600 mt-1.5">{content.length} caratteri</p>
          </div>

          {/* Dispositivo normativo */}
          <div>
            <label className="label">Dispositivo Normativo</label>
            <textarea
              className="input-field min-h-[200px] font-mono text-sm resize-y"
              placeholder={"Art. 1 - Principi generali\nLa Repubblica Democratica Globale Pangea garantisce...\n\nArt. 2 - Definizioni\nAi fini della presente legge si intende per..."}
              value={dispositivo}
              onChange={(e) => setDispositivo(e.target.value)}
            />
            <p className="text-xs text-slate-600 mt-1.5">
              Facoltativo — articoli specifici della proposta di legge
            </p>
          </div>

          {/* Data scadenza */}
          <div>
            <label className="label">Data di chiusura votazione</label>
            <input
              type="datetime-local"
              className="input-field"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
              min={new Date().toISOString().slice(0, 16)}
            />
            <p className="text-xs text-slate-600 mt-1.5">
              Facoltativo — la votazione resterà aperta a tempo indeterminato se non specificato
            </p>
          </div>

          {/* Errore */}
          {error && (
            <div className="p-4 bg-red-900/30 border border-red-700/50 rounded-lg text-red-300 text-sm">
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-slate-700/50">
            <button
              onClick={() => saveProposal("draft")}
              disabled={!isValid || saving || publishing}
              className="btn-secondary flex items-center justify-center gap-2"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Salva come Bozza
            </button>

            <button
              onClick={() => saveProposal("active")}
              disabled={!isValid || saving || publishing}
              className="btn-primary flex items-center justify-center gap-2 sm:ml-auto"
            >
              {publishing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              Pubblica per la Delibera
            </button>
          </div>

          {!isValid && (
            <p className="text-xs text-slate-600 text-center">
              Inserisci un titolo (min. 5 caratteri) e un contesto (min. 20 caratteri) per procedere
            </p>
          )}
        </div>
      </main>
    </div>
  );
}

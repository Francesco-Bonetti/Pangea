"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import type { Category } from "@/lib/types";
import {
  ArrowLeft,
  Save,
  Send,
  FileText,
  Info,
  Loader2,
  Plus,
  X,
  Tag,
} from "lucide-react";
import Link from "next/link";

interface OptionDraft {
  title: string;
  description: string;
}

export default function NewProposalPage() {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [dispositivo, setDispositivo] = useState("");
  const [categoryId, setCategoryId] = useState<string>("");
  const [categories, setCategories] = useState<Category[]>([]);
  const [options, setOptions] = useState<OptionDraft[]>([
    { title: "", description: "" },
    { title: "", description: "" },
  ]);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();

  // Carica categorie
  useEffect(() => {
    async function loadCategories() {
      const { data } = await supabase
        .from("categories")
        .select("*")
        .order("name");
      if (data) setCategories(data);
    }
    loadCategories();
  }, [supabase]);

  function addOption() {
    if (options.length < 10) {
      setOptions([...options, { title: "", description: "" }]);
    }
  }

  function removeOption(index: number) {
    if (options.length > 2) {
      setOptions(options.filter((_, i) => i !== index));
    }
  }

  function updateOption(index: number, field: keyof OptionDraft, value: string) {
    const updated = [...options];
    updated[index] = { ...updated[index], [field]: value };
    setOptions(updated);
  }

  async function saveProposal(status: "draft" | "curation") {
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
        category_id: categoryId || null,
        expires_at: null,
      };

      const { data, error: insertError } = await supabase
        .from("proposals")
        .insert(payload)
        .select()
        .single();

      if (insertError) throw insertError;

      // Inserisci le opzioni deliberative (se la proposta va in curatela)
      if (status === "curation" && data) {
        const validOptions = options.filter((o) => o.title.trim().length > 0);
        if (validOptions.length >= 2) {
          const optionRows = validOptions.map((o) => ({
            proposal_id: data.id,
            title: o.title.trim(),
            description: o.description.trim() || null,
          }));

          const { error: optError } = await supabase
            .from("proposal_options")
            .insert(optionRows);

          if (optError) throw optError;
        }
      }

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

  const validOptions = options.filter((o) => o.title.trim().length > 0);
  const isValid = title.trim().length >= 5 && content.trim().length >= 20;
  const isPublishValid = isValid && validOptions.length >= 2;

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
              Nuova Proposta di Legge
            </h1>
            <p className="text-sm text-slate-400 mt-0.5">
              Scrivi la tua proposta e lascia che i cittadini la valutino
            </p>
          </div>
        </div>

        {/* Guida */}
        <div className="card p-4 mb-6 bg-pangea-900/10 border-pangea-800/30 flex gap-3">
          <Info className="w-5 h-5 text-pangea-400 shrink-0 mt-0.5" />
          <div className="text-sm text-slate-400">
            <p className="text-slate-300 font-medium mb-1">Come funziona</p>
            <p>
              La tua proposta viene prima pubblicata in <strong className="text-amber-300">bacheca</strong> dove
              i cittadini possono sostenerla con un click. Quando riceve abbastanza supporto,
              passa alla <strong className="text-pangea-300">votazione</strong> dove tutti possono esprimere
              la propria preferenza tra le scelte che hai definito.
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

          {/* Categoria */}
          <div>
            <label className="label flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5" />
              Dominio Tematico
            </label>
            <select
              className="input-field"
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
            >
              <option value="">Nessuna categoria specifica</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name} {cat.description ? `— ${cat.description}` : ""}
                </option>
              ))}
            </select>
            <p className="text-xs text-slate-600 mt-1.5">
              Aiuta i cittadini a trovare le proposte del loro ambito di interesse
            </p>
          </div>

          {/* Contesto */}
          <div>
            <label className="label">
              Perché serve questa legge? <span className="text-red-400">*</span>
            </label>
            <textarea
              className="input-field min-h-[180px] resize-y"
              placeholder="Spiega il problema che vuoi risolvere e perché pensi sia importante per la comunità..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              required
            />
            <p className="text-xs text-slate-600 mt-1.5">{content.length} caratteri</p>
          </div>

          {/* Dispositivo normativo */}
          <div>
            <label className="label">Testo della legge proposta</label>
            <textarea
              className="input-field min-h-[150px] font-mono text-sm resize-y"
              placeholder={"Art. 1 - Cosa si stabilisce\nLa Repubblica di Pangea garantisce...\n\nArt. 2 - Come funziona\nPer applicare questa legge..."}
              value={dispositivo}
              onChange={(e) => setDispositivo(e.target.value)}
            />
            <p className="text-xs text-slate-600 mt-1.5">
              Facoltativo — scrivi gli articoli della legge vera e propria
            </p>
          </div>

          {/* Opzioni deliberative */}
          <div>
            <label className="label">
              Scelte per la votazione <span className="text-red-400">*</span>
            </label>
            <p className="text-xs text-slate-500 mb-3">
              Proponi almeno 2 alternative tra cui i cittadini potranno scegliere.
              Per esempio: &quot;Approvare così com&apos;è&quot; e &quot;Approvare con modifiche&quot;.
            </p>

            <div className="space-y-3">
              {options.map((opt, i) => (
                <div key={i} className="card p-4 relative">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-slate-500 font-medium">
                      Opzione {i + 1}
                    </span>
                    {options.length > 2 && (
                      <button
                        onClick={() => removeOption(i)}
                        className="text-slate-600 hover:text-red-400 transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  <input
                    type="text"
                    className="input-field mb-2"
                    placeholder={`Titolo opzione ${i + 1}`}
                    value={opt.title}
                    onChange={(e) => updateOption(i, "title", e.target.value)}
                    maxLength={200}
                  />
                  <textarea
                    className="input-field text-sm min-h-[60px] resize-y"
                    placeholder="Spiega questa alternativa in breve (facoltativo)"
                    value={opt.description}
                    onChange={(e) => updateOption(i, "description", e.target.value)}
                  />
                </div>
              ))}
            </div>

            {options.length < 10 && (
              <button
                onClick={addOption}
                className="mt-3 btn-ghost text-sm flex items-center gap-1.5 text-pangea-400 hover:text-pangea-300"
              >
                <Plus className="w-4 h-4" />
                Aggiungi opzione
              </button>
            )}
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
              onClick={() => saveProposal("curation")}
              disabled={!isPublishValid || saving || publishing}
              className="btn-primary flex items-center justify-center gap-2 sm:ml-auto"
            >
              {publishing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              Pubblica in bacheca
            </button>
          </div>

          {!isPublishValid && (
            <p className="text-xs text-slate-600 text-center">
              {!isValid
                ? "Inserisci un titolo (min. 5 caratteri) e una motivazione (min. 20 caratteri)"
                : "Aggiungi almeno 2 scelte per la votazione"}
            </p>
          )}
        </div>
      </main>
    </div>
  );
}

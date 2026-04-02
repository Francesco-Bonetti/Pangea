"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import TagInput from "@/components/TagInput";
import LawTreeSelector from "@/components/LawTreeSelector";
import {
  ArrowLeft,
  Save,
  Send,
  FileText,
  Info,
  Loader2,
  Plus,
  X,
  GitBranch,
  Edit3,
  Trash2,
  BookOpen,
} from "lucide-react";
import Link from "next/link";

interface OptionDraft {
  title: string;
  description: string;
}

type ProposalType = "new" | "amendment" | "repeal";

export default function NewProposalPage() {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [dispositivo, setDispositivo] = useState("");
  const [proposalType, setProposalType] = useState<ProposalType>("new");
  const [parentProposalId, setParentProposalId] = useState<string | null>(null);
  const [parentLawTitle, setParentLawTitle] = useState<string | null>(null);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [lawParentId, setLawParentId] = useState<string | null>(null);
  const [replacesNodeId, setReplacesNodeId] = useState<string | null>(null);
  const [showTreeSelector, setShowTreeSelector] = useState(false);
  const [showLawPicker, setShowLawPicker] = useState(false);
  const [expiresIn, setExpiresIn] = useState<string>("7");
  const [lawSearchQuery, setLawSearchQuery] = useState("");
  const [lawSearchResults, setLawSearchResults] = useState<{id: string; title: string; code: string | null}[]>([]);
  const [options, setOptions] = useState<OptionDraft[]>([
    { title: "", description: "" },
    { title: "", description: "" },
  ]);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();

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

  async function searchLaws(query: string) {
    setLawSearchQuery(query);
    if (query.trim().length < 2) { setLawSearchResults([]); return; }
    const { data } = await supabase
      .from("laws")
      .select("id, title, code")
      .ilike("title", `%${query.trim()}%`)
      .eq("status", "active")
      .limit(10);
    setLawSearchResults(data ?? []);
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

      // Calculate expiration date
      const days = parseInt(expiresIn);
      const expiresAt = days > 0 ? new Date(Date.now() + days * 86400000).toISOString() : null;

      const payload: Record<string, unknown> = {
        author_id: user.id,
        title: title.trim(),
        content: content.trim(),
        dispositivo: dispositivo.trim() || null,
        status,
        category_id: null,
        expires_at: expiresAt,
        proposal_type: proposalType,
        parent_proposal_id: parentProposalId,
      };

      const { data, error: insertError } = await supabase
        .from("proposals")
        .insert(payload)
        .select()
        .single();

      if (insertError) throw insertError;

      // Inserisci i tag associati alla proposta
      if (data && selectedTags.length > 0) {
        const tagRows = selectedTags.map((tagId) => ({
          proposal_id: data.id,
          tag_id: tagId,
        }));
        await supabase.from("proposal_tags").insert(tagRows);
      }

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
          {/* Tipo di proposta */}
          <div>
            <label className="label">Tipo di proposta</label>
            <div className="grid grid-cols-3 gap-3">
              {([
                { type: "new" as ProposalType, label: "Nuova Legge", icon: FileText, desc: "Proponi una legge nuova" },
                { type: "amendment" as ProposalType, label: "Emendamento", icon: Edit3, desc: "Modifica una legge esistente" },
                { type: "repeal" as ProposalType, label: "Abrogazione", icon: Trash2, desc: "Abroga una legge esistente" },
              ]).map(({ type, label, icon: Icon, desc }) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => {
                    setProposalType(type);
                    if (type === "new") { setParentProposalId(null); setParentLawTitle(null); }
                    else setShowLawPicker(true);
                  }}
                  className={`card p-4 text-left transition-all ${
                    proposalType === type
                      ? "border-pangea-500 bg-pangea-900/20"
                      : "hover:border-slate-600"
                  }`}
                >
                  <Icon className={`w-5 h-5 mb-2 ${
                    proposalType === type ? "text-pangea-400" : "text-slate-500"
                  }`} />
                  <p className={`text-sm font-medium ${
                    proposalType === type ? "text-pangea-300" : "text-slate-300"
                  }`}>{label}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{desc}</p>
                </button>
              ))}
            </div>

            {/* Law picker for amendment/repeal */}
            {(proposalType === "amendment" || proposalType === "repeal") && (
              <div className="mt-4 card p-4">
                <label className="label flex items-center gap-1.5">
                  <BookOpen className="w-3.5 h-3.5" />
                  {proposalType === "amendment" ? "Legge da emendare" : "Legge da abrogare"}
                </label>
                {parentLawTitle ? (
                  <div className="flex items-center gap-3 bg-pangea-900/20 border border-pangea-700/30 rounded-lg px-4 py-3">
                    <BookOpen className="w-4 h-4 text-pangea-400" />
                    <span className="text-sm text-slate-200 font-medium flex-1">{parentLawTitle}</span>
                    <button onClick={() => { setParentProposalId(null); setParentLawTitle(null); }} className="text-slate-500 hover:text-red-400">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <>
                    <input
                      type="text"
                      className="input-field"
                      placeholder="Cerca una legge per titolo..."
                      value={lawSearchQuery}
                      onChange={(e) => searchLaws(e.target.value)}
                    />
                    {lawSearchResults.length > 0 && (
                      <div className="mt-2 border border-slate-700 rounded-lg overflow-hidden max-h-48 overflow-y-auto">
                        {lawSearchResults.map((law) => (
                          <button
                            key={law.id}
                            type="button"
                            onClick={() => {
                              setParentProposalId(law.id);
                              setParentLawTitle(law.title);
                              setLawSearchQuery("");
                              setLawSearchResults([]);
                              setShowLawPicker(false);
                            }}
                            className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-slate-800 transition-colors border-b border-slate-700/50 last:border-b-0"
                          >
                            <BookOpen className="w-4 h-4 text-blue-400 shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm text-slate-200 truncate">{law.title}</p>
                              {law.code && <p className="text-xs text-slate-500">{law.code}</p>}
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>

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

          {/* Hashtag */}
          <div>
            <TagInput selectedTags={selectedTags} onTagsChange={setSelectedTags} />
          </div>

          {/* Posizione nell'albero delle leggi */}
          <div>
            <button
              type="button"
              onClick={() => setShowTreeSelector(!showTreeSelector)}
              className="label flex items-center gap-1.5 cursor-pointer hover:text-slate-200 transition-colors"
            >
              <GitBranch className="w-3.5 h-3.5" />
              Posizione nell&apos;albero delle leggi
              <span className="text-xs font-normal text-slate-500 ml-1">(facoltativo)</span>
            </button>
            {!showTreeSelector && (
              <p className="text-xs text-slate-600 mt-1">
                Clicca per scegliere dove inserire la legge nell&apos;ordinamento o quale norma sostituire
              </p>
            )}
            {showTreeSelector && (
              <LawTreeSelector
                selectedParentId={lawParentId}
                replacesNodeId={replacesNodeId}
                onSelect={(parentId, replaces) => {
                  setLawParentId(parentId);
                  setReplacesNodeId(replaces);
                }}
              />
            )}
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

          {/* Durata delibera */}
          <div>
            <label className="label">Durata della delibera</label>
            <select
              className="input-field"
              value={expiresIn}
              onChange={(e) => setExpiresIn(e.target.value)}
            >
              <option value="3">3 giorni</option>
              <option value="7">7 giorni</option>
              <option value="14">14 giorni</option>
              <option value="30">30 giorni</option>
              <option value="0">Senza scadenza</option>
            </select>
            <p className="text-xs text-slate-600 mt-1.5">
              Dopo la scadenza, la proposta viene chiusa automaticamente e il risultato diventa definitivo
            </p>
          </div>

          {/* Opzioni deliberative */}
          <div>
            <label className="label">
              Scelte per la votazione <span className="text-red-400">*</span>
            </label>
            <div className="bg-slate-800/40 border border-slate-700/40 rounded-lg p-3 mb-3">
              <p className="text-sm text-slate-300 mb-2">
                In Pangea non si vota solo &quot;sì o no&quot;: ogni cittadino distribuisce il proprio voto
                in percentuale tra le opzioni che proponi tu. Questo permette di esprimere sfumature,
                non solo posizioni nette.
              </p>
              <p className="text-xs text-slate-400">
                Scrivi almeno 2 alternative. Per esempio: &quot;Approvare il testo così com&apos;è&quot;,
                &quot;Approvare con modifiche&quot;, &quot;Respingere e riscrivere&quot;.
                Più opzioni dai, più ricca sarà la discussione.
              </p>
            </div>

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

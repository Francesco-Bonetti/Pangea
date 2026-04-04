"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import AppShell from "@/components/AppShell";
import TagInput from "@/components/TagInput";
import LawTreeSelector from "@/components/LawTreeSelector";
import { useEffect } from "react";
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
  const [customDate, setCustomDate] = useState<string>("");
  const [customDays, setCustomDays] = useState<string>("");
  const [lawSearchQuery, setLawSearchQuery] = useState("");
  const [lawSearchResults, setLawSearchResults] = useState<{id: string; title: string; code: string | null}[]>([]);
  const [options, setOptions] = useState<OptionDraft[]>([
    { title: "", description: "" },
    { title: "", description: "" },
  ]);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string>("citizen");
  const router = useRouter();
  const supabase = createClient();

  // Load user info for Navbar
  useEffect(() => {
    async function loadUser() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserEmail(user.email ?? null);
        const { data: prof } = await supabase
          .from("profiles")
          .select("full_name, role")
          .eq("id", user.id)
          .single();
        setUserName(prof?.full_name ?? null);
        setUserRole(prof?.role ?? "citizen");
      }
    }
    loadUser();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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
      let expiresAt: string | null = null;
      if (expiresIn === "custom") {
        if (customDate) {
          expiresAt = new Date(customDate + "T23:59:59Z").toISOString();
        } else if (customDays && parseInt(customDays) > 0) {
          expiresAt = new Date(Date.now() + parseInt(customDays) * 86400000).toISOString();
        }
      } else {
        const days = parseInt(expiresIn);
        expiresAt = days > 0 ? new Date(Date.now() + days * 86400000).toISOString() : null;
      }

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

      // Insert tags associated with the proposal
      if (data && selectedTags.length > 0) {
        const tagRows = selectedTags.map((tagId) => ({
          proposal_id: data.id,
          tag_id: tagId,
        }));
        await supabase.from("proposal_tags").insert(tagRows);
      }

      // Insert deliberative options (if proposal goes to curation)
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
      const msg = err instanceof Error ? err.message : "Error while saving";
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
    <AppShell userEmail={userEmail} userName={userName} userRole={userRole}>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8 overflow-hidden">
          <Link
            href="/dashboard"
            className="p-2 rounded-lg text-fg-muted hover:text-fg hover:bg-theme-card transition-colors shrink-0"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold text-fg flex items-center gap-2 overflow-hidden">
              <FileText className="w-6 h-6 text-fg-primary shrink-0" />
              <span className="truncate">New Proposal</span>
            </h1>
            <p className="text-sm text-fg-muted mt-0.5">
              Write your proposal and let citizens evaluate it
            </p>
          </div>
        </div>

        {/* Guida */}
        <div className="card p-4 mb-6 bg-pangea-900/10 border-pangea-800/30 flex gap-3">
          <Info className="w-5 h-5 text-fg-primary shrink-0 mt-0.5" />
          <div className="text-sm text-fg-muted">
            <p className="text-fg font-medium mb-1">How it works</p>
            <p>
              Your proposal is first published for <strong className="text-amber-300">community review</strong> where
              citizens can support it with a click. When it receives enough support,
              it moves to the <strong className="text-fg-primary">voting phase</strong> where everyone can express
              their preference among the options you defined.
            </p>
          </div>
        </div>

        <div className="space-y-6">
          {/* Proposal type */}
          <div>
            <label className="label">Proposal type</label>
            <div className="grid grid-cols-3 gap-3">
              {([
                { type: "new" as ProposalType, label: "New Law", icon: FileText, desc: "Propose a new law" },
                { type: "amendment" as ProposalType, label: "Amendment", icon: Edit3, desc: "Modify an existing law" },
                { type: "repeal" as ProposalType, label: "Repeal", icon: Trash2, desc: "Repeal an existing law" },
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
                      : "hover:border-theme"
                  }`}
                >
                  <Icon className={`w-5 h-5 mb-2 ${
                    proposalType === type ? "text-fg-primary" : "text-fg-muted"
                  }`} />
                  <p className={`text-sm font-medium ${
                    proposalType === type ? "text-fg-primary" : "text-fg"
                  }`}>{label}</p>
                  <p className="text-xs text-fg-muted mt-0.5">{desc}</p>
                </button>
              ))}
            </div>

            {/* Law picker for amendment/repeal */}
            {(proposalType === "amendment" || proposalType === "repeal") && (
              <div className="mt-4 card p-4">
                <label className="label flex items-center gap-1.5 overflow-hidden">
                  <BookOpen className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">{proposalType === "amendment" ? "Law to amend" : "Law to repeal"}</span>
                </label>
                {parentLawTitle ? (
                  <div className="flex items-center gap-3 bg-pangea-900/20 border border-pangea-700/30 rounded-lg px-4 py-3 overflow-hidden">
                    <BookOpen className="w-4 h-4 text-fg-primary shrink-0" />
                    <span className="text-sm text-fg font-medium flex-1 truncate">{parentLawTitle}</span>
                    <button onClick={() => { setParentProposalId(null); setParentLawTitle(null); }} className="text-fg-muted hover:text-fg-danger shrink-0">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <>
                    <input
                      type="text"
                      className="input-field"
                      placeholder="Search for a law by title..."
                      value={lawSearchQuery}
                      onChange={(e) => searchLaws(e.target.value)}
                    />
                    {lawSearchResults.length > 0 && (
                      <div className="mt-2 border border-theme rounded-lg overflow-hidden max-h-48 overflow-y-auto">
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
                            className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-theme-card transition-colors border-b border-theme last:border-b-0"
                          >
                            <BookOpen className="w-4 h-4 text-blue-400 shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm text-fg truncate">{law.title}</p>
                              {law.code && <p className="text-xs text-fg-muted">{law.code}</p>}
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

          {/* Title */}
          <div>
            <label className="label">
              Proposal Title <span className="text-fg-danger">*</span>
            </label>
            <p className="text-xs text-fg-muted mb-2">
              A clear, concise title that summarizes what this proposal does. Citizens will see this first when browsing proposals. Example: &quot;Universal Right to Digital Education&quot; or &quot;Carbon Tax on Imports Above 50 Tons&quot;.
            </p>
            <input
              type="text"
              className="input-field text-lg"
              placeholder="e.g. Establishment of the universal right to digital education"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={200}
              required
            />
            <p className="text-xs text-fg-muted mt-1.5">{title.length}/200 characters</p>
          </div>

          {/* Hashtag */}
          <div>
            <TagInput selectedTags={selectedTags} onTagsChange={setSelectedTags} />
          </div>

          {/* Position in the law tree */}
          <div>
            <label className="label flex items-center gap-1.5 overflow-hidden">
              <GitBranch className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">Position in the law tree</span>
              <span className="text-xs font-normal text-fg-muted ml-1 shrink-0">(optional)</span>
            </label>
            <p className="text-xs text-fg-muted mb-2">
              Choose where this law should be placed in Pangea&apos;s legal framework. You can add it as a child of an existing code, or replace an existing article. If you&apos;re unsure, skip this — the community can suggest a placement later.
            </p>
            <button
              type="button"
              onClick={() => setShowTreeSelector(!showTreeSelector)}
              className={`w-full px-4 py-3 rounded-lg border text-sm font-medium transition-colors text-left flex items-center gap-2 ${
                showTreeSelector
                  ? "border-fg-primary/50 bg-fg-primary/10 text-fg-primary"
                  : lawParentId || replacesNodeId
                    ? "border-fg-success/50 bg-fg-success/10 text-fg-success"
                    : "border-theme text-fg-muted hover:border-fg-primary/30 hover:text-fg"
              }`}
            >
              <GitBranch className="w-4 h-4 shrink-0" />
              {lawParentId || replacesNodeId
                ? "Position selected — click to change"
                : showTreeSelector
                  ? "Close tree selector"
                  : "Open tree selector to choose position"
              }
            </button>
            {showTreeSelector && (
              <div className="mt-3">
                <LawTreeSelector
                  selectedParentId={lawParentId}
                  replacesNodeId={replacesNodeId}
                  onSelect={(parentId, replaces) => {
                    setLawParentId(parentId);
                    setReplacesNodeId(replaces);
                  }}
                />
              </div>
            )}
          </div>

          {/* Contesto */}
          <div>
            <label className="label">
              Why is this law needed? <span className="text-fg-danger">*</span>
            </label>
            <p className="text-xs text-fg-muted mb-2">
              Explain the problem this proposal solves and why citizens should care. This is the most important part — a well-argued motivation helps others understand your vision. Example: &quot;Currently, 40% of Pangea&apos;s citizens lack access to online courses. This law would guarantee free digital education to every citizen, reducing inequality and boosting innovation.&quot;
            </p>
            <textarea
              className="input-field min-h-[180px] resize-y"
              placeholder="Explain the problem you want to solve and why you think it matters to the community..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              required
            />
            <p className="text-xs text-fg-muted mt-1.5">{content.length} characters (min. 20)</p>
          </div>

          {/* Dispositivo normativo */}
          <div>
            <label className="label">Proposed law text</label>
            <p className="text-xs text-fg-muted mb-2">
              Write the actual articles of the law, if you have them. This is optional — you can propose an idea without a full text and let the community help refine it. Example: &quot;Art. 1 — Every citizen has the right to free digital education. Art. 2 — The Ministry of Education shall provide...&quot;
            </p>
            <textarea
              className="input-field min-h-[150px] font-mono text-sm resize-y"
              placeholder={"Art. 1 - What is established\nThe Commonwealth of Pangea guarantees...\n\nArt. 2 - How it works\nTo enforce this law..."}
              value={dispositivo}
              onChange={(e) => setDispositivo(e.target.value)}
            />
          </div>

          {/* Durata delibera */}
          <div>
            <label className="label">Voting duration</label>
            <p className="text-xs text-fg-muted mb-2">
              Choose how long citizens can vote on this proposal. Shorter durations are good for urgent matters, longer ones allow more participation. After expiration, the proposal is automatically closed and the result becomes final.
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-3">
              {[
                { value: "3", label: "3 days" },
                { value: "7", label: "7 days" },
                { value: "14", label: "14 days" },
                { value: "30", label: "30 days" },
                { value: "0", label: "No expiration" },
                { value: "custom", label: "Custom..." },
              ].map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    setExpiresIn(opt.value);
                    if (opt.value !== "custom") {
                      setCustomDate("");
                      setCustomDays("");
                    }
                  }}
                  className={`px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${
                    expiresIn === opt.value
                      ? "border-fg-primary/50 bg-fg-primary/10 text-fg-primary"
                      : "border-theme text-fg-muted hover:border-fg-primary/30 hover:text-fg"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            {expiresIn === "custom" && (
              <div className="card p-4 space-y-3">
                <div>
                  <label className="text-xs text-fg-muted font-medium block mb-1">Exact number of days</label>
                  <input
                    type="number"
                    min="1"
                    max="365"
                    className="input-field"
                    placeholder="e.g. 45"
                    value={customDays}
                    onChange={(e) => {
                      setCustomDays(e.target.value);
                      setCustomDate("");
                    }}
                  />
                </div>
                <div className="text-xs text-fg-muted text-center">or</div>
                <div>
                  <label className="text-xs text-fg-muted font-medium block mb-1">Pick a specific end date</label>
                  <input
                    type="date"
                    className="input-field"
                    min={new Date(Date.now() + 86400000).toISOString().split("T")[0]}
                    value={customDate}
                    onChange={(e) => {
                      setCustomDate(e.target.value);
                      setCustomDays("");
                    }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Opzioni deliberative */}
          <div>
            <label className="label">
              Voting options <span className="text-fg-danger">*</span>
            </label>
            <div className="bg-theme-card/40 border border-theme/40 rounded-lg p-3 mb-3">
              <p className="text-sm text-fg mb-2">
                In Pangea, voting is not just &quot;yes or no&quot;: each citizen distributes their vote
                as a percentage among the options you propose. This allows for nuanced positions,
                not just binary choices.
              </p>
              <p className="text-xs text-fg-muted">
                Write at least 2 alternatives. For example: &quot;Approve the text as is&quot;,
                &quot;Approve with modifications&quot;, &quot;Reject and rewrite&quot;.
                The more options you offer, the richer the discussion.
              </p>
            </div>

            <div className="space-y-3">
              {options.map((opt, i) => (
                <div key={i} className="card p-4 relative">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-fg-muted font-medium">
                      Option {i + 1}
                    </span>
                    {options.length > 2 && (
                      <button
                        onClick={() => removeOption(i)}
                        className="text-fg-muted hover:text-fg-danger transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  <input
                    type="text"
                    className="input-field mb-2"
                    placeholder={`Option ${i + 1} title`}
                    value={opt.title}
                    onChange={(e) => updateOption(i, "title", e.target.value)}
                    maxLength={200}
                  />
                  <textarea
                    className="input-field text-sm min-h-[60px] resize-y"
                    placeholder="Briefly explain this option (optional)"
                    value={opt.description}
                    onChange={(e) => updateOption(i, "description", e.target.value)}
                  />
                </div>
              ))}
            </div>

            {options.length < 10 && (
              <button
                onClick={addOption}
                className="mt-3 btn-ghost text-sm flex items-center gap-1.5 text-fg-primary hover:text-fg-primary overflow-hidden"
              >
                <Plus className="w-4 h-4 shrink-0" />
                <span className="truncate">Add option</span>
              </button>
            )}
          </div>

          {/* Errore */}
          {error && (
            <div className="p-4 bg-danger-tint border border-theme rounded-lg text-fg-danger text-sm">
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-theme">
            <button
              onClick={() => saveProposal("draft")}
              disabled={!isValid || saving || publishing}
              className="btn-secondary flex items-center justify-center gap-2 overflow-hidden"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin shrink-0" /> : <Save className="w-4 h-4 shrink-0" />}
              <span className="truncate">Save as Draft</span>
            </button>

            <button
              onClick={() => saveProposal("curation")}
              disabled={!isPublishValid || saving || publishing}
              className="btn-primary flex items-center justify-center gap-2 sm:ml-auto overflow-hidden"
            >
              {publishing ? <Loader2 className="w-4 h-4 animate-spin shrink-0" /> : <Send className="w-4 h-4 shrink-0" />}
              <span className="truncate">Publish for Review</span>
            </button>
          </div>

          {!isPublishValid && (
            <p className="text-xs text-fg-muted text-center">
              {!isValid
                ? "Enter a title (min. 5 characters) and a reason (min. 20 characters)"
                : "Add at least 2 voting options"}
            </p>
          )}
        </div>
      </div>
    </AppShell>
  );
}

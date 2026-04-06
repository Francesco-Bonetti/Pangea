"use client";

import { useState, useRef, useEffect } from "react";
import { Bug, X, Send, Loader2, CheckCircle2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useLanguage } from "@/components/language-provider";

type ReportCategory = "bug" | "suggestion" | "question" | "other";

const getCategoriesWithTranslations = (t: (key: string) => string): { value: ReportCategory; label: string }[] => [
  { value: "bug", label: t("bugReport.bugReport") },
  { value: "suggestion", label: t("bugReport.suggestion") },
  { value: "question", label: t("bugReport.question") },
  { value: "other", label: t("bugReport.other") },
];

export default function BugReportButton() {
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState<ReportCategory>("bug");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // Close on click outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        if (open && !loading) setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [open, loading]);

  // Close on Escape
  useEffect(() => {
    function handleEsc(e: KeyboardEvent) {
      if (e.key === "Escape" && open && !loading) setOpen(false);
    }
    document.addEventListener("keydown", handleEsc);
    return () => document.removeEventListener("keydown", handleEsc);
  }, [open, loading]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) {
      setError(t("bugReport.pleaseProvideTitle"));
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const { error: insertError } = await supabase.from("bug_reports").insert({
        user_id: user?.id || null,
        category,
        title: title.trim(),
        description: description.trim() || null,
        page_url: window.location.href,
        user_agent: navigator.userAgent,
      });

      if (insertError) throw insertError;

      setSuccess(true);
      setTimeout(() => {
        setOpen(false);
        setSuccess(false);
        setTitle("");
        setDescription("");
        setCategory("bug");
      }, 2000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : t("bugReport.error");
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed bottom-6 right-6 z-[9999]" ref={panelRef}>
      {/* Report Panel */}
      {open && (
        <div
          className="absolute bottom-16 right-0 w-80 sm:w-96 rounded-xl shadow-2xl border overflow-hidden"
          style={{
            backgroundColor: "var(--card)",
            borderColor: "var(--border)",
          }}
        >
          {/* Header */}
          <div
            className="flex items-center justify-between px-4 py-3 border-b"
            style={{
              borderColor: "var(--border)",
              backgroundColor: "var(--muted)",
            }}
          >
            <h3 className="text-sm font-semibold" style={{ color: "var(--foreground)" }}>
              {t("bugReport.title")}
            </h3>
            <button
              onClick={() => setOpen(false)}
              className="p-1 rounded-lg transition-colors hover:bg-[var(--border)]"
              style={{ color: "var(--muted-foreground)" }}
              disabled={loading}
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {success ? (
            <div className="p-8 text-center">
              <CheckCircle2 className="w-12 h-12 mx-auto mb-3" style={{ color: "var(--success)" }} />
              <p className="font-medium" style={{ color: "var(--foreground)" }}>
                {t("bugReport.thankYou")}
              </p>
              <p className="text-sm mt-1" style={{ color: "var(--muted-foreground)" }}>
                {t("bugReport.reportSubmitted")}
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="p-4 space-y-3">
              {/* Category */}
              <div>
                <label className="text-xs font-medium mb-1 block" style={{ color: "var(--muted-foreground)" }}>
                  {t("bugReport.category")}
                </label>
                <div className="flex gap-1.5 flex-wrap">
                  {getCategoriesWithTranslations(t).map((cat) => (
                    <button
                      key={cat.value}
                      type="button"
                      onClick={() => setCategory(cat.value)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border ${
                        category === cat.value
                          ? "border-[var(--primary)] bg-[var(--primary)]/10"
                          : "border-[var(--border)] hover:border-[var(--primary)]/50"
                      }`}
                      style={{
                        color:
                          category === cat.value
                            ? "var(--primary)"
                            : "var(--muted-foreground)",
                      }}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Title */}
              <div>
                <label className="text-xs font-medium mb-1 block" style={{ color: "var(--muted-foreground)" }}>
                  {t("bugReport.titleLabel")}
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={t("bugReport.titlePlaceholder")}
                  className="w-full px-3 py-2 rounded-lg text-sm border outline-none transition-colors"
                  style={{
                    backgroundColor: "var(--background)",
                    borderColor: "var(--border)",
                    color: "var(--foreground)",
                  }}
                  maxLength={200}
                  required
                />
              </div>

              {/* Description */}
              <div>
                <label className="text-xs font-medium mb-1 block" style={{ color: "var(--muted-foreground)" }}>
                  {t("bugReport.detailsLabel")}
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder={t("bugReport.detailsPlaceholder")}
                  className="w-full px-3 py-2 rounded-lg text-sm border outline-none transition-colors resize-none"
                  style={{
                    backgroundColor: "var(--background)",
                    borderColor: "var(--border)",
                    color: "var(--foreground)",
                  }}
                  rows={3}
                  maxLength={2000}
                />
              </div>

              {/* Error */}
              {error && (
                <p className="text-xs" style={{ color: "var(--destructive)" }}>
                  {error}
                </p>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={loading || !title.trim()}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all disabled:opacity-50"
                style={{
                  backgroundColor: "var(--primary)",
                  color: "#fff",
                }}
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
                {loading ? t("bugReport.submitting") : t("bugReport.submit")}
              </button>

              <p className="text-xs text-center" style={{ color: "var(--muted-foreground)" }}>
                {t("bugReport.autoInclude")}
              </p>
            </form>
          )}
        </div>
      )}

      {/* Floating Button */}
      <button
        onClick={() => {
          setOpen(!open);
          if (success) {
            setSuccess(false);
            setTitle("");
            setDescription("");
          }
        }}
        className="w-12 h-12 rounded-full shadow-lg flex items-center justify-center transition-all duration-200 hover:scale-110 active:scale-95"
        style={{
          backgroundColor: "var(--primary)",
          color: "#fff",
        }}
        title={t("bugReport.reportTooltip")}
        aria-label={t("bugReport.reportTooltip")}
      >
        {open ? <X className="w-5 h-5" /> : <Bug className="w-5 h-5" />}
      </button>
    </div>
  );
}

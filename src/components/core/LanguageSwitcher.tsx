"use client";

import { useState, useRef, useEffect } from "react";
import { Languages } from "lucide-react";
import { useLanguage } from "@/components/core/language-provider";
import { SUPPORTED_LOCALES, type Locale } from "@/lib/i18n";
import { createClient } from "@/lib/supabase/client";

export default function LanguageSwitcher() {
  const { locale, setLocale } = useLanguage();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const supabase = createClient();

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  const current = SUPPORTED_LOCALES.find((l) => l.code === locale);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 p-2 rounded-lg transition-colors duration-150 hover:bg-[var(--muted)]"
        style={{ color: "var(--muted-foreground)" }}
        aria-label="Change language"
        title="Change language"
      >
        <Languages className="w-4 h-4" />
        <span className="text-xs font-medium hidden sm:inline">
          {current?.flag} {current?.code.toUpperCase()}
        </span>
      </button>

      {open && (
        <div
          className="absolute right-0 top-full mt-1 w-44 rounded-lg border shadow-xl z-50 overflow-hidden"
          style={{
            backgroundColor: "var(--card)",
            borderColor: "var(--border)",
          }}
        >
          {SUPPORTED_LOCALES.map((lang) => (
            <button
              key={lang.code}
              onClick={async () => {
                setLocale(lang.code as Locale);
                setOpen(false);
                // Persist to profile if logged in
                const { data: { user } } = await supabase.auth.getUser();
                if (user) {
                  await supabase.from("profiles").update({ preferred_language: lang.code }).eq("id", user.id);
                }
              }}
              className={`
                flex items-center gap-3 w-full px-4 py-2.5 text-sm transition-colors duration-100
                ${locale === lang.code ? "font-semibold" : ""}
              `}
              style={{
                color: locale === lang.code ? "var(--foreground)" : "var(--muted-foreground)",
                backgroundColor: locale === lang.code ? "var(--muted)" : "transparent",
              }}
              onMouseEnter={(e) => {
                if (locale !== lang.code) {
                  (e.target as HTMLElement).style.backgroundColor = "var(--muted)";
                }
              }}
              onMouseLeave={(e) => {
                if (locale !== lang.code) {
                  (e.target as HTMLElement).style.backgroundColor = "transparent";
                }
              }}
            >
              <span className="text-lg">{lang.flag}</span>
              <span>{lang.label}</span>
              {locale === lang.code && (
                <span className="ml-auto text-blue-400 text-xs">&#10003;</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

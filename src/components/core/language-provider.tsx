"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import {
  type Locale,
  type TranslationKeys,
  DEFAULT_LOCALE,
  LOCALE_STORAGE_KEY,
  getTranslations,
  t as tFn,
} from "@/lib/i18n";
import { createClient } from "@/lib/supabase/client";

interface LanguageContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  translations: TranslationKeys;
  t: (path: string) => string;
}

const LanguageContext = createContext<LanguageContextValue>({
  locale: DEFAULT_LOCALE,
  setLocale: () => {},
  translations: getTranslations(DEFAULT_LOCALE),
  t: (path: string) => path,
});

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(DEFAULT_LOCALE);
  const [translations, setTranslations] = useState<TranslationKeys>(
    getTranslations(DEFAULT_LOCALE)
  );

  // Load saved locale: first from profile (DB), fallback to localStorage
  useEffect(() => {
    async function loadLocale() {
      // 1. Try localStorage first for instant render
      let saved: Locale | null = null;
      try {
        saved = localStorage.getItem(LOCALE_STORAGE_KEY) as Locale | null;
        if (saved && ["en", "it", "es", "fr"].includes(saved)) {
          setLocaleState(saved);
          setTranslations(getTranslations(saved));
          document.documentElement.lang = saved;
        }
      } catch {
        // localStorage not available
      }

      // 2. Try loading from user profile (overrides localStorage if different)
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("preferred_language")
            .eq("id", user.id)
            .single();
          if (profile?.preferred_language && ["en", "it", "es", "fr"].includes(profile.preferred_language)) {
            const dbLocale = profile.preferred_language as Locale;
            if (dbLocale !== saved) {
              setLocaleState(dbLocale);
              setTranslations(getTranslations(dbLocale));
              document.documentElement.lang = dbLocale;
              try { localStorage.setItem(LOCALE_STORAGE_KEY, dbLocale); } catch { /* localStorage unavailable (private mode) */ }
            }
          }
        }
      } catch {
        // Not logged in or error — use localStorage value
      }
    }
    loadLocale();
  }, []);

  const setLocale = useCallback((newLocale: Locale) => {
    setLocaleState(newLocale);
    setTranslations(getTranslations(newLocale));
    document.documentElement.lang = newLocale;
    try {
      localStorage.setItem(LOCALE_STORAGE_KEY, newLocale);
    } catch {
      // localStorage not available
    }
  }, []);

  const t = useCallback(
    (path: string) => tFn(translations, path),
    [translations]
  );

  return (
    <LanguageContext.Provider value={{ locale, setLocale, translations, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}

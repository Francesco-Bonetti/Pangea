import en from "./translations/en";
import it from "./translations/it";
import es from "./translations/es";
import fr from "./translations/fr";
import type { TranslationKeys } from "./translations/en";

export type Locale = "en" | "it" | "es" | "fr";

export const SUPPORTED_LOCALES: { code: Locale; label: string; flag: string }[] = [
  { code: "en", label: "English", flag: "🇬🇧" },
  { code: "it", label: "Italiano", flag: "🇮🇹" },
  { code: "es", label: "Español", flag: "🇪🇸" },
  { code: "fr", label: "Français", flag: "🇫🇷" },
];

const translations: Record<Locale, TranslationKeys> = { en, it, es, fr };

export function getTranslations(locale: Locale): TranslationKeys {
  return translations[locale] || translations.en;
}

/** Deeply access nested translation keys like "nav.dashboard" */
export function t(translations: TranslationKeys, path: string): string {
  const keys = path.split(".");
  let current: unknown = translations;
  for (const key of keys) {
    if (current && typeof current === "object" && key in current) {
      current = (current as Record<string, unknown>)[key];
    } else {
      return path; // fallback: return the key path itself
    }
  }
  return typeof current === "string" ? current : path;
}

export const DEFAULT_LOCALE: Locale = "en";
export const LOCALE_STORAGE_KEY = "pangea-locale";

export type { TranslationKeys };

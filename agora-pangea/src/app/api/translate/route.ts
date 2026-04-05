import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { checkRateLimit, getClientIp, RATE_LIMITS } from "@/lib/rate-limit";

// LibreTranslate instances (primary + fallbacks)
const LIBRETRANSLATE_ENDPOINTS = [
  "https://translate.fedilab.app/translate",
  "https://libretranslate.de/translate",
  "https://translate.terraprint.co/translate",
];

// All supported languages on Pangea
const SUPPORTED_LANGS = ["en", "it", "es", "fr"];

// Delay between LibreTranslate calls to respect rate limits (ms)
const API_DELAY = 1500;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Calls LibreTranslate for a single text → target language pair.
 * Tries multiple endpoints with automatic fallback.
 * Returns translated text or null on failure.
 */
async function translateText(
  text: string,
  source: string,
  target: string
): Promise<string | null> {
  for (const endpoint of LIBRETRANSLATE_ENDPOINTS) {
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          q: text,
          source,
          target,
          format: "text",
        }),
        signal: AbortSignal.timeout(10000), // 10s timeout per endpoint
      });

      if (!res.ok) {
        console.warn(`LibreTranslate ${source}→${target} failed on ${endpoint}:`, res.status);
        continue; // try next endpoint
      }

      const data = await res.json();
      if (data.translatedText) {
        return data.translatedText;
      }
      console.warn(`LibreTranslate ${source}→${target} empty response from ${endpoint}`);
      continue;
    } catch (err) {
      console.warn(`LibreTranslate ${source}→${target} error on ${endpoint}:`, err);
      continue; // try next endpoint
    }
  }

  console.error(`LibreTranslate ${source}→${target} failed on ALL endpoints`);
  return null;
}

/**
 * POST /api/translate
 *
 * Two modes:
 *
 * 1. BATCH (on publish) — translates text into ALL other languages and saves to DB
 *    Body: { text, source_language, content_type, content_id, batch: true }
 *
 * 2. SINGLE (fallback / on-demand) — translates into one target language
 *    Body: { text, source_language, target_language, content_type?, content_id? }
 */
export async function POST(request: Request) {
  // Rate limiting
  const clientIp = getClientIp(request);
  const rateLimitResult = checkRateLimit(`translate:${clientIp}`, RATE_LIMITS.translate);
  if (!rateLimitResult.success) {
    return NextResponse.json(
      { error: "Too many translation requests. Please wait a moment." },
      {
        status: 429,
        headers: {
          "Retry-After": String(Math.ceil((rateLimitResult.resetAt - Date.now()) / 1000)),
          "X-RateLimit-Limit": String(rateLimitResult.limit),
          "X-RateLimit-Remaining": "0",
        },
      }
    );
  }

  try {
    const body = await request.json();
    const {
      text,
      source_language,
      target_language,
      content_type,
      content_id,
      batch,
    } = body;

    if (!text) {
      return NextResponse.json(
        { error: "Missing required field: text" },
        { status: 400 }
      );
    }

    const sourceLang = source_language || "en";

    // Supabase client with service role (bypass RLS)
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // ─── BATCH MODE: translate into all other languages ───
    if (batch) {
      if (!content_type || !content_id) {
        return NextResponse.json(
          { error: "Batch mode requires content_type and content_id" },
          { status: 400 }
        );
      }

      const targetLangs = SUPPORTED_LANGS.filter((l) => l !== sourceLang);
      const results: Record<string, string | null> = {};

      for (const target of targetLangs) {
        // Check if we already have a valid cached translation
        const { data: cached } = await supabase
          .from("content_translations")
          .select("translated_text, original_text")
          .eq("content_type", content_type)
          .eq("content_id", content_id)
          .eq("target_language", target)
          .single();

        if (cached && cached.original_text === text) {
          results[target] = cached.translated_text;
          continue; // skip API call — cache is still valid
        }

        // Call LibreTranslate
        const translated = await translateText(text, sourceLang, target);
        results[target] = translated;

        // Save to DB (even if null — we'll retry later)
        if (translated) {
          await supabase.from("content_translations").upsert(
            {
              content_type,
              content_id,
              source_language: sourceLang,
              target_language: target,
              original_text: text,
              translated_text: translated,
              updated_at: new Date().toISOString(),
            },
            { onConflict: "content_type,content_id,target_language" }
          );
        }

        // Respect rate limits
        await sleep(API_DELAY);
      }

      // Also save the "original" entry so we can always look it up
      await supabase.from("content_translations").upsert(
        {
          content_type,
          content_id,
          source_language: sourceLang,
          target_language: sourceLang,
          original_text: text,
          translated_text: text, // original text stored as its own "translation"
          updated_at: new Date().toISOString(),
        },
        { onConflict: "content_type,content_id,target_language" }
      );

      return NextResponse.json({
        success: true,
        source_language: sourceLang,
        translations: results,
      });
    }

    // ─── SINGLE MODE: translate into one target language ───
    if (!target_language) {
      return NextResponse.json(
        { error: "Missing target_language (or use batch: true)" },
        { status: 400 }
      );
    }

    // Don't translate if source === target
    if (sourceLang === target_language) {
      return NextResponse.json({ translated_text: text, cached: false });
    }

    // Check cache
    if (content_type && content_id) {
      const { data: cached } = await supabase
        .from("content_translations")
        .select("translated_text, original_text")
        .eq("content_type", content_type)
        .eq("content_id", content_id)
        .eq("target_language", target_language)
        .single();

      if (cached && cached.original_text === text) {
        return NextResponse.json({
          translated_text: cached.translated_text,
          cached: true,
        });
      }
    }

    const translated = await translateText(text, sourceLang, target_language);

    if (!translated) {
      return NextResponse.json(
        { error: "Translation service temporarily unavailable." },
        { status: 502 }
      );
    }

    // Cache if we have identifiers
    if (content_type && content_id) {
      await supabase.from("content_translations").upsert(
        {
          content_type,
          content_id,
          source_language: sourceLang,
          target_language,
          original_text: text,
          translated_text: translated,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "content_type,content_id,target_language" }
      );
    }

    return NextResponse.json({
      translated_text: translated,
      cached: false,
    });
  } catch (err) {
    console.error("Translate API error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

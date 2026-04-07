import { logger } from "@/lib/logger";

/**
 * Translation utilities for Pangea.
 *
 * Call `triggerTranslation()` after any user-generated content is published
 * (proposals, forum posts, party descriptions, etc.).
 * The function fires a request to /api/translate in batch mode, which
 * translates the text into all supported languages and caches results in DB.
 *
 * Content is then displayed via the <TranslatedContent> component, which
 * reads cached translations from the `content_translations` table.
 */

export type ContentType =
  | "proposal_title"
  | "proposal_content"
  | "proposal_dispositivo"
  | "forum_post_title"
  | "forum_post_body"
  | "forum_reply"
  | "party_description"
  | "party_manifesto"
  | "party_post_title"
  | "party_post_body"
  | "group_post_title"
  | "group_post_body"
  | "election_description"
  | "candidate_platform"
  | "citizen_bio"
  | "comment"
  | "post_body"
  | "discussion_title"
  | "discussion_body";

/**
 * Fires a background translation request.
 * Call this after inserting/updating user-generated content.
 * Does NOT block the UI — fires and forgets.
 *
 * @param text           The text to translate
 * @param contentType    Type of content (for cache key)
 * @param contentId      UUID of the content row
 * @param sourceLanguage ISO 639-1 code of the author's language (defaults to 'en')
 */
export function triggerTranslation(
  text: string,
  contentType: ContentType,
  contentId: string,
  sourceLanguage: string = "en"
): void {
  if (!text || text.trim().length === 0) return;

  // Fire and forget — don't await, don't block UI
  fetch("/api/translate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      text: text.trim(),
      source_language: sourceLanguage,
      content_type: contentType,
      content_id: contentId,
      batch: true,
    }),
  }).catch((err) => {
    logger.warn("Background translation failed (non-blocking):", err);
  });
}

/**
 * Translates multiple fields for a single content item.
 * Useful when a proposal has both title and content.
 *
 * @param fields   Array of { text, contentType, contentId }
 * @param sourceLanguage  Author's language
 */
export function triggerMultiFieldTranslation(
  fields: Array<{ text: string; contentType: ContentType; contentId: string }>,
  sourceLanguage: string = "en"
): void {
  for (const field of fields) {
    triggerTranslation(field.text, field.contentType, field.contentId, sourceLanguage);
  }
}

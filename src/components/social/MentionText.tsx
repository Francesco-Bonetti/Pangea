"use client";

import { renderMentions } from "@/components/social/MentionInput";

/**
 * MentionText — Renders text with entity mentions as clickable chips.
 * Mention syntax: [@Name](entity:type:id:uid) or [#Name](entity:type:id:uid)
 */
export default function MentionText({
  text,
  className,
}: {
  text: string;
  className?: string;
}) {
  const parts = renderMentions(text);

  return (
    <span className={className}>
      {parts.map((part, i) => (
        <span key={i}>{part}</span>
      ))}
    </span>
  );
}

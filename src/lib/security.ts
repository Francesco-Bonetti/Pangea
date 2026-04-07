import { createClient } from "@/lib/supabase/client";

/**
 * Security utilities for Pangea platform
 * - Rate limiting
 * - Audit logging
 * - Input sanitization
 * - XSS prevention
 */

// ── Input Sanitization ──
export function sanitizeInput(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;")
    .replace(/\//g, "&#x2F;");
}

export function sanitizeHtml(html: string): string {
  // Strip all HTML tags
  return html.replace(/<[^>]*>/g, "");
}

// Validate that a string doesn't contain potential SQL injection patterns
export function isSafeSqlInput(input: string): boolean {
  const dangerousPatterns = [
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION)\b)/i,
    /(--|;|\/\*|\*\/)/,
    /(\b(OR|AND)\b\s+\d+\s*=\s*\d+)/i,
  ];
  return !dangerousPatterns.some((p) => p.test(input));
}

// ── Rate Limiting (client-side check) ──
const rateLimitCache: Record<string, { count: number; resetAt: number }> = {};

export function checkRateLimit(
  action: string,
  maxAttempts: number = 10,
  windowMs: number = 60000
): { allowed: boolean; remaining: number; resetIn: number } {
  const now = Date.now();
  const entry = rateLimitCache[action];

  if (!entry || now > entry.resetAt) {
    rateLimitCache[action] = { count: 1, resetAt: now + windowMs };
    return { allowed: true, remaining: maxAttempts - 1, resetIn: windowMs };
  }

  entry.count++;
  const remaining = Math.max(0, maxAttempts - entry.count);
  const resetIn = entry.resetAt - now;

  return {
    allowed: entry.count <= maxAttempts,
    remaining,
    resetIn,
  };
}

// ── Audit Logging ──
export async function logSecurityEvent(
  action: string,
  details?: Record<string, unknown>,
  resourceType?: string,
  resourceId?: string
) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    await supabase.from("security_audit_log").insert({
      user_id: user?.id || null,
      action,
      resource_type: resourceType || null,
      resource_id: resourceId || null,
      details: details || null,
      user_agent: typeof navigator !== "undefined" ? navigator.userAgent : null,
    });
  } catch {
    // Silently fail — audit logging should never break the app
    console.warn("Failed to log security event:", action);
  }
}

// ── Password Strength Checker ──
export function checkPasswordStrength(password: string): {
  score: number; // 0-4
  label: string;
  suggestions: string[];
} {
  let score = 0;
  const suggestions: string[] = [];

  if (password.length >= 8) score++;
  else suggestions.push("Use at least 8 characters");

  if (password.length >= 12) score++;

  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++;
  else suggestions.push("Use both uppercase and lowercase letters");

  if (/\d/.test(password)) score++;
  else suggestions.push("Add numbers");

  if (/[^A-Za-z0-9]/.test(password)) score++;
  else suggestions.push("Add special characters (!@#$...)");

  const labels = ["Very Weak", "Weak", "Fair", "Strong", "Very Strong"];
  return {
    score: Math.min(score, 4),
    label: labels[Math.min(score, 4)],
    suggestions,
  };
}

// ── Content Security Helpers ──
export function validateUrl(url: string): boolean {
  try {
    const u = new URL(url);
    return ["http:", "https:"].includes(u.protocol);
  } catch {
    return false;
  }
}

export function generateCSRFToken(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, (b) => b.toString(16).padStart(2, "0")).join("");
}

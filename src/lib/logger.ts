/**
 * Dev-only logger — silenced in production builds.
 * Use instead of console.error / console.warn in client components
 * to keep the browser console clean for end users.
 *
 * Server-side code (API routes, server components) can still use
 * console.error directly — those go to server logs, not the browser.
 */

const isDev = process.env.NODE_ENV !== "production";

export const logger = {
  error: (...args: unknown[]) => {
    if (isDev) console.error(...args);
  },
  warn: (...args: unknown[]) => {
    if (isDev) console.warn(...args);
  },
  info: (...args: unknown[]) => {
    if (isDev) console.info(...args);
  },
};

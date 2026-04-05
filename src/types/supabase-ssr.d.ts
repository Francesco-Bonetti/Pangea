// Type declarations for @supabase/ssr
// Resolves TS7016 "Could not find a declaration file for module '@supabase/ssr'"
declare module "@supabase/ssr" {
  import type { SupabaseClient } from "@supabase/supabase-js";

  interface CookieMethods {
    getAll: () => { name: string; value: string }[];
    setAll: (cookies: { name: string; value: string; options?: Record<string, unknown> }[]) => void;
  }

  interface CreateClientOptions {
    cookies: CookieMethods;
  }

  export function createBrowserClient(
    supabaseUrl: string,
    supabaseKey: string
  ): SupabaseClient;

  export function createServerClient(
    supabaseUrl: string,
    supabaseKey: string,
    options: CreateClientOptions
  ): SupabaseClient;
}

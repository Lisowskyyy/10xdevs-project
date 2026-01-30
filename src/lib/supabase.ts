import { createClient } from "@supabase/supabase-js";
import type { AstroCookies } from "astro";

const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co";
const supabaseAnonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY || "placeholder-key";

// Only throw error in production if env vars are missing
if (import.meta.env.PROD && (!import.meta.env.PUBLIC_SUPABASE_URL || !import.meta.env.PUBLIC_SUPABASE_ANON_KEY)) {
  throw new Error("Missing Supabase environment variables");
}

// Client-side Supabase client (for forms, etc.)
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * Server-side only. Supabase client with service role key (bypasses RLS).
 * Use for admin operations e.g. deleting a user. Never expose to client.
 */
export function getSupabaseAdmin() {
  const serviceRoleKey = import.meta.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set");
  }
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

// Server-side Supabase client with cookies (for SSR)
export function createServerSupabaseClient(cookies: AstroCookies) {
  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      flowType: "pkce",
      autoRefreshToken: true,
      detectSessionInUrl: true,
      persistSession: true,
      storage: {
        getItem: (key) => {
          return cookies.get(key)?.value ?? null;
        },
        setItem: (key, value) => {
          cookies.set(key, value, { path: "/", sameSite: "lax" });
        },
        removeItem: (key) => {
          cookies.delete(key, { path: "/" });
        },
      },
    },
  });
}

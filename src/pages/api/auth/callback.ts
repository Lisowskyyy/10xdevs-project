import type { APIRoute } from "astro";
import { createServerSupabaseClient } from "../../../lib/supabase";

/**
 * Syncs the client-side Supabase session to server cookies.
 * Call this after client-side sign-in (e.g. signInWithPassword) so that
 * middleware and server-rendered pages can read the session via cookies.
 */
export const POST: APIRoute = async ({ request, cookies }) => {
  if (request.headers.get("content-type") !== "application/json") {
    return new Response(JSON.stringify({ error: "Content-Type must be application/json" }), {
      status: 400,
    });
  }

  let body: { access_token?: string; refresh_token?: string };
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), { status: 400 });
  }

  const { access_token, refresh_token } = body;
  if (!access_token || !refresh_token) {
    return new Response(
      JSON.stringify({ error: "Missing access_token or refresh_token" }),
      { status: 400 }
    );
  }

  const supabase = createServerSupabaseClient(cookies);
  const { error } = await supabase.auth.setSession({ access_token, refresh_token });

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
};

import type { APIRoute } from "astro";
import { createServerSupabaseClient } from "../../../lib/supabase";

/**
 * API endpoint to archive expired circles
 * 
 * This can be called:
 * 1. Via a cron job (Supabase Edge Functions or external cron)
 * 2. Manually via POST request
 * 3. Via Supabase pg_cron (see migration file)
 * 
 * Security: Can be called by anyone (for cron jobs), but the function
 * itself uses security definer to ensure proper permissions.
 */
export const POST: APIRoute = async ({ cookies, request }) => {
  // Optional: Add API key check for security
  const apiKey = request.headers.get("x-api-key");
  const expectedKey = import.meta.env.ARCHIVE_API_KEY;

  if (expectedKey && apiKey !== expectedKey) {
    return new Response(
      JSON.stringify({ error: "Unauthorized" }),
      { status: 401, headers: { "Content-Type": "application/json" } }
    );
  }

  const supabase = createServerSupabaseClient(cookies);

  try {
    // Call the database function to archive expired circles
    const { data, error } = await supabase.rpc("archive_expired_circles");

    if (error) {
      console.error("Error archiving circles:", error);
      return new Response(
        JSON.stringify({ 
          error: "Failed to archive circles", 
          details: error.message 
        }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        archived_count: data || 0,
        message: `Archived ${data || 0} circle(s)` 
      }),
      { 
        status: 200, 
        headers: { "Content-Type": "application/json" } 
      }
    );
  } catch (err) {
    console.error("Unexpected error:", err);
    return new Response(
      JSON.stringify({ 
        error: "Internal server error",
        details: err instanceof Error ? err.message : "Unknown error"
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};

// Also allow GET for easy testing
export const GET: APIRoute = async ({ cookies }) => {
  const supabase = createServerSupabaseClient(cookies);

  try {
    const { data, error } = await supabase.rpc("archive_expired_circles");

    if (error) {
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        archived_count: data || 0 
      }),
      { 
        status: 200, 
        headers: { "Content-Type": "application/json" } 
      }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};


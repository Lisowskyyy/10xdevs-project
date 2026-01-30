import type { APIRoute } from "astro";
import { createServerSupabaseClient, getSupabaseAdmin } from "../../../lib/supabase";

export const DELETE: APIRoute = async ({ cookies }) => {
  const supabase = createServerSupabaseClient(cookies);

  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();

  if (!session || sessionError) {
    return new Response(
      JSON.stringify({ error: "Unauthorized" }),
      { status: 401, headers: { "Content-Type": "application/json" } }
    );
  }

  const userId = session.user.id;

  let admin;
  try {
    admin = getSupabaseAdmin();
  } catch {
    return new Response(
      JSON.stringify({ error: "Server configuration error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  // Delete user-related data first (in case DB has no ON DELETE CASCADE).
  const tablesWithUserId = [
    "session_participants",
    "meditation_logs",
    "journal_entries",
    "gratitude_entries",
    "burned_entries",
    "transmutation_events",
  ] as const;

  for (const table of tablesWithUserId) {
    const { error } = await admin.from(table).delete().eq("user_id", userId);
    if (error) {
      console.error(`Error deleting from ${table}:`, error);
      // Continue; auth user deletion may still work if RLS/cascade handles it
    }
  }

  // Delete profile (id = user id)
  const { error: profileError } = await admin.from("profiles").delete().eq("id", userId);
  if (profileError) {
    console.error("Error deleting profile:", profileError);
  }

  const { error: deleteUserError } = await admin.auth.admin.deleteUser(userId);
  if (deleteUserError) {
    console.error("Error deleting auth user:", deleteUserError);
    return new Response(
      JSON.stringify({ error: deleteUserError.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  const headers = new Headers({
    Location: "https://veranima.pl/",
  });
  headers.append(
    "Set-Cookie",
    "sb-access-token=deleted; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly; SameSite=Lax"
  );
  headers.append(
    "Set-Cookie",
    "sb-refresh-token=deleted; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly; SameSite=Lax"
  );
  return new Response(null, { status: 302, headers });
};

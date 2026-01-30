// src/pages/api/journal/[id].ts
import type { APIRoute } from "astro";
import { createServerSupabaseClient } from "../../../lib/supabase";

export const DELETE: APIRoute = async ({ params, cookies }) => {
  const id = params?.id;
  if (!id) {
    return new Response(JSON.stringify({ error: "Brak identyfikatora wpisu" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const supabase = createServerSupabaseClient(cookies);
  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();

  if (!session || sessionError) {
    return new Response(JSON.stringify({ error: "Sesja wymagana" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { data, error } = await supabase
    .from("gratitude_entries")
    .delete()
    .eq("id", id)
    .eq("user_id", session.user.id)
    .select("id")
    .maybeSingle();

  if (error) {
    return new Response(
      JSON.stringify({ error: "Błąd podczas usuwania wpisu", message: error.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  if (!data) {
    return new Response(JSON.stringify({ error: "Wpis nie znaleziony lub brak uprawnień" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
};

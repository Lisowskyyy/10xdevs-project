import type { APIRoute } from "astro";
import { createServerSupabaseClient } from "../../../../lib/supabase";

export const POST: APIRoute = async ({ params, cookies, redirect }) => {
  const supabase = createServerSupabaseClient(cookies);

  // Sprawdź sesję
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return redirect("/login");
  }

  const circleId = params.id;

  if (!circleId) {
    return redirect("/field-circles");
  }

  // Sprawdź, czy krąg istnieje
  const { data: circle, error: circleError } = await supabase
    .from("field_circles")
    .select("id")
    .eq("id", circleId)
    .single();

  if (circleError || !circle) {
    return redirect("/field-circles");
  }

  // Sprawdź, czy użytkownik już dołączył
  const { data: existingParticipant } = await supabase
    .from("session_participants")
    .select("id")
    .eq("circle_id", circleId)
    .eq("user_id", session.user.id)
    .single();

  if (existingParticipant) {
    // Użytkownik już jest członkiem, przekieruj z powrotem
    return redirect(`/circles/${circleId}`);
  }

  // Dołącz do kręgu
  const { error: joinError } = await supabase.from("session_participants").insert({
    circle_id: circleId,
    user_id: session.user.id,
    joined_at: new Date().toISOString(),
  });

  if (joinError) {
    // eslint-disable-next-line no-console
    console.error("Error joining circle:", joinError);
    return redirect(`/circles/${circleId}`);
  }

  return redirect(`/circles/${circleId}`);
};


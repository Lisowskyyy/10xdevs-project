// src/pages/api/journal.ts
import type { APIRoute } from "astro";
import OpenAI from "openai";
import { createServerSupabaseClient } from "../../lib/supabase";

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    const body = await request.json();
    const { text } = body;

    if (!text) return new Response(JSON.stringify({ error: "Pusty wpis" }), { status: 400 });
    if (!import.meta.env.OPENAI_API_KEY)
      return new Response(JSON.stringify({ error: "Brak klucza API" }), { status: 500 });

    // Initialize Supabase client with session context (required for RLS)
    const supabase = createServerSupabaseClient(cookies);

    // Get user session - required for RLS policies
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError || !session) {
      return new Response(JSON.stringify({ error: "Brak autoryzacji" }), { status: 401 });
    }

    // 1. ULEPSZONA ANALIZA AI (Wersja "Mistyczny Przewodnik")
    const openai = new OpenAI({ apiKey: import.meta.env.OPENAI_API_KEY });

    const completion = await openai.chat.completions.create({
      messages: [
        {
          role: "system",
          content: `Jesteś Veranimą – cyfrową opiekunką tej świątyni. 
          Twój cel: Pogłębić wdzięczność użytkownika poprzez krótką, ciepłą refleksję.
          
          ZASADY:
          1. Odnieś się bezpośrednio do treści wpisu (np. jeśli pisze o słońcu, nawiąż do światła).
          2. Nie używaj tagów w nawiasach typu [Radość]. Niech emocja wynika z Twoich słów.
          3. Styl: Empatyczny, lekko poetycki, dający nadzieję.
          4. Długość: Maksimum 2 zdania.
          
          Przykład:
          User: "Wdzięczny za uśmiech córki."
          Veranima: "Czysta radość bliskich to najpiękniejsze lustro dla naszej duszy. Pielęgnuj ten obraz w sercu."`,
        },
        { role: "user", content: text },
      ],
      model: "gpt-3.5-turbo",
      max_tokens: 150, // Nie ucinamy myśli
    });

    const aiResponse = completion.choices[0].message.content || "Nasionko przyjęło Twoją wdzięczność.";

    // 2. WSPÓLNA PAMIĘĆ (Zapis do tabeli gratitude_entries)
    // To sprawia, że wpis będzie widoczny i na Dashboardzie, i w "Dużym Dzienniku" (jeśli on czyta z tej tabeli)
    // Use session.user.id directly - RLS will verify auth.uid() matches user_id
    const { error: insertError } = await supabase.from("gratitude_entries").insert([
      {
        user_id: session.user.id,
        content: text,
        ai_response: aiResponse,
        mood: "Reflective", // Uproszczone, bo AI teraz pisze opisowo
      },
    ]);

    if (insertError) {
      // Log error for debugging - this helps identify RLS or schema issues
      console.error("Error saving gratitude entry:", insertError);
      // Still return AI response even if save fails, but log the error
    }

    return new Response(
      JSON.stringify({
        success: true,
        aiResponse: aiResponse,
      }),
      { status: 200 }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Wystąpił nieoczekiwany błąd";
    return new Response(JSON.stringify({ error: errorMessage }), { status: 500 });
  }
};

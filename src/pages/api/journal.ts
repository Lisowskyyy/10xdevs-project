// src/pages/api/journal.ts
import type { APIRoute } from "astro";
import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { text, userId } = body;

    if (!text) return new Response(JSON.stringify({ error: "Pusty wpis" }), { status: 400 });
    if (!userId) return new Response(JSON.stringify({ error: "Brak userId" }), { status: 400 });
    if (!import.meta.env.OPENAI_API_KEY)
      return new Response(JSON.stringify({ error: "Brak klucza API" }), { status: 500 });
    if (!import.meta.env.SUPABASE_SERVICE_ROLE_KEY)
      return new Response(JSON.stringify({ error: "Brak klucza Service Role" }), { status: 500 });

    // Initialize Admin Supabase client with Service Role Key (bypasses RLS)
    const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
    const supabaseServiceRoleKey = import.meta.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl) {
      return new Response(JSON.stringify({ error: "Brak URL Supabase" }), { status: 500 });
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

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
    // Using Admin Client with Service Role Key - bypasses RLS
    const { error: insertError } = await supabaseAdmin.from("gratitude_entries").insert([
      {
        user_id: userId,
        gratitude_text: text,
        ai_response: aiResponse,
        mood: "Reflective",
      },
    ]);

    if (insertError) {
      // Log error for debugging
      // eslint-disable-next-line no-console
      console.error("Error saving gratitude entry:", insertError);
      return new Response(
        JSON.stringify({
          error: "Błąd podczas zapisywania wpisu",
          message: insertError.message,
          details: insertError.details,
          hint: insertError.hint,
          code: insertError.code,
        }),
        {
          status: 500,
        }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        aiResponse: aiResponse,
      }),
      { status: 200 }
    );
  } catch (error: unknown) {
    // eslint-disable-next-line no-console
    console.error("Unexpected error in journal API:", error);

    if (error instanceof Error) {
      return new Response(
        JSON.stringify({
          error: "Wystąpił nieoczekiwany błąd",
          message: error.message,
          stack: error.stack,
        }),
        { status: 500 }
      );
    }

    return new Response(
      JSON.stringify({
        error: "Wystąpił nieoczekiwany błąd",
        message: String(error),
      }),
      { status: 500 }
    );
  }
};

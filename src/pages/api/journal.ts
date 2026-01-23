// src/pages/api/journal.ts
import type { APIRoute } from "astro";
import OpenAI from "openai";
import { createServerSupabaseClient } from "../../lib/supabase";

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    const body = await request.json();
    const { text } = body;

    if (!text) {
      return new Response(JSON.stringify({ error: "Brak treści wpisu" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (!import.meta.env.OPENAI_API_KEY) {
      return new Response(JSON.stringify({ error: "Server Error: Brak klucza API" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Get user session
    const supabase = createServerSupabaseClient(cookies);
    const {
      data: { session },
    } = await supabase.auth.getSession();

    // 1. Analiza AI
    const openai = new OpenAI({ apiKey: import.meta.env.OPENAI_API_KEY });

    const completion = await openai.chat.completions.create({
      messages: [
        {
          role: "system",
          content: `Jesteś Veranimą – cyfrową duszą tej świątyni. Twoim celem jest pogłębienie wdzięczności użytkownika.
Przeanalizuj wpis. Nie oceniaj go, lecz dopełnij.

Nie używaj tagów typu [Radość]. Zamiast tego, nazwij tę emocję w treści.

Odnieś się bezpośrednio do tego, o czym pisze użytkownik (np. jeśli pisze o kawie, nawiąż do ciepła/poranka; jeśli o przyjacielu – do więzi).

Zakończ krótką, mistyczną metaforą, która daje do myślenia.

Bądź zwięzła (max 2 zdania). Mów ciepłym, spokojnym tonem.`,
        },
        { role: "user", content: text },
      ],
      model: "gpt-3.5-turbo",
      max_tokens: 150,
    });

    const aiResponse = completion.choices[0].message.content || "Nasionko milczy, ale słucha...";

    // 2. Zapis do bazy (jeśli mamy sesję użytkownika)
    if (session?.user?.id) {
      const { error } = await supabase.from("gratitude_entries").insert([
        {
          user_id: session.user.id,
          content: text,
          ai_response: aiResponse,
          mood: "AI Analyzed",
        },
      ]);

      if (error) {
        // eslint-disable-next-line no-console
        console.error("Błąd zapisu DB:", error);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        aiResponse: aiResponse,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("API Error:", error);
    return new Response(
      JSON.stringify({
        error: "Wystąpił błąd podczas przetwarzania wpisu",
        details: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
};

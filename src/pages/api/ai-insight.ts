import type { APIRoute } from "astro";
import { AIService } from "../../lib/ai/aiService";

export const POST: APIRoute = async ({ request }) => {
  try {
    const { journalEntry, currentStage } = await request.json();

    if (!journalEntry || !currentStage) {
      return new Response(JSON.stringify({ error: "Missing journalEntry or currentStage" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const aiService = new AIService();
    const insight = await aiService.getJournalInsight(journalEntry, currentStage);

    return new Response(JSON.stringify({ insight }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("AI Insight Error:", error);
    return new Response(
      JSON.stringify({
        error: "Failed to generate insight",
        details: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
};

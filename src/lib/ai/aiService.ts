// src/lib/ai/aiService.ts
import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";

interface Context {
  systemPrompt: string;
}

interface AIProvider {
  generateInsight(prompt: string, context: Context): Promise<string>;
  generateStream(prompt: string, context: Context): Promise<ReadableStream>;
}

class OpenAIProvider implements AIProvider {
  private client: OpenAI;

  constructor(apiKey: string) {
    this.client = new OpenAI({ apiKey });
  }

  async generateInsight(prompt: string, context: Context): Promise<string> {
    const response = await this.client.chat.completions.create({
      model: "gpt-5-nano",
      messages: [
        { role: "system", content: context.systemPrompt },
        { role: "user", content: prompt },
      ],
    });

    return response.choices[0].message.content || "";
  }

  async generateStream(prompt: string, context: Context): Promise<ReadableStream> {
    const stream = await this.client.chat.completions.create({
      model: "gpt-5-nano",
      messages: [
        { role: "system", content: context.systemPrompt },
        { role: "user", content: prompt },
      ],
      stream: true,
    });

    return stream.toReadableStream();
  }
}

class ClaudeProvider implements AIProvider {
  private client: Anthropic;

  constructor(apiKey: string) {
    this.client = new Anthropic({ apiKey });
  }

  async generateInsight(prompt: string, context: Context): Promise<string> {
    const response = await this.client.messages.create({
      model: "claude-3-5-haiku-20241022",
      max_tokens: 300,
      messages: [{ role: "user", content: prompt }],
      system: context.systemPrompt,
    });

    const content = response.content[0];
    if (content.type === "text") {
      return content.text;
    }
    return "";
  }

  async generateStream(prompt: string, context: Context): Promise<ReadableStream> {
    const stream = await this.client.messages.create({
      model: "claude-3-5-haiku-20241022",
      max_tokens: 300,
      messages: [{ role: "user", content: prompt }],
      system: context.systemPrompt,
      stream: true,
    });

    return new ReadableStream({
      async start(controller) {
        for await (const chunk of stream) {
          if (chunk.type === "content_block_delta" && chunk.delta.type === "text_delta") {
            controller.enqueue(chunk.delta.text);
          }
        }
        controller.close();
      },
    });
  }
}

// GŁÓWNY SERVICE - Tutaj zmienisz provider jedną linijką!
export class AIService {
  private provider: AIProvider;

  constructor() {
    // ZMIEŃ TO ABY PRZEŁĄCZYĆ PROVIDERA
    const providerType = import.meta.env.AI_PROVIDER || "openai"; // lub 'claude'

    if (providerType === "claude") {
      this.provider = new ClaudeProvider(import.meta.env.CLAUDE_API_KEY);
    } else {
      this.provider = new OpenAIProvider(import.meta.env.OPENAI_API_KEY);
    }
  }

  async getJournalInsight(journalEntry: string, userStage: string): Promise<string> {
    const systemPrompt = `Jesteś empatycznym przewodnikiem duchowym wspierającym transformację świadomości.
  
  Użytkownik jest w fazie ${userStage} alchemicznej transformacji:
  - Nigredo: ciemność, introspekcja, oczyszczenie
  - Albedo: klarowność, oświecenie, jasność
  - Citrinitas: złocenie, mądrość, integracja
  - Rubedo: spełnienie, pełnia, transformacja
  
  WAŻNE: Odpowiadaj TYLKO po polsku w 3-4 pełnych zdaniach:
  1. Uznaj doświadczenie użytkownika z empatią
  2. Połącz je z obecną fazą transformacji
  3. Zaproponuj praktyczny insight lub pytanie refleksyjne
  4. Zachęć do dalszej praktyki
  
  Nie używaj samych emoji. Pisz pełne, mądre zdania po polsku.`;

    return await this.provider.generateInsight(journalEntry, { systemPrompt });
  }

  async streamJournalInsight(journalEntry: string, userStage: string): Promise<ReadableStream> {
    const systemPrompt = `Jesteś empatycznym przewodnikiem duchowym wspierającym transformację świadomości.
  
  Użytkownik jest w fazie ${userStage} alchemicznej transformacji:
  - Nigredo: ciemność, introspekcja, oczyszczenie
  - Albedo: klarowność, oświecenie, jasność
  - Citrinitas: złocenie, mądrość, integracja
  - Rubedo: spełnienie, pełnia, transformacja
  
  WAŻNE: Odpowiadaj TYLKO po polsku w 3-4 pełnych zdaniach:
  1. Uznaj doświadczenie użytkownika z empatią
  2. Połącz je z obecną fazą transformacji
  3. Zaproponuj praktyczny insight lub pytanie refleksyjne
  4. Zachęć do dalszej praktyki
  
  Nie używaj samych emoji. Pisz pełne, mądre zdania po polsku.`;

    return await this.provider.generateStream(journalEntry, { systemPrompt });
  }
}

import { prompts } from "../src/ai/prompts";
import { hash } from "../src/core/random";
import type { AIInvocation } from "../src/core/types";
export interface LLMProvider {
  generateStructured(
    prompt: (typeof prompts)[keyof typeof prompts],
    input: unknown,
  ): Promise<{ data: unknown; invocation: AIInvocation }>;
}
export class OpenAICompatibleProvider implements LLMProvider {
  constructor(
    private config: { baseUrl: string; apiKey: string; model: string },
  ) {}
  async generateStructured(
    prompt: (typeof prompts)[keyof typeof prompts],
    input: unknown,
  ) {
    const start = performance.now();
    const invocation: AIInvocation = {
      id: crypto.randomUUID(),
      provider: "openai-compatible",
      model: this.config.model,
      promptId: prompt.promptId,
      promptVersion: prompt.promptVersion,
      requestHash: hash(input),
      requestedAt: new Date().toISOString(),
      validationResult: "PENDING",
      durationMs: 0,
    };
    try {
      const res = await fetch(
        `${this.config.baseUrl.replace(/\/$/, "")}/chat/completions`,
        {
          method: "POST",
          signal: AbortSignal.timeout(18000),
          headers: {
            Authorization: `Bearer ${this.config.apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: this.config.model,
            messages: [
              { role: "system", content: prompt.template },
              { role: "user", content: JSON.stringify(input) },
            ],
            response_format: { type: "json_object" },
            max_tokens: 1200,
            temperature: 0.3,
          }),
        },
      );
      if (!res.ok) throw new Error(`HTTP_${res.status}`);
      const body = (await res.json()) as {
        choices?: { message?: { content?: string } }[];
      };
      const raw = body.choices?.[0]?.message?.content;
      if (!raw) throw new Error("EMPTY_RESPONSE");
      invocation.rawResponse = raw;
      const data: unknown = JSON.parse(raw);
      invocation.parsedResponse = data;
      invocation.durationMs = performance.now() - start;
      return { data, invocation };
    } catch (error) {
      invocation.validationResult =
        error instanceof Error ? error.message : "PROVIDER_ERROR";
      invocation.durationMs = performance.now() - start;
      throw Object.assign(new Error("Provider unavailable"), { invocation });
    }
  }
}
export class MockProvider implements LLMProvider {
  constructor(private data: unknown) {}
  async generateStructured(
    prompt: (typeof prompts)[keyof typeof prompts],
    input: unknown,
  ) {
    return {
      data: this.data,
      invocation: {
        id: crypto.randomUUID(),
        provider: "mock",
        model: "local",
        promptId: prompt.promptId,
        promptVersion: prompt.promptVersion,
        requestHash: hash(input),
        requestedAt: new Date().toISOString(),
        parsedResponse: this.data,
        validationResult: "VALID",
        durationMs: 0,
      },
    };
  }
}

import { setTimeout as sleep } from "node:timers/promises";

import { assertOpenAiConfigured, config } from "@/lib/config";

function stripCodeFences(value: string): string {
  const trimmed = value.trim();
  if (!trimmed.startsWith("```")) {
    return trimmed;
  }
  return trimmed.replace(/^```[a-zA-Z]*\s*/, "").replace(/```$/, "").trim();
}

function shouldRetry(status: number): boolean {
  return status === 408 || status === 429 || (status >= 500 && status <= 599);
}

export async function convertWithOpenAI(systemPrompt: string, userPrompt: string): Promise<string> {
  assertOpenAiConfigured();
  const timeoutMs = config.openai.timeoutSeconds * 1000;
  let lastError: string | null = null;

  for (let attempt = 1; attempt <= config.openai.maxRetries; attempt += 1) {
    const abortController = new AbortController();
    const timeoutHandle = setTimeout(() => abortController.abort(), timeoutMs);

    try {
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${config.openai.apiKey}`
        },
        body: JSON.stringify({
          model: config.openai.model,
          temperature: 0.1,
          messages: [
            {
              role: "system",
              content: systemPrompt
            },
            {
              role: "user",
              content: userPrompt
            }
          ]
        }),
        signal: abortController.signal
      });

      if (!response.ok) {
        const body = await response.text();
        lastError = `OpenAI request failed (${response.status}): ${body.slice(0, 500)}`;
        if (attempt < config.openai.maxRetries && shouldRetry(response.status)) {
          await sleep(500 * attempt);
          continue;
        }
        throw new Error(lastError);
      }

      const payload = (await response.json()) as {
        choices?: Array<{
          message?: {
            content?: string;
          };
        }>;
      };
      const content = payload.choices?.[0]?.message?.content;
      if (!content || content.trim().length === 0) {
        throw new Error("OpenAI returned an empty completion.");
      }
      return stripCodeFences(content);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown OpenAI error";
      lastError = message;
      if (attempt >= config.openai.maxRetries) {
        throw new Error(lastError);
      }
      await sleep(500 * attempt);
    } finally {
      clearTimeout(timeoutHandle);
    }
  }

  throw new Error(lastError ?? "OpenAI conversion failed after retries.");
}

/**
 * Model provider adapter. Server-only — the API key must never reach the client.
 *
 * Both supported providers speak the OpenAI wire format, so one client covers
 * an open-weight model hosted on Groq and the same class of model running
 * locally under Ollama. Switching is an environment variable (ADR 0005).
 */

import OpenAI from "openai";
import type { Message } from "./prompt";

export interface Provider {
  id: "groq" | "ollama";
  model: string;
  complete(messages: Message[], opts?: { temperature?: number }): Promise<string>;
}

export class MissingCredentialsError extends Error {}

function build(): Provider {
  const id = (process.env.MODEL_PROVIDER ?? "groq").toLowerCase() as Provider["id"];

  if (id === "ollama") {
    const model = process.env.OLLAMA_MODEL ?? "qwen2.5-coder:7b";
    const client = new OpenAI({
      baseURL: process.env.OLLAMA_BASE_URL ?? "http://localhost:11434/v1",
      apiKey: "ollama", // Ollama ignores it, the client requires one.
    });
    return { id, model, complete: (m, o) => chat(client, model, m, o) };
  }

  const key = process.env.GROQ_API_KEY;
  if (!key) {
    throw new MissingCredentialsError(
      "GROQ_API_KEY is not set. Add it to .env.local, or set MODEL_PROVIDER=ollama to run fully offline.",
    );
  }
  const model = process.env.GROQ_MODEL ?? "llama-3.3-70b-versatile";
  const client = new OpenAI({ baseURL: "https://api.groq.com/openai/v1", apiKey: key });
  return { id: "groq", model, complete: (m, o) => chat(client, model, m, o) };
}

async function chat(
  client: OpenAI,
  model: string,
  messages: Message[],
  opts?: { temperature?: number },
): Promise<string> {
  const res = await client.chat.completions.create({
    model,
    messages,
    // Near-zero: we want the same question to produce the same query.
    temperature: opts?.temperature ?? 0.1,
    max_tokens: 1200,
    response_format: { type: "json_object" },
  });
  const text = res.choices[0]?.message?.content;
  if (!text) throw new Error("Model returned an empty response.");
  return text;
}

let cached: Provider | null = null;

export function provider(): Provider {
  cached ??= build();
  return cached;
}

import OpenAI from "openai";

const apiKey = process.env.OPENAI_API_KEY;
if (!apiKey) {
  throw new Error("Missing OPENAI_API_KEY");
}

const client = new OpenAI({ apiKey });

export type JsonValue =
  | string
  | number
  | boolean
  | null
  | { [key: string]: JsonValue }
  | JsonValue[];

function safeJsonParse(text: string): JsonValue {
  try {
    return JSON.parse(text);
  } catch {
    const trimmed = text.trim();
    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");
    if (start >= 0 && end > start) {
      return JSON.parse(trimmed.slice(start, end + 1));
    }
    throw new Error("Failed to parse JSON from model output");
  }
}

export async function createJsonCompletion(options: {
  system: string;
  user: string;
  model?: string;
  temperature?: number;
}): Promise<JsonValue> {
  const model = options.model ?? process.env.OPENAI_MODEL ?? "gpt-4o-mini";
  const response = await client.chat.completions.create({
    model,
    temperature: options.temperature ?? 0.3,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: options.system },
      { role: "user", content: options.user },
    ],
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error("Empty response from OpenAI");
  }
  return safeJsonParse(content);
}

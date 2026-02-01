import { commonSystemPrompt } from "@/lib/prompts/system";

function trimReferences(references: string[], maxChars = 6000) {
  const joined = references.join("\n\n---\n\n");
  if (joined.length <= maxChars) return joined;
  const head = joined.slice(0, Math.floor(maxChars * 0.6));
  const tail = joined.slice(-Math.floor(maxChars * 0.4));
  return `${head}\n\n[...snip...]\n\n${tail}`;
}

export function buildStyleProfilePrompt(references: string[]) {
  const refs = trimReferences(references);
  return {
    system: commonSystemPrompt,
    user: `
You are a writing style analyst.

Your task is NOT to summarize content.
Your task is to extract a reusable writing style profile
that can be used to generate new texts
that feel like they were written by the same author.

Analyze the reference texts below and infer HOW the author writes.

Focus on:
- tone and speech level (formal/informal, polite/casual)
- sentence length and rhythm
- paragraph length and line break habits
- explanation depth and reader-friendliness
- use of examples, emphasis, and emotional expressions
- typical intro and ending patterns
- overall writer persona (friendly, expert, neutral, etc.)

Important rules:
- Output JSON only.
- Every field must be actionable for writing.
- Avoid vague adjectives without behavioral meaning.
- Prefer scales, enums, or boolean rules when possible.
- Include a clear speechLevel: "casual" (반말/했다/한다/했어), "polite" (합니다/습니다/해요), or "formal".
- Be strict about speechLevel; do not default to "polite" unless clearly indicated.

Reference texts:
${refs}

Return JSON with these keys exactly:
{
  "speechLevel": "polite|casual|formal",
  "tone": "friendly|neutral|energetic|serious|warm",
  "emojiLevel": "none|low|medium|high",
  "sentenceLength": "short|mixed|long",
  "frequentPhrases": ["..."],
  "structureNotes": ["..."],
  "doList": ["..."],
  "dontList": ["..."]
}
`,
  };
}

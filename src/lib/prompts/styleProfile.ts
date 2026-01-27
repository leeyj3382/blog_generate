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
    user: `Analyze the writing style from the references below and output JSON with keys:\n- speechLevel ("polite" | "casual" | "formal")\n- tone (e.g., "friendly", "neutral", "energetic")\n- emojiLevel ("none" | "low" | "medium" | "high")\n- sentenceLength ("short" | "mixed" | "long")\n- frequentPhrases (array of strings, 3-8)\n- structureNotes (array of strings, 3-8)\n- doList (array of strings, 3-8)\n- dontList (array of strings, 3-8)\n\nReferences:\n${refs}`,
  };
}

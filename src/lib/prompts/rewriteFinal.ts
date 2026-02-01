import { commonSystemPrompt } from "@/lib/prompts/system";

export function buildRewritePrompt(input: {
  draft: unknown;
  platform: "blog" | "sns" | "store";
  requiredContent?: string[];
  photoGuides?: { placeholder: string; notes?: string }[];
  mustInclude?: string[];
  bannedWords?: string[];
  styleProfile?: Record<string, unknown> | null;
}) {
  return {
    system: commonSystemPrompt,
    user: `
You are an editor and compliance reviewer.
Your job is to produce the final publishable version.

Rewrite the draft in Korean so that it is ready for direct publication.

Context:
- Platform: ${input.platform}
- Must include (verbatim): ${input.mustInclude?.join("\n") ?? "(none)"}
- Required content notes (rewrite into style): ${input.requiredContent?.join("\n") ?? "(none)"}
- Photo placeholders (must appear verbatim) and notes (blend nearby):
${input.photoGuides?.map((p) => `- ${p.placeholder}${p.notes ? ` :: ${p.notes}` : ""}`).join("\n") ?? "(none)"}
- Banned words (must not appear): ${input.bannedWords?.join(" | ") ?? "(none)"}
- Style profile: ${JSON.stringify(input.styleProfile ?? {})}

Checklist (mandatory):
1. The style profile must be faithfully reflected.
2. All required phrases must appear verbatim and naturally.
3. Banned words must not appear.
4. No exaggerated, misleading, or unsafe claims.
5. Content must comply with Korean advertising, medical, and legal safety norms.

Editing rules:
- Preserve the original tone, rhythm, and writing style.
- Fix issues by softening expressions rather than deleting content when possible.
- Do NOT add new factual claims.
- Do NOT explain edits.

Speech level handling (IMPORTANT):
- Do NOT mix speech levels.
- If speechLevel is "polite" or "formal": keep 존댓말 consistently.
- If speechLevel is "casual": DO NOT rewrite into chatty spoken 반말.
  * Prefer "~했다/~느껴졌다/~같다".
  * Reduce "~했어/~야" frequency to at most once per paragraph, never consecutive.
  * Keep it publishable: structured paragraphs, not dialogue.

Platform-specific rules:
Blog:
- Maintain natural sentence flow.
- Use short to medium paragraphs (2–4 sentences).
- Prefer line breaks over dense blocks.
- Write as a publishable review narrative, not conversation.

SNS:
- Use very short paragraphs (1–2 sentences).
- Favor concise sentences with strong rhythm.
- Remove unnecessary background explanations.

Store:
- Organize content into clear sections with headings.
- Use bullet points for features and benefits.
- Each bullet must be a single, scannable sentence.

Draft JSON:
${JSON.stringify(input.draft)}

Return final JSON using the exact same schema as the draft.

Additional rules:
- Never copy photo notes verbatim; paraphrase them into the target style and keep them near the placeholder.
`,
  };
}

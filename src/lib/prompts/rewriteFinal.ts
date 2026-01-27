import { commonSystemPrompt } from "@/lib/prompts/system";

export function buildRewritePrompt(input: {
  draft: unknown;
  platform: "blog" | "sns" | "store";
  mustInclude?: string[];
  bannedWords?: string[];
}) {
  return {
    system: commonSystemPrompt,
    user: `Rewrite the draft in Korean to be clean, non-repetitive, and compliant.
- Must include (keep exact wording): ${input.mustInclude?.join(" | ") ?? "(none)"}
- Banned words (must not appear): ${input.bannedWords?.join(" | ") ?? "(none)"}
- Platform: ${input.platform}

Rules:
- Remove exaggerations.
- Keep required phrases in natural positions.
- If platform is store, enforce clear section structure and scannable bullets.

Draft JSON:
${JSON.stringify(input.draft)}

Return final JSON with the same schema as draft.
`,
  };
}

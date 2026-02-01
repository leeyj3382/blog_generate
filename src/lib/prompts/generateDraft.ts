import { commonSystemPrompt } from "@/lib/prompts/system";

type DraftInput = {
  platform: "blog" | "sns" | "store";
  purpose: "promo" | "review" | "ad" | "info" | "etc";
  topic: string;
  keywords: string[];
  length: "normal" | "long" | "xlong";
  extraPrompt?: string | null;
  requiredContent?: string[];
  photoGuides?: { placeholder: string; notes?: string }[];
  mustInclude?: string[];
  bannedWords?: string[];
  productInfo?: {
    productName?: string;
    priceRange?: string;
    features?: string[];
    targetCustomer?: string;
    cautions?: string[];
    components?: string[];
  };
  styleProfile?: Record<string, unknown> | null;
};

export function buildDraftPrompt(input: DraftInput) {
  const schemaByPlatform = {
    blog: {
      titleCandidates: ["..."],
      body: "...",
      hashtags: ["#..."],
      cta: "...",
    },
    sns: {
      body: "...",
      hashtags: ["#..."],
      cta: "...",
    },
    store: {
      hook: "...",
      bullets: ["..."],
      sections: {
        usage: "...",
        spec: "...",
        faq: "...",
        cautions: "...",
      },
      cta: "...",
    },
  } as const;

  return {
    system: commonSystemPrompt,
    user: `
You are a professional human writer.

Write an original Korean text that strictly follows the given Style Profile.
The reader must feel that the same person wrote this text.

Priority order (highest to lowest):
1. Style Profile (mandatory rules)
2. Platform conventions
3. User inputs (topic, keywords, required phrases)
4. Natural readability

Writing rules:
- Do NOT sound like an AI, guide, or assistant.
- Do NOT explain what you are doing.
- Follow the tone, rhythm, and structure from the style profile.
- Keywords must be woven naturally into sentences.
- All "Must include" phrases must appear verbatim and naturally.
- "Required content notes" must be rewritten into the target style and incorporated naturally.
- Insert each photo placeholder text verbatim in the body.
- Never copy photo notes verbatim; paraphrase them into natural sentences matching the style profile and place them near the placeholder.
- Distribute multiple placeholders across the flow; do not cluster them at the end.
- Avoid mechanical or list-like insertion of keywords.

Speech level handling (IMPORTANT):
- Do NOT mix speech levels within the same output.
- If styleProfile.speechLevel is "formal" or "polite": use 존댓말 consistently.
- If styleProfile.speechLevel is "casual":
  Treat it as "relaxed, publishable writing" (NOT chatty spoken 반말).
  * Prefer endings like "~했다", "~느껴졌다", "~같다", "~하더라" (review narration tone).
  * Avoid strong spoken casual endings like "~했어/~야".
    - If you use them, limit to at most once per paragraph and never consecutively.
  * The output must read like a structured blog post, not a conversation.

Platform writing style:
- Blog: readable paragraphs, natural flow, review narration (not dialogue).
- SNS: concise, rhythm-focused.
- Store: clear sections, scannable bullets.

Context:
- Platform: ${input.platform}
- Purpose: ${input.purpose}
- Topic: ${input.topic}
- Keywords: ${input.keywords.join(", ")}
- Length: ${input.length}
- Must include (verbatim): ${input.mustInclude?.join("\n") ?? "(none)"}
- Required content notes (rewrite into style): ${input.requiredContent?.join("\n") ?? "(none)"}
- Photo placeholders (insert verbatim) and notes (blend nearby):
${input.photoGuides?.map((p) => `- ${p.placeholder}${p.notes ? ` :: ${p.notes}` : ""}`).join("\n") ?? "(none)"}
- Banned words: ${input.bannedWords?.join(" | ") ?? "(none)"}
- Extra prompt: ${input.extraPrompt ?? "(none)"}
- Product info: ${JSON.stringify(input.productInfo ?? {})}
- Style profile: ${JSON.stringify(input.styleProfile ?? {})}

Output JSON matching this schema:
${JSON.stringify(schemaByPlatform[input.platform], null, 2)}
`,
  };
}

import { commonSystemPrompt } from "@/lib/prompts/system";

type DraftInput = {
  platform: "blog" | "sns" | "store";
  purpose: "promo" | "review" | "ad" | "info" | "etc";
  topic: string;
  keywords: string[];
  length: "normal" | "long" | "xlong";
  extraPrompt?: string | null;
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
      hashtags: ["#..."] ,
      cta: "...",
    },
    sns: {
      body: "...",
      hashtags: ["#..."] ,
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
    user: `Write a draft in Korean. Follow constraints strictly and avoid banned words.
- Platform: ${input.platform}
- Purpose: ${input.purpose}
- Topic: ${input.topic}
- Keywords: ${input.keywords.join(", ")}
- Length: ${input.length}
- Must include: ${input.mustInclude?.join(" | ") ?? "(none)"}
- Banned words: ${input.bannedWords?.join(" | ") ?? "(none)"}
- Extra prompt: ${input.extraPrompt ?? "(none)"}
- Product info: ${JSON.stringify(input.productInfo ?? {})}
- Style profile: ${JSON.stringify(input.styleProfile ?? {})}

Rules:
- Include concrete examples/situations/components; avoid vague repetition.
- Ensure keywords are naturally included.
- Output JSON matching this schema for the platform:
${JSON.stringify(schemaByPlatform[input.platform], null, 2)}
`,
  };
}

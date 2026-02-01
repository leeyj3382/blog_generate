import { z } from "zod";

const platformSchema = z.enum(["blog", "sns", "store"]);
const purposeSchema = z.enum(["promo", "review", "ad", "info", "etc"]);
const lengthSchema = z.enum(["normal", "long", "xlong"]);

const productInfoSchema = z
  .object({
    productName: z.string().optional(),
    priceRange: z.string().optional(),
    features: z.array(z.string()).min(3).max(10).optional(),
    targetCustomer: z.string().optional(),
    cautions: z.array(z.string()).optional(),
    components: z.array(z.string()).optional(),
  })
  .optional();

export const generateSchema = z.object({
  platform: platformSchema,
  purpose: purposeSchema,
  topic: z.string().min(1).max(120),
  keywords: z.array(z.string()).min(3).max(10),
  length: lengthSchema,
  references: z.array(z.string()).optional(),
  referenceUrls: z.array(z.string().url()).optional(),
  useReferenceStyle: z.boolean().optional(),
  extraPrompt: z.string().max(600).optional(),
  requiredContent: z.array(z.string()).optional(),
  mustInclude: z.array(z.string()).optional(),
  bannedWords: z.array(z.string()).optional(),
  productInfo: productInfoSchema,
  variants: z.number().int().min(1).max(3).optional(),
});

export type GenerateInput = z.infer<typeof generateSchema>;

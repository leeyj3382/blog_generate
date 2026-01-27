import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { buildStyleProfilePrompt } from "@/lib/prompts/styleProfile";
import { createJsonCompletion } from "@/lib/openai";
import { z } from "zod";

const bodySchema = z.object({
  references: z.array(z.string()).min(1),
});

export async function POST(request: Request) {
  const auth = await requireAuth(request);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: 401 });
  }

  let body;
  try {
    body = bodySchema.parse(await request.json());
  } catch {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const prompt = buildStyleProfilePrompt(body.references);
  const result = await createJsonCompletion(prompt);
  return NextResponse.json({ styleProfile: result });
}

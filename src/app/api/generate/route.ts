import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { requireAuth } from "@/lib/auth";
import { generateSchema } from "@/lib/validators/generate";
import { rateLimit } from "@/lib/rateLimit";
import { buildStyleProfilePrompt } from "@/lib/prompts/styleProfile";
import { buildDraftPrompt } from "@/lib/prompts/generateDraft";
import { buildRewritePrompt } from "@/lib/prompts/rewriteFinal";
import { createJsonCompletion } from "@/lib/openai";
import { FieldValue } from "firebase-admin/firestore";
import { load } from "cheerio";

function nowMs() {
  return Date.now();
}

async function fetchReferenceText(url: string) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12_000);
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36",
      },
      signal: controller.signal,
    });
    if (!res.ok) return null;
    const html = await res.text();
    const $ = load(html);
    const candidates =
      $("article").text().trim() ||
      $("main").text().trim() ||
      $("body").text().trim();
    const cleaned = candidates.replace(/\s+/g, " ").trim();
    if (cleaned.length > 200) return cleaned;
  } catch {
    // ignore
  } finally {
    clearTimeout(timeout);
  }
  return null;
}

async function fetchReferenceTextWithPlaywright(url: string) {
  const { chromium } = await import("playwright");
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({
    userAgent:
      "Mozilla/5.0 (Macintosh; Intel Mac OS X) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36",
  });
  try {
    await page.goto(url, { waitUntil: "networkidle", timeout: 20_000 });
    const pageText = await page.evaluate(() => {
      const article = document.querySelector("article");
      const main = document.querySelector("main");
      const body = document.body;
      const text =
        article?.textContent || main?.textContent || body?.textContent || "";
      return text.replace(/\s+/g, " ").trim();
    });

    let bestText = pageText;
    for (const frame of page.frames()) {
      try {
        const frameText = await frame.evaluate(() => {
          const article = document.querySelector("article");
          const main = document.querySelector("main");
          const body = document.body;
          const text =
            article?.textContent || main?.textContent || body?.textContent || "";
          return text.replace(/\s+/g, " ").trim();
        });
        if (frameText.length > bestText.length) {
          bestText = frameText;
        }
      } catch {
        // ignore frame access errors
      }
    }

    return bestText.length > 200 ? bestText : null;
  } catch {
    return null;
  } finally {
    await page.close();
    await browser.close();
  }
}

export async function POST(request: Request) {
  const auth = await requireAuth(request);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: 401 });
  }

  const limit = rateLimit(auth.decoded.uid);
  if (!limit.ok) {
    return NextResponse.json(
      { error: "Rate limit exceeded" },
      { status: 429, headers: { "Retry-After": String(Math.ceil(limit.retryAfterMs / 1000)) } }
    );
  }

  let input;
  try {
    const body = await request.json();
    input = generateSchema.parse(body);
  } catch {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const uid = auth.decoded.uid;
  const email = auth.decoded.email ?? null;
  const userRef = adminDb.collection("users").doc(uid);
  const createdAt = nowMs();

  let creditsRemaining = 0;
  let usedFreeTrialNow = false;

  try {
    await adminDb.runTransaction(async (tx) => {
      const snap = await tx.get(userRef);
      const data = snap.exists ? snap.data() ?? {} : {};
      const credits = typeof data.credits === "number" ? data.credits : 1;
      const freeTrialUsed = Boolean(data.freeTrialUsed);

      if (credits <= 0) {
        throw new Error("INSUFFICIENT_CREDITS");
      }

      usedFreeTrialNow = !freeTrialUsed && credits === 1;
      creditsRemaining = credits - 1;

      const base = {
        email: data.email ?? email,
        plan: data.plan ?? "free",
        createdAt: data.createdAt ?? createdAt,
      };

      const update = {
        ...base,
        credits: creditsRemaining,
        freeTrialUsed: freeTrialUsed || usedFreeTrialNow,
        updatedAt: createdAt,
      };

      if (snap.exists) {
        tx.update(userRef, update);
      } else {
        tx.set(userRef, update);
      }
    });
  } catch (error) {
    if (error instanceof Error && error.message === "INSUFFICIENT_CREDITS") {
      return NextResponse.json({ error: "Insufficient credits" }, { status: 402 });
    }
    return NextResponse.json({ error: "Credit transaction failed" }, { status: 500 });
  }

  const generationId = adminDb.collection("generations").doc().id;
  let styleProfile: Record<string, unknown> | null = null;
  const referenceTexts: string[] = [...(input.references ?? [])];
  const referenceUrls = input.referenceUrls ?? [];
  let fetchedReferenceCount = 0;

  try {
    if (referenceUrls.length) {
      const fetched = await Promise.all(
        referenceUrls.map(async (url) => {
          const plain = await fetchReferenceText(url);
          if (plain) return plain;
          return fetchReferenceTextWithPlaywright(url);
        })
      );
      fetched.filter(Boolean).forEach((text) => referenceTexts.push(text!));
      fetchedReferenceCount = fetched.filter(Boolean).length;
    }

    if (referenceTexts.length && input.useReferenceStyle !== false) {
      const prompt = buildStyleProfilePrompt(referenceTexts);
      const result = await createJsonCompletion({
        ...prompt,
        model: "o4-mini",
      });
      styleProfile = result as Record<string, unknown>;
    }

    const draftPrompt = buildDraftPrompt({
      ...input,
      styleProfile,
    });
    const draft = await createJsonCompletion({
      ...draftPrompt,
      model: "gpt-5-mini",
    });

    const rewritePrompt = buildRewritePrompt({
      draft,
      platform: input.platform,
      mustInclude: input.mustInclude,
      bannedWords: input.bannedWords,
    });
    const finalOutput = await createJsonCompletion({
      ...rewritePrompt,
      model: "gpt-5-mini",
    });

    const output = finalOutput as Record<string, unknown>;
    const titleCandidate = (() => {
      const titles = output["titleCandidates"];
      if (!Array.isArray(titles) || titles.length === 0) return null;
      const first = titles[0];
      return typeof first === "string" ? first : null;
    })();

    await adminDb.collection("generations").doc(generationId).set({
      uid,
      platform: input.platform,
      purpose: input.purpose,
      topic: input.topic,
      keywords: input.keywords,
      length: input.length,
      extraPrompt: input.extraPrompt ?? null,
      referencesProvided: Boolean(referenceTexts.length),
      referenceUrls,
      referenceStats: {
        urlCount: referenceUrls.length,
        fetchedCount: fetchedReferenceCount,
        textCount: referenceTexts.length,
      },
      styleProfile,
      inputSnapshot: input,
      output,
      status: "success",
      error: null,
      createdAt,
    });

    await adminDb
      .collection("users")
      .doc(uid)
      .collection("generations")
      .doc(generationId)
      .set({
        platform: input.platform,
        purpose: input.purpose,
        topic: input.topic,
        keywords: input.keywords,
        length: input.length,
        extraPrompt: input.extraPrompt ?? null,
        referencesProvided: Boolean(referenceTexts.length),
        titleCandidate,
        status: "success",
        error: null,
        createdAt,
      });

    return NextResponse.json({
      generationId,
      creditsRemaining,
      output,
      styleProfile,
      referenceStats: {
        urlCount: referenceUrls.length,
        fetchedCount: fetchedReferenceCount,
        textCount: referenceTexts.length,
      },
      meta: {
        platform: input.platform,
        purpose: input.purpose,
        styleUsed: Boolean(styleProfile),
      },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";

    await adminDb.collection("generations").doc(generationId).set({
      uid,
      platform: input.platform,
      purpose: input.purpose,
      topic: input.topic,
      keywords: input.keywords,
      length: input.length,
      extraPrompt: input.extraPrompt ?? null,
      referencesProvided: Boolean(referenceTexts.length),
      referenceUrls,
      referenceStats: {
        urlCount: referenceUrls.length,
        fetchedCount: fetchedReferenceCount,
        textCount: referenceTexts.length,
      },
      styleProfile,
      inputSnapshot: input,
      output: null,
      status: "failed",
      error: errorMessage,
      createdAt,
    });

    await adminDb
      .collection("users")
      .doc(uid)
      .collection("generations")
      .doc(generationId)
      .set({
        platform: input.platform,
        purpose: input.purpose,
        topic: input.topic,
        keywords: input.keywords,
        length: input.length,
        extraPrompt: input.extraPrompt ?? null,
        referencesProvided: Boolean(referenceTexts.length),
        titleCandidate: null,
        status: "failed",
        error: errorMessage,
        createdAt,
      });

    const rollback: Record<string, unknown> = {
      credits: FieldValue.increment(1),
      updatedAt: nowMs(),
    };
    if (usedFreeTrialNow) {
      rollback.freeTrialUsed = false;
    }
    await userRef.update(rollback);

    return NextResponse.json({ error: "Generation failed" }, { status: 500 });
  }
}

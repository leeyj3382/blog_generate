import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebaseAdmin";
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

function isNaverUrl(url: string) {
  const lower = url.toLowerCase();
  return lower.includes("blog.naver.com") || lower.includes("m.blog.naver.com");
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

async function fetchReferenceTextWithCrawler(url: string) {
  const crawlerUrl = process.env.CRAWLER_URL;
  if (!crawlerUrl) return null;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 25_000);
  try {
    const res = await fetch(`${crawlerUrl.replace(/\/$/, "")}/extract`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(process.env.CRAWLER_API_KEY
          ? { "X-Crawler-Key": process.env.CRAWLER_API_KEY }
          : {}),
      },
      body: JSON.stringify({ url }),
      signal: controller.signal,
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { text?: string };
    if (!data.text || typeof data.text !== "string") return null;
    return data.text;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
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
            article?.textContent ||
            main?.textContent ||
            body?.textContent ||
            "";
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

async function fetchReferenceWithFallback(url: string) {
  const crawler = await fetchReferenceTextWithCrawler(url);
  if (crawler) return { text: crawler, source: "crawler" as const };

  if (!isNaverUrl(url)) {
    const plain = await fetchReferenceText(url);
    if (plain) return { text: plain, source: "html" as const };
  }

  if (process.env.NODE_ENV !== "production") {
    const pw = await fetchReferenceTextWithPlaywright(url);
    if (pw) return { text: pw, source: "playwright" as const };
  }
  return { text: null, source: "none" as const };
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
      {
        status: 429,
        headers: {
          "Retry-After": String(Math.ceil(limit.retryAfterMs / 1000)),
        },
      },
    );
  }

  let input;
  try {
    const body = await request.json();
    input = generateSchema.parse(body);
  } catch (error) {
    if (error && typeof error === "object" && "issues" in error) {
      return NextResponse.json(
        { error: "Invalid input", issues: (error as { issues: unknown }).issues },
        { status: 400 },
      );
    }
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const uid = auth.decoded.uid;
  const email = auth.decoded.email ?? null;
  const adminDb = getAdminDb();
  const userRef = adminDb.collection("users").doc(uid);
  const createdAt = nowMs();

  let creditsRemaining = 0;
  let usedFreeTrialNow = false;

  try {
    await adminDb.runTransaction(async (tx) => {
      const snap = await tx.get(userRef);
      const data = snap.exists ? (snap.data() ?? {}) : {};
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
      return NextResponse.json(
        { error: "Insufficient credits" },
        { status: 402 },
      );
    }
    return NextResponse.json(
      { error: "Credit transaction failed" },
      { status: 500 },
    );
  }

  const generationId = adminDb.collection("generations").doc().id;
  let styleProfile: Record<string, unknown> | null = null;
  const referenceTexts: string[] = [];
  const referenceUrls = input.referenceUrls ?? [];
  let fetchedReferenceCount = 0;
  const referenceSources: Array<{ url: string; source: string }> = [];
  const debugEnabled =
    process.env.DEBUG_REFERENCE_SAMPLE === "1" ||
    process.env.NODE_ENV !== "production";
  let referenceSample: string | null = null;
  const crawlerUrl = process.env.CRAWLER_URL ?? null;

  let stage = "init";
  try {
    stage = "fetch_references";
    if (referenceUrls.length) {
      const fetched = await Promise.all(
        referenceUrls.map(async (url) => {
          const result = await fetchReferenceWithFallback(url);
          referenceSources.push({ url, source: result.source });
          return result.text;
        }),
      );
      fetched.filter(Boolean).forEach((text) => referenceTexts.push(text!));
      fetchedReferenceCount = fetched.filter(Boolean).length;
    }
    if (debugEnabled && referenceTexts.length) {
      referenceSample = referenceTexts[0].slice(0, 600);
      console.log(
        `[debug] referenceSample len=${referenceSample.length} urlCount=${referenceUrls.length} crawlerUrl=${crawlerUrl}`,
      );
      console.log(`[debug] referenceSample: ${referenceSample}`);
      if (referenceSources.length) {
        console.log(
          `[debug] referenceSources: ${referenceSources
            .map((r) => `${r.source}:${r.url}`)
            .join(", ")}`,
        );
      }
    }

    if (referenceTexts.length && input.useReferenceStyle !== false) {
      stage = "style_profile";
      const prompt = buildStyleProfilePrompt(referenceTexts);
      const result = await createJsonCompletion({
        ...prompt,
        model: "o4-mini",
      });
      styleProfile = result as Record<string, unknown>;
    }

    stage = "draft";
    const draftPrompt = buildDraftPrompt({
      ...input,
      styleProfile,
    });
    const draft = await createJsonCompletion({
      ...draftPrompt,
      model: "gpt-5-mini",
    });

    stage = "rewrite";
    const rewritePrompt = buildRewritePrompt({
      draft,
      platform: input.platform,
      requiredContent: input.requiredContent,
      photoGuides: input.photoGuides,
      mustInclude: input.mustInclude,
      bannedWords: input.bannedWords,
      styleProfile,
    });
    const finalOutput = await createJsonCompletion({
      ...rewritePrompt,
      model: "gpt-5-mini",
    });

    stage = "persist";
    const output = finalOutput as Record<string, unknown>;
    const mustInclude = input.mustInclude ?? [];
    const normalize = (value: string) => value.replace(/\s+/g, " ").trim();
    const containsAll = (text: string) =>
      mustInclude.every((phrase) => phrase && normalize(text).includes(normalize(phrase)));

    const ensureIncludes = () => {
      if (!mustInclude.length) return;
      if (input.platform === "store") {
        const sections = (output["sections"] as Record<string, string> | undefined) ?? {};
        const merged = Object.values(sections).join(" ");
        if (containsAll(merged)) return;
        const appended = [...new Set(mustInclude)].join(" / ");
        const next = { ...sections, cautions: `${sections.cautions ?? ""}\n${appended}`.trim() };
        output["sections"] = next;
        return;
      }
      const body = typeof output["body"] === "string" ? output["body"] : "";
      if (containsAll(body)) return;
      const appended = [...new Set(mustInclude)].join("\n");
      output["body"] = `${body}\n${appended}`.trim();
    };

    ensureIncludes();

    const photoGuides = input.photoGuides ?? [];
    const placeholders = photoGuides.map((p) => p.placeholder).filter(Boolean);
    const bodyText = typeof output["body"] === "string" ? output["body"] : "";
    if (placeholders.length && bodyText) {
      const missing = placeholders.filter((ph) => !bodyText.includes(ph));
      if (missing.length) {
        output["body"] = `${bodyText}\n${missing.join("\n")}`.trim();
      }
    }

    if (photoGuides.length && bodyText) {
      const currentBody =
        typeof output["body"] === "string" ? output["body"] : bodyText;
      const newlineBody = placeholders.reduce((text, ph) => {
        const safe = ph.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const regex = new RegExp(`${safe}(\\s*)`, "g");
        return text.replace(regex, `${ph}\n`);
      }, currentBody);
      output["body"] = newlineBody;

      const notes = photoGuides
        .map((p) => p.notes)
        .filter((n): n is string => Boolean(n));
      if (notes.length) {
        const lowerBody = bodyText.toLowerCase();
        const leaked = notes.some((note) =>
          lowerBody.includes(note.toLowerCase()),
        );
        if (leaked) {
          const rewritePrompt = buildRewritePrompt({
            draft: output,
            platform: input.platform,
            requiredContent: input.requiredContent,
            photoGuides: input.photoGuides,
            mustInclude: input.mustInclude,
            bannedWords: input.bannedWords,
            styleProfile,
          });
          const rewritten = await createJsonCompletion({
            ...rewritePrompt,
            model: "gpt-5-mini",
          });
          const rewrittenOutput = rewritten as Record<string, unknown>;
          output["body"] = rewrittenOutput["body"];
        }
      }
    }
    const titleCandidate = (() => {
      const titles = output["titleCandidates"];
      if (!Array.isArray(titles) || titles.length === 0) return null;
      const first = titles[0];
      return typeof first === "string" ? first : null;
    })();

    await adminDb
      .collection("generations")
      .doc(generationId)
      .set({
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
      debug: debugEnabled
        ? {
            referenceSample,
            referenceUrls,
            crawlerUrl,
            referenceSources,
          }
        : undefined,
      meta: {
        platform: input.platform,
        purpose: input.purpose,
        styleUsed: Boolean(styleProfile),
      },
    });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    console.error("[generate] failed", { stage, errorMessage });

    await adminDb
      .collection("generations")
      .doc(generationId)
      .set({
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
        error: `${stage}: ${errorMessage}`,
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

    return NextResponse.json(
      { error: "Generation failed", stage, message: errorMessage },
      { status: 500 },
    );
  }
}

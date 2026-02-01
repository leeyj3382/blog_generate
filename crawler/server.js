import express from "express";
import { chromium } from "playwright";

const app = express();
app.use(express.json({ limit: "2mb" }));

const API_KEY = process.env.CRAWLER_API_KEY || "";
const MAX_CONCURRENT = Number(process.env.CRAWLER_MAX_CONCURRENT || 3);
const MIN_TEXT_LEN = Number(process.env.CRAWLER_MIN_TEXT_LEN || 200);

let active = 0;
const waiters = [];
let browserPromise = null;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function cleanNaverText(text) {
  if (!text) return "";

  const globalDrop = [
    /본문\s*바로가기/g,
    /블로그\s*카테고리\s*이동/g,
    /\bMY\s*메뉴\b/g,
    /공유하기|URL복사|신고하기/g,
    /Previous image|Next image/g,
    /본문\s*폰트\s*크기\s*조정/g,
    /본문\s*폰트\s*크기\s*작게\s*보기/g,
    /본문\s*폰트\s*크기\s*크게\s*보기/g,
  ];

  let cleaned = text;
  globalDrop.forEach((re) => {
    cleaned = cleaned.replace(re, " ");
  });
  cleaned = cleaned.replace(/var\s+\w+[^;]*;/g, " ");
  cleaned = cleaned.replace(/window\.\w+[^;]*;/g, " ");
  cleaned = cleaned.replace(/\s+/g, " ").trim();

  const lines = text
    .split(/\n+/)
    .map((l) => l.trim())
    .filter(Boolean);

  const dropPatterns = [
    /본문\s*바로가기/i,
    /카테고리\s*이동/i,
    /\bMY\s*메뉴\b/i,
    /공유하기|URL복사|신고하기/i,
    /댓글\s*\d+|공감\s*\d+/i,
    /Previous image|Next image/i,
    /블로그\s*검색|이\s*블로그에서\s*검색/i,
    /폰트\s*크기/i,
    /이웃추가/i,
  ];

  const filtered = lines.filter((l) => {
    if (l.length <= 2) return false;
    if (dropPatterns.some((re) => re.test(l))) return false;
    if (/var\s+\w+|function\s*\(|window\.\w+|document\.\w+/.test(l)) return false;
    return true;
  });

  const lineCleaned = filtered.join(" ").replace(/\s+/g, " ").trim();
  return lineCleaned.length >= cleaned.length ? lineCleaned : cleaned;
}

async function extractNaverBlogText(page) {
  const mainFrame = page.frame({ name: "mainFrame" });
  await sleep(900);

  const waitSel = ".se-main-container, #postViewArea, .post_view, article";
  if (mainFrame) {
    await mainFrame.waitForSelector(waitSel, { timeout: 5000 }).catch(() => {});
  } else {
    await page.waitForSelector(waitSel, { timeout: 5000 }).catch(() => {});
  }

  const framesToTry = [];
  if (mainFrame) framesToTry.push(mainFrame);

  for (const f of page.frames()) {
    const u = (f.url() || "").toLowerCase();
    if (u.includes("postview.naver") || u.includes("m.blog.naver.com")) {
      framesToTry.push(f);
    }
  }
  if (framesToTry.length === 0) framesToTry.push(page);

  const selectors = [
    ".se-main-container",
    "#postViewArea",
    ".post_view",
    "article",
  ];

  let bestRaw = "";
  for (const f of framesToTry) {
    for (const sel of selectors) {
      try {
        const txt = await f.evaluate((selector) => {
          const el = document.querySelector(selector);
          if (!el) return "";
          const t = (el.textContent || "").replace(/\s+/g, " ").trim();
          return t;
        }, sel);
        if (txt && txt.length > bestRaw.length) bestRaw = txt;
      } catch {
        // ignore
      }
    }
  }

  if (!bestRaw || bestRaw.length < 200) {
    try {
      const fb = await (mainFrame || page).evaluate(() => {
        const candidates = Array.from(document.querySelectorAll("div, section, article"));
        let best = "";
        for (const el of candidates) {
          if (el.closest("header, nav, footer, aside")) continue;
          const t = (el.textContent || "").replace(/\s+/g, " ").trim();
          if (t.length > best.length) best = t;
        }
        return best;
      });
      if (fb && fb.length > bestRaw.length) bestRaw = fb;
    } catch {
      // ignore
    }
  }

  return cleanNaverText(bestRaw);
}

async function acquireSlot() {
  while (active >= MAX_CONCURRENT) {
    await new Promise((resolve) => waiters.push(resolve));
  }
  active += 1;
}

function releaseSlot() {
  active = Math.max(0, active - 1);
  const next = waiters.shift();
  if (next) next();
}

async function getBrowser() {
  if (!browserPromise) {
    browserPromise = chromium.launch({
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-dev-shm-usage",
        "--disable-gpu",
        "--disable-extensions",
        "--disable-background-networking",
        "--disable-sync",
        "--disable-default-apps",
      ],
    });
  }
  return browserPromise;
}

function requireKey(req, res, next) {
  if (!API_KEY) return next();
  const key = req.header("x-crawler-key");
  if (!key || key !== API_KEY) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  return next();
}

app.post("/extract", requireKey, async (req, res) => {
  const url = req.body?.url;
  if (!url || typeof url !== "string") {
    return res.status(400).json({ error: "Missing url" });
  }

  try {
    await acquireSlot();
    const browser = await getBrowser();
    const context = await browser.newContext({
      userAgent:
        "Mozilla/5.0 (Macintosh; Intel Mac OS X) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36",
    });
    const page = await context.newPage();

    await page.route("**/*", (route) => {
      const type = route.request().resourceType();
      if (type === "image" || type === "media" || type === "font") {
        return route.abort();
      }
      return route.continue();
    });

    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 25_000 });
    await sleep(700);

    const extractText = async (p) =>
      p.evaluate(() => {
        const article = document.querySelector("article");
        const main = document.querySelector("main");
        const pick = article || main;
        if (pick) return (pick.textContent || "").replace(/\s+/g, " ").trim();

        const candidates = Array.from(document.querySelectorAll("div, section, article"));
        let best = "";
        for (const el of candidates) {
          if (el.closest("header, nav, footer, aside")) continue;
          const t = (el.textContent || "").replace(/\s+/g, " ").trim();
          if (t.length > best.length) best = t;
        }
        return best.trim();
      });

    const urlLower = url.toLowerCase();
    let best = "";
    if (urlLower.includes("blog.naver.com") || urlLower.includes("m.blog.naver.com")) {
      best = await extractNaverBlogText(page);
    } else {
      best = await extractText(page);
      for (const frame of page.frames()) {
        try {
          const text = await extractText(frame);
          if (text.length > best.length) best = text;
        } catch {
          // ignore
        }
      }
    }
    await page.close();
    await context.close();

    if (!best || best.length < MIN_TEXT_LEN) {
      return res.status(422).json({ error: "Content too short" });
    }

    const sample = best.slice(0, 600);
    console.log(`[extract] url=${url} len=${best.length} sample="${sample}"`);
    return res.json({ text: best });
  } catch (err) {
    return res.status(500).json({ error: err?.message || "Extract failed" });
  } finally {
    releaseSlot();
  }
});

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

const port = process.env.PORT || 8080;
app.listen(port, () => {
  console.log(`crawler listening on ${port}`);
});

process.on("SIGTERM", async () => {
  if (browserPromise) {
    const browser = await browserPromise;
    await browser.close();
  }
  process.exit(0);
});

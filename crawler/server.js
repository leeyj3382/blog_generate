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
        const body = document.body;
        const text =
          article?.textContent || main?.textContent || body?.textContent || "";
        return text.replace(/\s+/g, " ").trim();
      });

    let best = await extractText(page);
    for (const frame of page.frames()) {
      try {
        const text = await extractText(frame);
        if (text.length > best.length) best = text;
      } catch {
        // ignore frame errors
      }
    }

    await page.close();
    await context.close();

    if (!best || best.length < MIN_TEXT_LEN) {
      return res.status(422).json({ error: "Content too short" });
    }

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

import express from "express";
import { chromium } from "playwright";

const app = express();
app.use(express.json({ limit: "2mb" }));

const API_KEY = process.env.CRAWLER_API_KEY || "";

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

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({
    userAgent:
      "Mozilla/5.0 (Macintosh; Intel Mac OS X) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36",
  });

  try {
    await page.goto(url, { waitUntil: "networkidle", timeout: 25_000 });

    const extractText = async (p) => {
      return p.evaluate(() => {
        const article = document.querySelector("article");
        const main = document.querySelector("main");
        const body = document.body;
        const text =
          article?.textContent || main?.textContent || body?.textContent || "";
        return text.replace(/\s+/g, " ").trim();
      });
    };

    let best = await extractText(page);
    for (const frame of page.frames()) {
      try {
        const text = await extractText(frame);
        if (text.length > best.length) best = text;
      } catch {
        // ignore frame errors
      }
    }

    if (!best || best.length < 200) {
      return res.status(422).json({ error: "Content too short" });
    }

    return res.json({ text: best });
  } catch (err) {
    return res.status(500).json({ error: err?.message || "Extract failed" });
  } finally {
    await page.close();
    await browser.close();
  }
});

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

const port = process.env.PORT || 8080;
app.listen(port, () => {
  console.log(`crawler listening on ${port}`);
});

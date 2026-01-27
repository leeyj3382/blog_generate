type RateEntry = { count: number; resetAt: number };

const RATE_WINDOW_MS = 60_000;
const RATE_MAX = 20;
const store = new Map<string, RateEntry>();

export function rateLimit(key: string) {
  const now = Date.now();
  const entry = store.get(key);
  if (!entry || entry.resetAt < now) {
    store.set(key, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return { ok: true } as const;
  }
  if (entry.count >= RATE_MAX) {
    return { ok: false, retryAfterMs: entry.resetAt - now } as const;
  }
  entry.count += 1;
  return { ok: true } as const;
}

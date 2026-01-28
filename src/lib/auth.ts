import { getAdminAuth } from "@/lib/firebaseAdmin";

export function getBearerToken(request: Request): string | null {
  const authHeader = request.headers.get("authorization");
  if (!authHeader) return null;
  const match = authHeader.match(/^Bearer (.+)$/i);
  return match?.[1] ?? null;
}

export async function requireAuth(request: Request) {
  const token = getBearerToken(request);
  if (!token) {
    return { ok: false as const, error: "Missing token" };
  }
  try {
    const decoded = await getAdminAuth().verifyIdToken(token);
    return { ok: true as const, decoded };
  } catch {
    return { ok: false as const, error: "Invalid token" };
  }
}

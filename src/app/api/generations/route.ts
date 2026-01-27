import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { requireAuth } from "@/lib/auth";

function parseCursor(cursor: string) {
  const [createdAtRaw, id] = cursor.split("_");
  const createdAt = Number(createdAtRaw);
  if (!id || Number.isNaN(createdAt)) return null;
  return { createdAt, id };
}

export async function GET(request: Request) {
  const auth = await requireAuth(request);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const limit = Math.min(Number(searchParams.get("limit") ?? 20), 50);
  const cursor = searchParams.get("cursor");

  let query = adminDb
    .collection("users")
    .doc(auth.decoded.uid)
    .collection("generations")
    .orderBy("createdAt", "desc")
    .limit(limit);

  if (cursor) {
    const parsed = parseCursor(cursor);
    if (parsed) {
      query = query.startAfter(parsed.createdAt);
    }
  }

  const snap = await query.get();
  const items = snap.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      platform: data.platform,
      purpose: data.purpose,
      length: data.length,
      topic: data.topic,
      keywords: data.keywords ?? [],
      extraPrompt: data.extraPrompt ?? null,
      titleCandidate: data.titleCandidate ?? data.output?.titleCandidates?.[0] ?? null,
      status: data.status ?? "success",
      error: data.error ?? null,
      createdAt: data.createdAt,
    };
  });

  const last = snap.docs[snap.docs.length - 1];
  const nextCursor = last ? `${last.data().createdAt}_${last.id}` : null;

  return NextResponse.json({ items, nextCursor });
}

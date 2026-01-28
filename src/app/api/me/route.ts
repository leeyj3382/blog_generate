import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebaseAdmin";
import { requireAuth } from "@/lib/auth";

function nowMs() {
  return Date.now();
}

export async function GET(request: Request) {
  const auth = await requireAuth(request);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: 401 });
  }

  const uid = auth.decoded.uid;
  const email = auth.decoded.email ?? null;
  const adminDb = getAdminDb();
  const userRef = adminDb.collection("users").doc(uid);
  const snap = await userRef.get();
  const timestamp = nowMs();

  if (!snap.exists) {
    const doc = {
      email,
      credits: 1,
      freeTrialUsed: false,
      plan: "free",
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    await userRef.set(doc);
    return NextResponse.json({ uid, ...doc });
  }

  const data = snap.data() ?? {};
  return NextResponse.json({
    uid,
    email: data.email ?? email,
    credits: data.credits ?? 0,
    freeTrialUsed: Boolean(data.freeTrialUsed),
    plan: data.plan ?? "free",
  });
}

import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { requireAuth } from "@/lib/auth";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(request);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: 401 });
  }

  const { id } = await params;
  const docRef = adminDb.collection("generations").doc(id);
  const snap = await docRef.get();
  if (!snap.exists) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const data = snap.data() ?? {};
  if (data.uid !== auth.decoded.uid) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return NextResponse.json({ id: snap.id, ...data });
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(request);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: 401 });
  }

  const { id } = await params;
  const docRef = adminDb.collection("generations").doc(id);
  const snap = await docRef.get();
  if (!snap.exists) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const data = snap.data() ?? {};
  if (data.uid !== auth.decoded.uid) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await docRef.delete();
  await adminDb
    .collection("users")
    .doc(auth.decoded.uid)
    .collection("generations")
    .doc(id)
    .delete();
  return NextResponse.json({ ok: true });
}

import { firebaseAuth } from "@/lib/firebaseClient";

export async function getIdToken() {
  const user = firebaseAuth.currentUser;
  if (!user) return null;
  return user.getIdToken(true);
}

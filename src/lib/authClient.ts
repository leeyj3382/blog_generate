import { firebaseAuth } from "@/lib/firebaseClient";

export async function getIdToken() {
  const user = firebaseAuth.currentUser;
  if (!user) throw new Error("Not authenticated");
  return user.getIdToken();
}

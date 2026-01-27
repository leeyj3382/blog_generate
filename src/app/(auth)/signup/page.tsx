"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { firebaseAuth } from "@/lib/firebaseClient";

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const credential = await createUserWithEmailAndPassword(
        firebaseAuth,
        email,
        password
      );
      const token = await credential.user.getIdToken();
      await fetch("/api/me", {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
      });
      router.push("/generate");
    } catch (err) {
      setError(err instanceof Error ? err.message : "회원가입 실패");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="p-8 max-w-md mx-auto space-y-6">
      <h1 className="text-xl font-semibold">회원가입</h1>
      <form className="space-y-4" onSubmit={onSubmit}>
        <input
          className="w-full border p-2 rounded"
          type="email"
          placeholder="이메일"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          className="w-full border p-2 rounded"
          type="password"
          placeholder="비밀번호"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          className="w-full bg-black text-white py-2 rounded"
          type="submit"
          disabled={loading}
        >
          {loading ? "가입 중..." : "회원가입"}
        </button>
      </form>
      <p className="text-sm">
        이미 계정이 있나요? <Link href="/login">로그인</Link>
      </p>
    </main>
  );
}

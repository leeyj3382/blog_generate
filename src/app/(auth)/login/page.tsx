"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signInWithEmailAndPassword } from "firebase/auth";
import { firebaseAuth } from "@/lib/firebaseClient";

export default function LoginPage() {
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
      await signInWithEmailAndPassword(firebaseAuth, email, password);
      router.push("/generate");
    } catch (err) {
      setError(err instanceof Error ? err.message : "로그인 실패");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="p-8 max-w-md mx-auto space-y-6">
      <h1 className="text-xl font-semibold">로그인</h1>
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
          {loading ? "로그인 중..." : "로그인"}
        </button>
      </form>
      <p className="text-sm">
        계정이 없나요? <Link href="/signup">회원가입</Link>
      </p>
    </main>
  );
}

"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { signOut } from "firebase/auth";
import { firebaseAuth } from "@/lib/firebaseClient";
import { useAuth } from "@/components/AuthProvider";

export default function Header() {
  const { user, loading } = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    await signOut(firebaseAuth);
    router.push("/");
  };

  return (
    <header className="border-b">
      <nav className="max-w-5xl mx-auto px-6 py-4 flex flex-wrap gap-4 text-sm">
        <Link href="/" className="font-medium">
          홈
        </Link>
        <Link href="/pricing" className="text-gray-600 hover:text-black">
          가격
        </Link>
        <Link href="/guides" className="text-gray-600 hover:text-black">
          가이드
        </Link>
        <Link href="/templates" className="text-gray-600 hover:text-black">
          템플릿
        </Link>
        {loading ? null : user ? (
          <>
            <Link href="/generate" className="text-gray-600 hover:text-black">
              생성기
            </Link>
            <Link href="/me" className="text-gray-600 hover:text-black">
              마이페이지
            </Link>
            <button
              type="button"
              onClick={handleLogout}
              className="text-gray-600 hover:text-black"
            >
              로그아웃
            </button>
          </>
        ) : (
          <Link href="/login" className="text-gray-600 hover:text-black">
            로그인
          </Link>
        )}
      </nav>
    </header>
  );
}

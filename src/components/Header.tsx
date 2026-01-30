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
    <header className="sticky top-0 z-50 w-full border-b border-[color:var(--border)] bg-[color:var(--bg)]/80 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        {/* 왼쪽 로고 영역 */}
        <Link href="/" className="flex items-center gap-2 group">
          <span className="text-xl font-bold tracking-tight text-[color:var(--foreground)] group-hover:text-[color:var(--accent)] transition-colors">
            Writing Smart
          </span>
        </Link>

        {/* 오른쪽 네비게이션 영역 */}
        <nav className="hidden md:flex items-center gap-8 text-[15px] font-medium text-[color:var(--text-muted)]">
          <Link
            href="/pricing"
            className="hover:text-[color:var(--accent)] transition-colors"
          >
            가격
          </Link>
          <Link
            href="/guides"
            className="hover:text-[color:var(--accent)] transition-colors"
          >
            가이드
          </Link>
          <Link
            href="/templates"
            className="hover:text-[color:var(--accent)] transition-colors"
          >
            템플릿
          </Link>

          {/* 구분선 */}
          <div className="w-px h-4 bg-[color:var(--border)]" />

          {/* 로그인 상태에 따른 UI 분기 */}
          {loading ? (
            <span className="text-sm opacity-50">Loading...</span>
          ) : user ? (
            // [로그인 상태]
            <div className="flex items-center gap-6">
              <Link
                href="/generate"
                className="hover:text-[color:var(--accent)] transition-colors"
              >
                생성기
              </Link>
              <Link
                href="/me"
                className="hover:text-[color:var(--accent)] transition-colors"
              >
                마이페이지
              </Link>
              <button
                type="button"
                onClick={handleLogout}
                className="text-sm bg-[color:var(--surface)] border border-[color:var(--border)] px-4 py-2 rounded-full hover:bg-[color:var(--surface-2)] transition-colors"
              >
                로그아웃
              </button>
            </div>
          ) : (
            // [비로그인 상태] - 이 부분이 누락되지 않았는지 확인하세요
            <Link
              href="/login"
              className="px-4 py-2 rounded-full bg-[color:var(--accent)] text-[color:var(--bg)] text-sm font-semibold hover:opacity-90 transition-opacity shadow-lg shadow-[color:var(--accent)]/20"
            >
              로그인
            </Link>
          )}
        </nav>

        {/* 모바일용 메뉴 (화면이 작을 때만 보임) */}
        <div className="md:hidden">
          {/* 필요 시 여기에 햄버거 메뉴 아이콘 추가 */}
        </div>
      </div>
    </header>
  );
}

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getIdToken } from "@/lib/authClient";

type HistoryItem = {
  id: string;
  platform: string;
  purpose?: string;
  length?: string;
  topic?: string;
  keywords?: string[];
  extraPrompt?: string | null;
  titleCandidate?: string | null;
  createdAt?: number;
};

export default function HistoryPage() {
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [query, setQuery] = useState("");
  const [platform, setPlatform] = useState("all");
  const [purpose, setPurpose] = useState("all");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  // 데이터 로드
  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const token = await getIdToken();
        if (!token) {
          setError("로그인이 필요합니다.");
          setLoading(false);
          return;
        }
        const res = await fetch("/api/generations?limit=50", {
          // limit 조금 늘림
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error ?? "불러오기 실패");
        }
        const payload = await res.json();
        if (active) setItems((payload.items ?? []) as HistoryItem[]);
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : "오류 발생");
      } finally {
        if (active) setLoading(false);
      }
    };
    load();
    return () => {
      active = false;
    };
  }, []);

  // 단일 삭제
  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.preventDefault(); // 링크 이동 방지
    if (!window.confirm("정말 이 내역을 삭제하시겠습니까?")) return;

    try {
      setBusyId(id);
      const token = await getIdToken();
      if (!token) return;

      const res = await fetch(`/api/generations/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("삭제 실패");

      setItems((prev) => prev.filter((item) => item.id !== id));
    } catch (err) {
      alert(err instanceof Error ? err.message : "오류 발생");
    } finally {
      setBusyId(null);
    }
  };

  // 전체 삭제
  const handleDeleteAll = async () => {
    if (
      !window.confirm(
        "모든 생성 내역이 영구적으로 삭제됩니다. 계속하시겠습니까?",
      )
    )
      return;

    try {
      setLoading(true);
      const token = await getIdToken();
      if (!token) return;

      const res = await fetch("/api/generations", {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("전체 삭제 실패");

      setItems([]);
    } catch (err) {
      alert(err instanceof Error ? err.message : "오류 발생");
    } finally {
      setLoading(false);
    }
  };

  // 필터링 로직
  const filteredItems = items
    .filter((item) => (platform === "all" ? true : item.platform === platform))
    .filter((item) => (purpose === "all" ? true : item.purpose === purpose))
    .filter((item) => {
      if (!query.trim()) return true;
      const keywordText = item.keywords?.join(" ") ?? "";
      const haystack =
        `${item.titleCandidate ?? ""} ${item.topic ?? ""} ${keywordText}`.toLowerCase();
      return haystack.includes(query.toLowerCase());
    });

  if (loading && items.length === 0) {
    return (
      <main className="min-h-screen bg-[color:var(--bg-soft)] flex items-center justify-center">
        <div className="relative w-10 h-10">
          <div className="absolute inset-0 border-2 border-[color:var(--surface-2)] rounded-full"></div>
          <div className="absolute inset-0 border-2 border-[color:var(--accent)] border-t-transparent rounded-full animate-spin"></div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[color:var(--bg-soft)] py-12 px-4 md:px-8">
      <div className="max-w-5xl mx-auto space-y-8">
        {/* 헤더 */}
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-[color:var(--text-muted)]">
              <Link
                href="/me"
                className="hover:text-[color:var(--foreground)] transition-colors"
              >
                마이페이지
              </Link>
              <span>/</span>
              <span>History</span>
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-[color:var(--foreground)]">
              생성 내역
            </h1>
            <p className="text-[color:var(--text-muted)]">
              지금까지 AI가 작성한 모든 글을 확인하고 관리하세요. (총{" "}
              {items.length}건)
            </p>
          </div>
          {items.length > 0 && (
            <button
              type="button"
              onClick={handleDeleteAll}
              className="px-4 py-2 rounded-lg border border-red-200 text-red-500 text-sm hover:bg-red-50 transition-colors"
            >
              전체 내역 삭제
            </button>
          )}
        </header>

        {/* 필터 및 검색 바 */}
        <div className="bg-[color:var(--surface)] border border-[color:var(--border)] p-4 rounded-2xl shadow-sm grid grid-cols-1 md:grid-cols-[1fr_auto_auto] gap-3">
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[color:var(--text-muted)]">
              🔍
            </span>
            <input
              className="w-full bg-[color:var(--bg)] border border-[color:var(--border)] py-2.5 pl-9 pr-4 rounded-xl focus:ring-2 focus:ring-[color:var(--accent)] outline-none transition-all placeholder:text-[color:var(--text-muted)]/50"
              placeholder="제목, 주제, 키워드로 검색..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>

          <select
            className="bg-[color:var(--bg)] border border-[color:var(--border)] px-4 py-2.5 rounded-xl focus:ring-2 focus:ring-[color:var(--accent)] outline-none transition-all text-sm"
            value={platform}
            onChange={(e) => setPlatform(e.target.value)}
          >
            <option value="all">모든 플랫폼</option>
            <option value="blog">블로그 (SEO)</option>
            <option value="sns">SNS</option>
            <option value="store">스토어</option>
          </select>

          <select
            className="bg-[color:var(--bg)] border border-[color:var(--border)] px-4 py-2.5 rounded-xl focus:ring-2 focus:ring-[color:var(--accent)] outline-none transition-all text-sm"
            value={purpose}
            onChange={(e) => setPurpose(e.target.value)}
          >
            <option value="all">모든 목적</option>
            <option value="review">후기/리뷰</option>
            <option value="promo">홍보/프로모션</option>
            <option value="info">정보성</option>
            <option value="ad">광고</option>
          </select>
        </div>

        {error && (
          <div className="p-4 bg-red-50 text-red-600 rounded-xl text-sm border border-red-100 text-center">
            {error}
          </div>
        )}

        {/* 리스트 영역 */}
        <div className="space-y-4">
          {filteredItems.length > 0 ? (
            <div className="grid gap-4">
              {filteredItems.map((item) => (
                <Link
                  key={item.id}
                  href={`/result/${item.id}`}
                  className="group relative bg-[color:var(--surface)] border border-[color:var(--border)] rounded-2xl p-5 md:p-6 hover:border-[color:var(--accent)] hover:shadow-lg hover:shadow-[color:var(--accent)]/5 transition-all duration-300 block"
                >
                  <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                    <div className="space-y-3 flex-1 min-w-0">
                      {/* 상단 태그 */}
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`text-[10px] uppercase font-bold tracking-wider px-2 py-1 rounded-md border ${item.platform === "blog" ? "bg-blue-50 text-blue-600 border-blue-100" : item.platform === "sns" ? "bg-pink-50 text-pink-600 border-pink-100" : "bg-orange-50 text-orange-600 border-orange-100"}`}
                        >
                          {item.platform}
                        </span>
                        <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-1 rounded-md bg-[color:var(--surface-2)] text-[color:var(--text-muted)] border border-[color:var(--border)]">
                          {item.purpose}
                        </span>
                        {item.createdAt && (
                          <span className="text-xs text-[color:var(--text-muted)]">
                            {new Date(item.createdAt).toLocaleDateString(
                              "ko-KR",
                              {
                                year: "numeric",
                                month: "long",
                                day: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              },
                            )}
                          </span>
                        )}
                      </div>

                      {/* 제목 및 주제 */}
                      <div>
                        <h3 className="text-lg font-bold text-[color:var(--foreground)] group-hover:text-[color:var(--accent)] transition-colors line-clamp-1 mb-1">
                          {item.titleCandidate || item.topic || "(제목 없음)"}
                        </h3>
                        <p className="text-sm text-[color:var(--text-muted)] line-clamp-1">
                          {item.topic}
                        </p>
                      </div>

                      {/* 키워드 */}
                      {item.keywords && item.keywords.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {item.keywords.slice(0, 5).map((kw, idx) => (
                            <span
                              key={idx}
                              className="text-xs text-[color:var(--text-muted)] bg-[color:var(--bg)] px-2 py-0.5 rounded-full border border-[color:var(--border)]"
                            >
                              #{kw}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* 우측 액션 버튼 */}
                    <div className="flex items-center gap-3 md:flex-col md:gap-2 shrink-0">
                      <span className="btn-primary text-xs px-4 py-2 w-full text-center transition-colors">
                        결과 보기 &rarr;
                      </span>
                      <button
                        type="button"
                        onClick={(e) => handleDelete(item.id, e)}
                        disabled={busyId === item.id}
                        className="btn-primary text-xs px-4 py-2 w-full text-center border border-[color:var(--accent)]/30 bg-transparent text-[color:var(--text-muted)] hover:text-red-500 hover:bg-red-50"
                      >
                        {busyId === item.id ? "삭제 중..." : "삭제하기"}
                      </button>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="py-20 text-center space-y-4 border-2 border-dashed border-[color:var(--border)] rounded-3xl bg-[color:var(--bg)]/50">
              <div className="text-4xl">📭</div>
              <div className="space-y-1">
                <p className="text-[color:var(--foreground)] font-medium">
                  표시할 생성 내역이 없습니다.
                </p>
                <p className="text-[color:var(--text-muted)] text-sm">
                  필터를 변경하거나 새로운 글을 작성해보세요.
                </p>
              </div>
              <div className="pt-4">
                <Link
                  href="/generate"
                  className="btn-primary inline-block text-sm"
                >
                  새 글 작성하러 가기
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

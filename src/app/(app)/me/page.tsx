"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getIdToken } from "@/lib/authClient";

type MePayload = {
  email?: string | null;
  credits?: number;
  freeTrialUsed?: boolean;
  plan?: string;
};

type HistoryItem = {
  id: string;
  platform: string;
  purpose?: string;
  length?: string;
  topic?: string;
  titleCandidate?: string | null;
  createdAt?: string; // API에서 날짜를 준다면 추가 (없으면 제외)
};

export default function MePage() {
  const [data, setData] = useState<MePayload | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

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

        // 병렬 요청으로 속도 개선
        const [meRes, historyRes] = await Promise.all([
          fetch("/api/me", { headers: { Authorization: `Bearer ${token}` } }),
          fetch("/api/generations?limit=5", {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);

        if (!meRes.ok) {
          const body = await meRes.json().catch(() => ({}));
          throw new Error(body.error ?? "정보를 불러오지 못했습니다.");
        }

        const mePayload = (await meRes.json()) as MePayload;

        let historyItems: HistoryItem[] = [];
        if (historyRes.ok) {
          const historyPayload = await historyRes.json();
          historyItems = (historyPayload.items ?? []) as HistoryItem[];
        }

        if (active) {
          setData(mePayload);
          setHistory(historyItems);
        }
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

  const handleDelete = async (id: string) => {
    const confirmed = window.confirm("이 내역을 삭제할까요?");
    if (!confirmed) return;
    try {
      setBusyId(id);
      const token = await getIdToken();
      if (!token) {
        setError("로그인이 필요합니다.");
        return;
      }
      const res = await fetch(`/api/generations/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "삭제 실패");
      }
      setHistory((prev) => prev.filter((item) => item.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "오류 발생");
    } finally {
      setBusyId(null);
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-[color:var(--bg-soft)] flex items-center justify-center">
        <div className="relative w-12 h-12">
          <div className="absolute inset-0 border-2 border-[color:var(--surface-2)] rounded-full"></div>
          <div className="absolute inset-0 border-2 border-[color:var(--accent)] border-t-transparent rounded-full animate-spin"></div>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen bg-[color:var(--bg-soft)] p-8 flex items-center justify-center">
        <div className="text-center space-y-4">
          <p className="text-red-500">{error}</p>
          <Link href="/login" className="btn-primary inline-block text-sm">
            로그인 페이지로 이동
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[color:var(--bg-soft)] py-12 px-4 md:px-8">
      <div className="max-w-5xl mx-auto space-y-10">
        {/* 헤더 섹션 */}
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-6 border-b border-[color:var(--border)]">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold tracking-tight text-[color:var(--foreground)]">
              마이 워크스페이스
            </h1>
            <p className="text-[color:var(--text-muted)]">
              현재 멤버십 상태와 최근 활동 내역입니다.
            </p>
          </div>
          <Link
            href="/generate"
            className="btn-primary flex items-center justify-center gap-2 text-sm px-5 py-3 shadow-lg shadow-[color:var(--accent)]/10"
          >
            <span>✨ 새 글 작성하기</span>
          </Link>
        </header>

        {data && (
          <div className="space-y-10">
            {/* 상단 정보 카드 그리드 */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* 카드 1: 내 정보 */}
              <div className="bg-[color:var(--surface)] border border-[color:var(--border)] rounded-2xl p-6 space-y-4 relative overflow-hidden group hover:border-[color:var(--accent)]/50 transition-colors">
                <div className="space-y-1 relative z-10">
                  <p className="text-xs font-semibold uppercase text-[color:var(--text-muted)]">
                    Account
                  </p>
                  <p
                    className="font-medium text-lg truncate"
                    title={data.email || ""}
                  >
                    {data.email || "이메일 정보 없음"}
                  </p>
                </div>
                <div className="pt-2 relative z-10">
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${data.plan === "Pro" ? "bg-[color:var(--accent)] text-[color:var(--bg)]" : "bg-[color:var(--surface-2)] text-[color:var(--text-muted)]"}`}
                  >
                    {data.plan || "Free Plan"}
                  </span>
                </div>
                {/* 배경 장식 요소 */}
                <div className="absolute -right-4 -top-4 w-24 h-24 bg-[color:var(--accent)]/5 rounded-full blur-2xl group-hover:bg-[color:var(--accent)]/10 transition-all" />
              </div>

              {/* 카드 2: 크레딧 (강조) */}
              <div className="bg-[color:var(--surface)] border border-[color:var(--border)] rounded-2xl p-6 flex flex-col justify-between relative overflow-hidden group hover:border-[color:var(--accent)]/50 transition-colors">
                <div className="space-y-1 relative z-10">
                  <p className="text-xs font-semibold uppercase text-[color:var(--text-muted)]">
                    Available Credits
                  </p>
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-bold text-[color:var(--accent)]">
                      {data.credits}
                    </span>
                    <span className="text-sm text-[color:var(--text-muted)]">
                      cr
                    </span>
                  </div>
                </div>
                <div className="pt-4 relative z-10">
                  <Link
                    href="/me/billing"
                    className="text-sm text-[color:var(--text)] underline decoration-[color:var(--text-muted)] underline-offset-4 hover:text-[color:var(--accent)] transition-colors"
                  >
                    충전하기 &rarr;
                  </Link>
                </div>
                <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-[color:var(--accent)]/10 rounded-full blur-2xl" />
              </div>

              {/* 카드 3: 요금제/결제 정보 */}
              <div className="bg-[color:var(--surface)] border border-[color:var(--border)] rounded-2xl p-6 flex flex-col justify-between hover:border-[color:var(--accent)]/50 transition-colors">
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase text-[color:var(--text-muted)]">
                    Billing
                  </p>
                  <p className="text-sm text-[color:var(--text-muted)] leading-relaxed">
                    {data.freeTrialUsed
                      ? "무료 체험을 이미 사용하셨습니다."
                      : "무료 체험이 가능합니다."}
                  </p>
                </div>
                <div className="pt-4">
                  <Link
                    href="/me/billing"
                    className="btn-outline text-xs px-4 py-2 inline-block"
                  >
                    요금제 변경 / 관리
                  </Link>
                </div>
              </div>
            </div>

            {/* 최근 생성 내역 섹션 */}
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-[color:var(--foreground)]">
                  최근 활동 내역
                </h2>
                <Link
                  href="/me/history"
                  className="text-sm text-[color:var(--text-muted)] hover:text-[color:var(--accent)] transition-colors flex items-center gap-1"
                >
                  전체 내역 보기 &rarr;
                </Link>
              </div>

              <div className="bg-[color:var(--surface)] border border-[color:var(--border)] rounded-3xl overflow-hidden">
                {history.length > 0 ? (
                  <ul className="divide-y divide-[color:var(--surface-2)]">
                    {history.map((item) => (
                      <li
                        key={item.id}
                        className="group hover:bg-[color:var(--surface-2)]/50 transition-colors"
                      >
                        <div className="p-5 sm:p-6">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div className="space-y-2">
                              <Link
                                href={`/result/${item.id}`}
                                className="block text-base font-semibold text-[color:var(--foreground)] group-hover:text-[color:var(--accent)] transition-colors line-clamp-1"
                              >
                                {item.titleCandidate ||
                                  item.topic ||
                                  "(제목 없음)"}
                              </Link>
                              <div className="flex flex-wrap items-center gap-2 text-xs">
                                <span className="px-2 py-1 rounded bg-[color:var(--bg)] border border-[color:var(--surface-2)] text-[color:var(--text-muted)] uppercase tracking-wider">
                                  {item.platform}
                                </span>
                                <span className="text-[color:var(--text-muted)]">
                                  ·
                                </span>
                                <span className="text-[color:var(--text-muted)]">
                                  {item.purpose}
                                </span>
                                <span className="text-[color:var(--text-muted)]">
                                  ·
                                </span>
                                <span className="text-[color:var(--text-muted)]">
                                  {item.length === "xlong"
                                    ? "아주 길게"
                                    : item.length === "long"
                                      ? "길게"
                                      : "보통"}
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <Link
                                href={`/result/${item.id}`}
                                className="btn-outline text-xs px-3 py-1.5 opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0"
                              >
                                상세보기
                              </Link>
                              <button
                                type="button"
                                className="btn-outline text-xs px-3 py-1.5 text-red-400 border-red-400/40 hover:text-red-300 hover:border-red-300/60 opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0"
                                onClick={() => handleDelete(item.id)}
                                disabled={busyId === item.id}
                              >
                                삭제
                              </button>
                            </div>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="p-12 text-center space-y-4">
                    <div className="w-16 h-16 bg-[color:var(--surface-2)] rounded-full flex items-center justify-center mx-auto text-2xl">
                      📝
                    </div>
                    <div>
                      <p className="text-[color:var(--foreground)] font-medium">
                        아직 작성된 글이 없습니다.
                      </p>
                      <p className="text-[color:var(--text-muted)] text-sm mt-1">
                        AI와 함께 첫 번째 글을 작성해보세요.
                      </p>
                    </div>
                    <Link
                      href="/generate"
                      className="btn-primary inline-block text-sm px-6 mt-2"
                    >
                      첫 글 작성하기
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

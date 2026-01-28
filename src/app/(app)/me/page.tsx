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
};

export default function MePage() {
  const [data, setData] = useState<MePayload | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const token = await getIdToken();
        if (!token) {
          setError("로그인이 필요합니다.");
          return;
        }
        const res = await fetch("/api/me", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error ?? "불러오기 실패");
        }
        const payload = (await res.json()) as MePayload;
        if (active) setData(payload);

        const historyRes = await fetch("/api/generations?limit=5", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (historyRes.ok) {
          const historyPayload = await historyRes.json();
          if (active) setHistory((historyPayload.items ?? []) as HistoryItem[]);
        }
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : "오류 발생");
      }
    };
    load();
    return () => {
      active = false;
    };
  }, []);

  return (
    <main className="p-8 max-w-3xl mx-auto space-y-6">
      <h1 className="text-xl font-semibold">마이페이지</h1>
      {error && <p className="text-sm text-red-600">{error}</p>}
      {!data && !error && <p className="text-sm">불러오는 중...</p>}
      {data && (
        <div className="space-y-4 text-sm">
          <div className="space-y-1">
            <p>이메일: {data.email ?? "-"}</p>
            <p>남은 크레딧: {data.credits}</p>
            <p>무료 체험 사용: {data.freeTrialUsed ? "예" : "아니오"}</p>
            <p>플랜: {data.plan}</p>
            <Link href="/me/billing" className="inline-block mt-2">
              <button className="px-3 py-1.5 border rounded text-sm">
                크레딧 충전
              </button>
            </Link>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h2 className="font-medium">최근 생성 내역</h2>
              <Link href="/me/history" className="underline">
                전체 보기
              </Link>
            </div>
            <ul className="space-y-2">
              {history.map((item) => (
                <li key={item.id} className="border p-3 rounded">
                  <p className="font-medium">
                    {item.titleCandidate || item.topic || "(제목 없음)"}
                  </p>
                  <p className="text-gray-500">
                    {item.platform} · {item.purpose} · {item.length}
                  </p>
                  <Link href={`/result/${item.id}`} className="underline">
                    상세 보기
                  </Link>
                </li>
              ))}
              {!history.length && (
                <li className="text-gray-500">아직 생성 내역이 없습니다.</li>
              )}
            </ul>
          </div>
          <div className="flex gap-3 text-sm">
            <Link href="/me/history" className="underline">
              생성 내역
            </Link>
            <Link href="/me/billing" className="underline">
              결제
            </Link>
          </div>
        </div>
      )}
    </main>
  );
}

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

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const token = await getIdToken();
        const res = await fetch("/api/generations?limit=20", {
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
      }
    };
    load();
    return () => {
      active = false;
    };
  }, []);

  return (
    <main className="p-8 max-w-3xl mx-auto space-y-6">
      <h1 className="text-xl font-semibold">생성 내역</h1>
      <div className="grid gap-3 sm:grid-cols-3 text-sm">
        <input
          className="border p-2 rounded"
          placeholder="제목/주제/키워드 검색"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <select
          className="border p-2 rounded"
          value={platform}
          onChange={(e) => setPlatform(e.target.value)}
        >
          <option value="all">플랫폼 전체</option>
          <option value="blog">blog</option>
          <option value="sns">sns</option>
          <option value="store">store</option>
        </select>
        <select
          className="border p-2 rounded"
          value={purpose}
          onChange={(e) => setPurpose(e.target.value)}
        >
          <option value="all">목적 전체</option>
          <option value="promo">promo</option>
          <option value="review">review</option>
          <option value="ad">ad</option>
          <option value="info">info</option>
          <option value="etc">etc</option>
        </select>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <ul className="space-y-3 text-sm">
        {items
          .filter((item) =>
            platform === "all" ? true : item.platform === platform
          )
          .filter((item) =>
            purpose === "all" ? true : item.purpose === purpose
          )
          .filter((item) => {
            if (!query.trim()) return true;
            const keywordText = item.keywords?.join(" ") ?? "";
            const haystack = `${item.titleCandidate ?? ""} ${item.topic ?? ""} ${keywordText}`.toLowerCase();
            return haystack.includes(query.toLowerCase());
          })
          .map((item) => (
          <li key={item.id} className="border p-3 rounded space-y-1">
            <p className="font-medium">
              {item.titleCandidate || item.topic || "(제목 없음)"}
            </p>
            <p className="text-gray-500">
              {item.platform} · {item.purpose} · {item.length}
            </p>
            {item.keywords?.length ? (
              <p className="text-gray-500">키워드: {item.keywords.join(", ")}</p>
            ) : null}
            {item.extraPrompt ? (
              <p className="text-gray-500">추가 프롬프트: {item.extraPrompt}</p>
            ) : null}
            {item.createdAt ? (
              <p className="text-gray-500">
                생성 일시: {new Date(item.createdAt).toLocaleString("ko-KR")}
              </p>
            ) : null}
            <Link href={`/result/${item.id}`} className="underline">
              상세 보기
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}

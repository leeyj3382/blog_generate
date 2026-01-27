"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { getIdToken } from "@/lib/authClient";

export default function ResultPage() {
  const params = useParams<{ id: string }>();
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!params?.id) return;
    let active = true;
    const load = async () => {
      try {
        const token = await getIdToken();
        const res = await fetch(`/api/generations/${params.id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error ?? "불러오기 실패");
        }
        const payload = await res.json();
        if (active) setData(payload);
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : "오류 발생");
      }
    };
    load();
    return () => {
      active = false;
    };
  }, [params?.id]);

  return (
    <main className="p-8 max-w-3xl mx-auto space-y-6">
      <h1 className="text-xl font-semibold">결과</h1>
      {error && <p className="text-sm text-red-600">{error}</p>}
      {!data && !error && <p className="text-sm">불러오는 중...</p>}
      {data && (
        <div className="space-y-4">
          <div className="text-sm text-gray-600 space-y-1">
            <p>플랫폼: {data.platform}</p>
            <p>목적: {data.purpose}</p>
            <p>길이: {data.length}</p>
            {data.keywords?.length ? (
              <p>키워드: {data.keywords.join(", ")}</p>
            ) : null}
            {data.extraPrompt ? <p>추가 프롬프트: {data.extraPrompt}</p> : null}
          </div>
          <div className="space-y-2">
            <h2 className="text-sm font-medium">스타일 프로필</h2>
            {data.styleProfile ? (
              <pre className="bg-gray-50 p-4 rounded text-xs overflow-auto">
                {JSON.stringify(data.styleProfile, null, 2)}
              </pre>
            ) : (
              <div className="text-sm text-gray-500 space-y-1">
                <p>스타일 프로필이 생성되지 않았습니다.</p>
                {data.referenceStats ? (
                  <p>
                    URL {data.referenceStats.urlCount}개 중{" "}
                    {data.referenceStats.fetchedCount}개 본문 추출, 총{" "}
                    {data.referenceStats.textCount}개 레퍼런스 사용.
                  </p>
                ) : null}
              </div>
            )}
          </div>
          <pre className="bg-gray-50 p-4 rounded text-xs overflow-auto">
            {JSON.stringify(data.output, null, 2)}
          </pre>
        </div>
      )}
    </main>
  );
}

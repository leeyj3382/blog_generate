"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { getIdToken } from "@/lib/authClient";

export default function GeneratePage() {
  const router = useRouter();
  const [platform, setPlatform] = useState("blog");
  const [purpose, setPurpose] = useState("review");
  const [topic, setTopic] = useState("");
  const [keywords, setKeywords] = useState("");
  const [length, setLength] = useState("long");
  const [references, setReferences] = useState("");
  const [referenceUrls, setReferenceUrls] = useState("");
  const [useReferenceStyle, setUseReferenceStyle] = useState(true);
  const [extraPrompt, setExtraPrompt] = useState("");
  const [mustInclude, setMustInclude] = useState("");
  const [bannedWords, setBannedWords] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const token = await getIdToken();
      const payload = {
        platform,
        purpose,
        topic,
        keywords: keywords.split(",").map((k) => k.trim()).filter(Boolean),
        length,
        references: references
          .split("\n\n")
          .map((r) => r.trim())
          .filter(Boolean),
        referenceUrls: referenceUrls
          .split("\n")
          .map((r) => r.trim())
          .filter(Boolean),
        useReferenceStyle,
        extraPrompt: extraPrompt || undefined,
        mustInclude: mustInclude
          .split(",")
          .map((m) => m.trim())
          .filter(Boolean),
        bannedWords: bannedWords
          .split(",")
          .map((b) => b.trim())
          .filter(Boolean),
      };

      const res = await fetch("/api/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "생성 실패");
      }

      const data = await res.json();
      router.push(`/result/${data.generationId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "오류가 발생했습니다");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="p-8 max-w-3xl mx-auto space-y-6">
      <h1 className="text-xl font-semibold">생성기</h1>
      <form className="space-y-4" onSubmit={onSubmit}>
        <div className="grid grid-cols-3 gap-3">
          <select className="border p-2 rounded" value={platform} onChange={(e) => setPlatform(e.target.value)}>
            <option value="blog">blog</option>
            <option value="sns">sns</option>
            <option value="store">store</option>
          </select>
          <select className="border p-2 rounded" value={purpose} onChange={(e) => setPurpose(e.target.value)}>
            <option value="promo">promo</option>
            <option value="review">review</option>
            <option value="ad">ad</option>
            <option value="info">info</option>
            <option value="etc">etc</option>
          </select>
          <select className="border p-2 rounded" value={length} onChange={(e) => setLength(e.target.value)}>
            <option value="normal">normal</option>
            <option value="long">long</option>
            <option value="xlong">xlong</option>
          </select>
        </div>
        <input
          className="w-full border p-2 rounded"
          placeholder="주제 (예: OO 비타민 2주 사용 후기)"
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          maxLength={120}
          required
        />
        <input
          className="w-full border p-2 rounded"
          placeholder="키워드 3~10개 (쉼표로 구분)"
          value={keywords}
          onChange={(e) => setKeywords(e.target.value)}
          required
        />
        <textarea
          className="w-full border p-2 rounded min-h-[120px]"
          placeholder="레퍼런스 본문 (여러 개면 빈 줄로 구분)"
          value={references}
          onChange={(e) => setReferences(e.target.value)}
        />
        <textarea
          className="w-full border p-2 rounded min-h-[80px]"
          placeholder="레퍼런스 URL (한 줄에 하나씩)"
          value={referenceUrls}
          onChange={(e) => setReferenceUrls(e.target.value)}
        />
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={useReferenceStyle}
            onChange={(e) => setUseReferenceStyle(e.target.checked)}
          />
          레퍼런스 스타일 반영
        </label>
        <textarea
          className="w-full border p-2 rounded min-h-[80px]"
          placeholder="추가 프롬프트"
          value={extraPrompt}
          onChange={(e) => setExtraPrompt(e.target.value)}
          maxLength={600}
        />
        <input
          className="w-full border p-2 rounded"
          placeholder="필수 포함 문구 (쉼표로 구분)"
          value={mustInclude}
          onChange={(e) => setMustInclude(e.target.value)}
        />
        <input
          className="w-full border p-2 rounded"
          placeholder="금칙어 (쉼표로 구분)"
          value={bannedWords}
          onChange={(e) => setBannedWords(e.target.value)}
        />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button className="bg-black text-white px-4 py-2 rounded" type="submit" disabled={loading}>
          {loading ? "생성 중..." : "생성하기"}
        </button>
      </form>
    </main>
  );
}

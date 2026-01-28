"use client";

import { useEffect, useState } from "react";
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
  const [progress, setProgress] = useState(0);
  const [phase, setPhase] = useState("초안 준비 중");

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setProgress(10);
    setPhase("스타일 분석 중");

    try {
      const token = await getIdToken();
      if (!token) {
        router.push("/login");
        return;
      }
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
        const detail = data?.stage
          ? `${data.error ?? "생성 실패"} (stage: ${data.stage})`
          : data.error ?? "생성 실패";
        throw new Error(detail);
      }

      const data = await res.json();
      setProgress(100);
      router.push(`/result/${data.generationId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "오류가 발생했습니다");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!loading) return;
    let value = 10;
    const timer = setInterval(() => {
      value = value < 50 ? value + 6 : value < 85 ? value + 2 : value + 0.4;
      if (value >= 95) value = 95;
      setProgress(Math.round(value));
      if (value < 35) {
        setPhase("스타일 분석 중");
      } else if (value < 70) {
        setPhase("초안 생성 중");
      } else {
        setPhase("검수 리라이트 중");
      }
    }, 600);
    return () => clearInterval(timer);
  }, [loading]);

  return (
    <main className="p-8 max-w-3xl mx-auto space-y-6">
      <h1 className="text-xl font-semibold">생성기</h1>
      <form className="space-y-4 glass p-6 rounded-2xl" onSubmit={onSubmit}>
        <div className="grid grid-cols-3 gap-3">
          <select
            className="border bg-transparent p-2 rounded"
            value={platform}
            onChange={(e) => setPlatform(e.target.value)}
          >
            <option value="blog">blog</option>
            <option value="sns">sns</option>
            <option value="store">store</option>
          </select>
          <select
            className="border bg-transparent p-2 rounded"
            value={purpose}
            onChange={(e) => setPurpose(e.target.value)}
          >
            <option value="promo">promo</option>
            <option value="review">review</option>
            <option value="ad">ad</option>
            <option value="info">info</option>
            <option value="etc">etc</option>
          </select>
          <select
            className="border bg-transparent p-2 rounded"
            value={length}
            onChange={(e) => setLength(e.target.value)}
          >
            <option value="normal">normal</option>
            <option value="long">long</option>
            <option value="xlong">xlong</option>
          </select>
        </div>
        <input
          className="w-full border bg-transparent p-2 rounded"
          placeholder="주제 (예: OO 비타민 2주 사용 후기)"
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          maxLength={120}
          required
        />
        <input
          className="w-full border bg-transparent p-2 rounded"
          placeholder="키워드 3~10개 (쉼표로 구분)"
          value={keywords}
          onChange={(e) => setKeywords(e.target.value)}
          required
        />
        <textarea
          className="w-full border bg-transparent p-2 rounded min-h-[120px]"
          placeholder="레퍼런스 본문 (여러 개면 빈 줄로 구분)"
          value={references}
          onChange={(e) => setReferences(e.target.value)}
        />
        <textarea
          className="w-full border bg-transparent p-2 rounded min-h-[80px]"
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
          className="w-full border bg-transparent p-2 rounded min-h-[80px]"
          placeholder="추가 프롬프트"
          value={extraPrompt}
          onChange={(e) => setExtraPrompt(e.target.value)}
          maxLength={600}
        />
        <input
          className="w-full border bg-transparent p-2 rounded"
          placeholder="필수 포함 문구 (쉼표로 구분)"
          value={mustInclude}
          onChange={(e) => setMustInclude(e.target.value)}
        />
        <input
          className="w-full border bg-transparent p-2 rounded"
          placeholder="금칙어 (쉼표로 구분)"
          value={bannedWords}
          onChange={(e) => setBannedWords(e.target.value)}
        />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button className="btn-primary" type="submit" disabled={loading}>
          {loading ? "생성 중..." : "생성하기"}
        </button>
      </form>
      {loading && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="glass rounded-2xl p-6 w-[320px] text-center space-y-4">
            <div className="w-12 h-12 mx-auto border-2 border-[color:var(--accent)] border-t-transparent rounded-full spin" />
            <p className="text-sm blink">{phase}</p>
            <div className="h-2 bg-[color:var(--surface-2)] rounded-full overflow-hidden">
              <div
                className="h-2 bg-[color:var(--accent)] transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-xs text-[color:var(--text-muted)]">{progress}%</p>
          </div>
        </div>
      )}
    </main>
  );
}

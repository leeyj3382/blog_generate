"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getIdToken } from "@/lib/authClient";

// 섹션 구분을 위한 컴포넌트
const Section = ({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) => (
  <div className="space-y-4 pb-6 border-b border-[color:var(--border)] last:border-0 last:pb-0">
    <div className="space-y-1">
      <h3 className="text-lg font-semibold text-[color:var(--foreground)]">
        {title}
      </h3>
      {description && (
        <p className="text-sm text-[color:var(--text-muted)]">{description}</p>
      )}
    </div>
    <div className="grid gap-5">{children}</div>
  </div>
);

export default function GeneratePage() {
  const router = useRouter();
  // ... (기존 state 변수들은 그대로 유지)
  const [platform, setPlatform] = useState("blog");
  const [purpose, setPurpose] = useState("review");
  const [topic, setTopic] = useState("");
  const [keywords, setKeywords] = useState("");
  const [length, setLength] = useState("long");
  const [requiredPhrases, setRequiredPhrases] = useState("");
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
    // ... (기존 로직 동일)
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
        keywords: keywords
          .split(",")
          .map((k) => k.trim())
          .filter(Boolean),
        length,
        referenceUrls: referenceUrls
          .split("\n")
          .map((r) => r.trim())
          .filter(Boolean),
        useReferenceStyle,
        extraPrompt: extraPrompt || undefined,
        requiredContent: requiredPhrases
          .split("\n")
          .map((m) => m.trim())
          .filter(Boolean),
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
        throw new Error("생성 실패");
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
    // ... (기존 로직 동일)
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
    <main className="min-h-screen bg-[color:var(--bg-soft)] py-12 px-4">
      <div className="max-w-4xl mx-auto space-y-8">
        <header className="space-y-2 mb-8">
          <h1 className="text-3xl font-bold tracking-tight">
            새로운 글 생성하기
          </h1>
          <p className="text-[color:var(--text-muted)]">
            AI가 당신의 브랜드 톤을 학습하여 완벽한 초안을 작성합니다.
          </p>
        </header>

        <form
          className="bg-[color:var(--surface)] border border-[color:var(--border)] rounded-3xl p-8 shadow-sm space-y-8"
          onSubmit={onSubmit}
        >
          <Section
            title="기본 설정"
            description="글의 목적과 형식을 선택해주세요."
          >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase text-[color:var(--text-muted)]">
                  플랫폼
                </label>
                <select
                  className="w-full bg-[color:var(--bg)] border border-[color:var(--border)] p-3 rounded-xl focus:ring-2 focus:ring-[color:var(--accent)] outline-none transition-all"
                  value={platform}
                  onChange={(e) => setPlatform(e.target.value)}
                >
                  <option value="blog">블로그</option>
                  <option value="sns">SNS (인스타그램/페이스북)</option>
                  <option value="store">상세페이지 (스토어)</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase text-[color:var(--text-muted)]">
                  목적
                </label>
                <select
                  className="w-full bg-[color:var(--bg)] border border-[color:var(--border)] p-3 rounded-xl focus:ring-2 focus:ring-[color:var(--accent)] outline-none transition-all"
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value)}
                >
                  <option value="review">후기/리뷰</option>
                  <option value="promo">홍보/프로모션</option>
                  <option value="info">정보성 컨텐츠</option>
                  <option value="ad">광고</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase text-[color:var(--text-muted)]">
                  길이
                </label>
                <select
                  className="w-full bg-[color:var(--bg)] border border-[color:var(--border)] p-3 rounded-xl focus:ring-2 focus:ring-[color:var(--accent)] outline-none transition-all"
                  value={length}
                  onChange={(e) => setLength(e.target.value)}
                >
                  <option value="normal">짧게</option>
                  <option value="long">보통</option>
                  <option value="xlong">길게</option>
                </select>
              </div>
            </div>
          </Section>

          <Section
            title="핵심 내용"
            description="어떤 내용의 글을 쓰고 싶으신가요?"
          >
            <div className="space-y-2">
              <label className="text-sm font-medium">주제</label>
              <input
                className="w-full bg-[color:var(--bg)] border border-[color:var(--border)] p-4 rounded-xl focus:ring-2 focus:ring-[color:var(--accent)] outline-none transition-all placeholder:text-[color:var(--text-muted)]/50"
                placeholder="예: 30대 직장인을 위한 주말 힐링 여행지 추천"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                maxLength={120}
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">핵심 키워드</label>
              <input
                className="w-full bg-[color:var(--bg)] border border-[color:var(--border)] p-4 rounded-xl focus:ring-2 focus:ring-[color:var(--accent)] outline-none transition-all placeholder:text-[color:var(--text-muted)]/50"
                placeholder="쉼표로 구분 (예: 여행, 힐링, 가성비) 3개 이상"
                value={keywords}
                onChange={(e) => setKeywords(e.target.value)}
                required
              />
            </div>
          </Section>

          <Section
            title="레퍼런스 & 필수 포함 내용"
            description="링크는 문체 분석에만 사용하고, 텍스트 입력은 말투에 맞게 풀어 써서 포함합니다."
          >
            <div className="grid md:grid-cols-2 gap-4">
              <textarea
                className="w-full bg-[color:var(--bg)] border border-[color:var(--border)] p-4 rounded-xl focus:ring-2 focus:ring-[color:var(--accent)] outline-none transition-all min-h-[150px] resize-none"
                placeholder="반드시 포함해야 하는 내용 (한 줄에 하나씩)"
                value={requiredPhrases}
                onChange={(e) => setRequiredPhrases(e.target.value)}
              />
              <textarea
                className="w-full bg-[color:var(--bg)] border border-[color:var(--border)] p-4 rounded-xl focus:ring-2 focus:ring-[color:var(--accent)] outline-none transition-all min-h-[150px] resize-none"
                placeholder="또는 레퍼런스 URL을 입력하세요 (줄바꿈으로 구분)"
                value={referenceUrls}
                onChange={(e) => setReferenceUrls(e.target.value)}
              />
            </div>
            <label className="flex items-center gap-2 p-2 cursor-pointer w-fit">
              <div
                className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${useReferenceStyle ? "bg-[color:var(--accent)] border-[color:var(--accent)]" : "border-[color:var(--text-muted)]"}`}
              >
                {useReferenceStyle && (
                  <span className="text-white text-xs">✓</span>
                )}
              </div>
              <input
                type="checkbox"
                className="hidden"
                checked={useReferenceStyle}
                onChange={(e) => setUseReferenceStyle(e.target.checked)}
              />
              <span className="text-base">
                레퍼런스의 문체(Tone & Manner)를 반영합니다.
              </span>
            </label>
          </Section>

          <Section
            title="상세 조정"
            description="필수 포함 문구나 금칙어 등 세부 제약사항을 설정합니다. (선택)"
          >
            <textarea
              className="w-full bg-[color:var(--bg)] border border-[color:var(--border)] p-4 rounded-xl focus:ring-2 focus:ring-[color:var(--accent)] outline-none transition-all min-h-[100px]"
              placeholder="AI에게 전달할 추가 요청사항 (예: 너무 딱딱하지 않게, 사람이 쓴것처럼)"
              value={extraPrompt}
              onChange={(e) => setExtraPrompt(e.target.value)}
              maxLength={600}
            />
            <div className="grid md:grid-cols-2 gap-4">
              <input
                className="w-full bg-[color:var(--bg)] border border-[color:var(--border)] p-3 rounded-xl text-sm"
                placeholder="고정 문구(법적/브랜드) (쉼표로 구분, 그대로 포함)"
                value={mustInclude}
                onChange={(e) => setMustInclude(e.target.value)}
              />
              <input
                className="w-full bg-[color:var(--bg)] border border-[color:var(--border)] p-3 rounded-xl text-sm"
                placeholder="금칙어 (쉼표로 구분)"
                value={bannedWords}
                onChange={(e) => setBannedWords(e.target.value)}
              />
            </div>
          </Section>

          {error && (
            <div className="p-4 bg-red-50 text-red-600 rounded-xl text-sm border border-red-100">
              {error}
            </div>
          )}

          <div className="pt-4">
            <button
              className="w-full btn-primary py-4 text-lg font-semibold rounded-xl shadow-lg shadow-[color:var(--accent)]/20 hover:shadow-[color:var(--accent)]/30 transition-all active:scale-[0.99]"
              type="submit"
              disabled={loading}
            >
              {loading
                ? "AI가 글을 작성하고 있습니다..."
                : "✨ 블로그 글 생성하기"}
            </button>
          </div>
        </form>
      </div>

      {/* 로딩 오버레이 (기존 디자인 유지하되 스타일 조금 다듬음) */}
      {loading && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100]">
          <div className="bg-[color:var(--surface)] border border-[color:var(--border)] rounded-3xl p-8 w-[360px] text-center space-y-6 shadow-2xl">
            <div className="relative w-16 h-16 mx-auto">
              <div className="absolute inset-0 border-4 border-[color:var(--surface-2)] rounded-full"></div>
              <div className="absolute inset-0 border-4 border-[color:var(--accent)] border-t-transparent rounded-full animate-spin"></div>
            </div>
            <div className="space-y-2">
              <p className="text-lg font-semibold animate-pulse">{phase}</p>
              <p className="text-sm text-[color:var(--text-muted)]">
                잠시만 기다려주세요.
              </p>
            </div>
            <div className="h-2 bg-[color:var(--surface-2)] rounded-full overflow-hidden">
              <div
                className="h-2 bg-[color:var(--accent)] transition-all duration-300 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-xs text-[color:var(--text-muted)] font-mono">
              {progress}%
            </p>
          </div>
        </div>
      )}
    </main>
  );
}

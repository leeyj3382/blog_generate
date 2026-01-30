"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export default function HomePage() {
  // 스크롤 옵저버 로직 (기존 유지)
  useEffect(() => {
    const nodes = Array.from(document.querySelectorAll(".reveal"));
    const parallaxNodes = Array.from(
      document.querySelectorAll<HTMLElement>("[data-parallax]"),
    );
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.2 },
    );
    nodes.forEach((node) => observer.observe(node));
    const onScroll = () => {
      const scrollY = window.scrollY;
      parallaxNodes.forEach((node) => {
        const depth = Number(node.dataset.parallax ?? 0.1);
        node.style.setProperty("--parallax-offset", `${scrollY * depth}px`);
      });
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  // --- [NEW] 텍스트 애니메이션 로직 ---

  // 마케팅/블로그 관련 긴 더미 텍스트
  const dummyText = `디지털 세상에서 브랜드의 언어는 곧 그 브랜드의 인격입니다. 단순히 정보를 전달하는 것을 넘어, 고객의 마음 깊은 곳에 닿을 수 있는 공명(Resonance)을 만들어내야 합니다. 우리의 AI 엔진은 수만 개의 성공적인 캠페인을 분석하여, 당신의 브랜드에 가장 적합한 톤앤매너를 찾아냅니다. 키워드 사이의 미묘한 뉘앙스까지 포착해 마치 오랜 경험을 가진 에디터가 작성한 듯한 유려한 흐름을 완성하고, 클릭을 유도하는 매력적인 헤드라인부터 신뢰를 쌓아가는 본문, 그리고 자연스러운 행동 유도까지 하나의 전략으로 설계합니다. 이제 고민하지 말고 데이터가 증명하는 최적의 스토리텔링을 경험해보세요. 당신의 이야기는 더 널리, 더 깊게 퍼져나갈 준비가 되어 있으며, 브랜드의 가치는 언어를 통해 가장 선명하게 기억됩니다.`;

  const words = dummyText.split(" ");
  const [animationKey, setAnimationKey] = useState(0);

  // 14초마다 애니메이션 리셋 (생성 -> 대기 -> 페이드아웃 -> 리셋)
  useEffect(() => {
    const interval = setInterval(() => {
      setAnimationKey((prev) => prev + 1);
    }, 14000); // CSS animation duration과 싱크
    return () => clearInterval(interval);
  }, []);

  return (
    <main className="min-h-screen">
      <section className="relative max-w-6xl mx-auto px-6 pt-20 pb-16 grid gap-12 lg:grid-cols-[1.15fr_0.85fr] items-center overflow-hidden rounded-[32px] border border-[color:var(--border)] mt-8">
        <div className="absolute inset-0 bg-[color:var(--bg-soft)]/90" />
        <div className="hero-grid" />

        {/* 텍스트 생성 애니메이션 영역 */}
        <div className="hero-typing parallax" data-parallax="0.08">
          <div className="absolute inset-0 p-8 md:p-12 overflow-hidden flex items-start">
            {/* key가 바뀔 때마다 DOM이 재생성되어 애니메이션이 처음부터 시작됨 */}
            <div
              key={animationKey}
              className="flex flex-wrap content-start gap-x-1.5 gap-y-1 fade-loop opacity-100"
            >
              {words.map((word, i) => (
                <span
                  key={i}
                  className="word-animation text-base md:text-lg text-[color:var(--text-mutedd)] opacity-60 font-medium tracking-wide"
                  style={{
                    // 단어마다 0.12초씩 지연되어 순차적으로 등장
                    animationDelay: `${i * 0.12}s`,
                  }}
                >
                  {word}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* 메인 텍스트 (기존 유지) */}
        <div className="space-y-6 relative z-10">
          <p className="text-lg font-bold uppercase tracking-[0.3em] text-[color:var(--accent)]">
            AI Content Atelier
          </p>
          <h1 className="text-4xl md:text-5xl font-semibold leading-tight">
            브랜드 톤을 그대로 살리는
            <br />
            프리미엄 블로그 생성기
          </h1>
          <p className="text-base text-[color:var(--text)] leading-relaxed max-w-xl">
            레퍼런스를 읽고 스타일 프로필을 추출한 뒤, 초안 생성과 검수
            리라이트까지 자동으로 연결합니다. 실전 마케팅 문장을 바로 가져다 쓸
            수 있어요.
          </p>
          <div className="flex flex-wrap gap-4">
            <Link href="/generate" className="btn-primary">
              블로그 글 생성
            </Link>
            <Link href="/pricing" className="btn-outline">
              요금 안내
            </Link>
          </div>
        </div>

        {/* 오른쪽 카드 UI (기존 유지) */}
        <div className="glass rounded-3xl p-6 space-y-5 relative z-10">
          <div className="rounded-2xl bg-[color:var(--surface)] p-5 space-y-3 border border-[color:var(--border)]">
            <p className="text-xs text-[color:var(--text-muted)]">
              Style Profile
            </p>
            <p className="text-sm leading-relaxed">
              톤: warm &amp; polished · 문장 길이: mixed · 이모지: low
            </p>
            <div className="h-2 bg-[color:var(--surface-2)] rounded-full">
              <div className="h-2 w-2/3 bg-[color:var(--accent)] rounded-full" />
            </div>
          </div>
          <div className="rounded-2xl bg-[color:var(--surface)] p-5 space-y-3 border border-[color:var(--border)]">
            <p className="text-xs text-[color:var(--text-muted)]">
              Draft Output
            </p>
            <p className="text-sm leading-relaxed">
              “광고 티 없이 경험담 중심으로, 제품 특징을 자연스럽게
              녹여냈습니다.”
            </p>
            <div className="flex gap-2 text-xs text-[color:var(--text-muted)]">
              <span>#브랜드톤</span>
              <span>#리라이트</span>
              <span>#SEO</span>
            </div>
          </div>
        </div>
      </section>

      {/* 이하 섹션들 (기존 유지) */}
      <section className="max-w-6xl mx-auto px-6 py-16 grid gap-8 md:grid-cols-3">
        {[
          {
            title: "Style Profile",
            desc: "레퍼런스 기반 문체 분석으로 브랜드 톤 유지.",
          },
          {
            title: "Draft Engine",
            desc: "키워드/목적/길이에 맞춘 구조화된 초안.",
          },
          {
            title: "Final Rewrite",
            desc: "과장 제거, 문장 다듬기, 규정 준수.",
          },
        ].map((item) => (
          <div
            key={item.title}
            className="reveal glass rounded-2xl p-6 space-y-3 parallax"
            data-parallax="0.06"
          >
            <h3 className="text-lg font-semibold">{item.title}</h3>
            <p className="text-sm text-[color:var(--text-muted)]">
              {item.desc}
            </p>
          </div>
        ))}
      </section>

      <div className="section-divider" />

      <section className="max-w-6xl mx-auto px-6 py-16 space-y-10">
        <div className="reveal">
          <h2 className="text-2xl font-semibold">
            한 번의 입력, 완성되는 컨텐츠
          </h2>
          <p className="text-sm text-[color:var(--text-muted)] mt-2">
            플랫폼과 목적만 정하면 맞춤 글을 즉시 생성합니다.
          </p>
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          {[
            {
              label: "01",
              title: "레퍼런스 분석",
              desc: "URL/텍스트를 읽고 스타일 프로필을 만듭니다.",
            },
            {
              label: "02",
              title: "초안 생성",
              desc: "키워드와 목적에 맞는 구조화된 문장을 생성합니다.",
            },
            {
              label: "03",
              title: "검수 리라이트",
              desc: "반복/과장 제거, 필수 문구 삽입.",
            },
            {
              label: "04",
              title: "결과 저장",
              desc: "마이페이지에서 언제든 확인/재사용.",
            },
          ].map((step) => (
            <div
              key={step.label}
              className="reveal glass rounded-2xl p-6 flex gap-5 parallax"
              data-parallax="0.04"
            >
              <div className="text-[color:var(--accent)] text-xl font-semibold">
                {step.label}
              </div>
              <div>
                <h3 className="text-lg font-semibold">{step.title}</h3>
                <p className="text-sm text-[color:var(--text-muted)] mt-2">
                  {step.desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-6 pb-20">
        <div
          className="reveal glass rounded-3xl p-8 md:p-12 flex flex-col md:flex-row items-center justify-between gap-6 parallax"
          data-parallax="0.02"
        >
          <div>
            <h2 className="text-2xl font-semibold">
              지금 바로 글을 만들어보세요
            </h2>
            <p className="text-sm text-[color:var(--text-muted)] mt-2">
              무료 1회 제공 · 필요한 만큼만 크레딧 사용
            </p>
          </div>
          <Link href="/generate" className="btn-primary">
            블로그 글 생성
          </Link>
        </div>
      </section>
    </main>
  );
}

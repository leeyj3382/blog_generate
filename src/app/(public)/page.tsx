import Link from "next/link";

export default function HomePage() {
  return (
    <main className="p-8 max-w-3xl mx-auto space-y-6">
      <h1 className="text-2xl font-semibold">AI 블로그 생성기</h1>
      <p className="text-sm text-gray-600">
        입력만으로 스타일 분석 → 초안 생성 → 검수 리라이트까지 자동화합니다.
      </p>
      <div className="flex gap-3">
        <Link href="/signup" className="px-4 py-2 bg-black text-white rounded">
          무료 1회 시작하기
        </Link>
        <Link href="/generate" className="px-4 py-2 border rounded">
          블로그 글 생성
        </Link>
      </div>
    </main>
  );
}

import { AdUnit } from "@/lib/adsense";

export default function GuideDetailPage({ params }: { params: { slug: string } }) {
  return (
    <main className="p-8 max-w-3xl mx-auto space-y-6">
      <h1 className="text-xl font-semibold">가이드: {params.slug}</h1>
      <p className="text-sm text-gray-600">이 영역에 SEO 콘텐츠를 채워 넣으세요.</p>
      <AdUnit slot="1234567890" />
    </main>
  );
}

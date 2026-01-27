import { AdUnit } from "@/lib/adsense";

export default function TemplatesPage() {
  return (
    <main className="p-8 max-w-3xl mx-auto space-y-6">
      <h1 className="text-xl font-semibold">템플릿 라이브러리</h1>
      <p className="text-sm text-gray-600">플랫폼별 템플릿을 확장할 수 있습니다.</p>
      <AdUnit slot="1234567890" />
    </main>
  );
}

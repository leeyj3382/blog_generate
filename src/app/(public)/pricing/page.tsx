import { AdUnit } from "@/lib/adsense";

export default function PricingPage() {
  return (
    <main className="p-8 max-w-3xl mx-auto space-y-6">
      <h1 className="text-xl font-semibold">요금 안내</h1>
      <p className="text-sm text-gray-600">무료 1회 제공. 결제는 Phase2로 준비 중입니다.</p>
      <AdUnit slot="1234567890" />
    </main>
  );
}

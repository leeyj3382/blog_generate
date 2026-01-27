export default function BillingPage() {
  return (
    <main className="p-8 max-w-3xl mx-auto space-y-6">
      <h1 className="text-xl font-semibold">결제</h1>
      <p className="text-sm text-gray-600">Phase2에서 결제 연동을 진행합니다.</p>
      <button className="px-4 py-2 border rounded" disabled>
        결제하기 (준비중)
      </button>
    </main>
  );
}

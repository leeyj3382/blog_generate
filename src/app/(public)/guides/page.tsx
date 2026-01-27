import Link from "next/link";
import { AdUnit } from "@/lib/adsense";

const guides = [
  { slug: "start", title: "블로그 글 쉽게 시작하기" },
  { slug: "seo", title: "SEO 키워드 배치 팁" },
];

export default function GuidesPage() {
  return (
    <main className="p-8 max-w-3xl mx-auto space-y-6">
      <h1 className="text-xl font-semibold">가이드</h1>
      <ul className="list-disc list-inside space-y-1 text-sm">
        {guides.map((guide) => (
          <li key={guide.slug}>
            <Link href={`/guides/${guide.slug}`}>{guide.title}</Link>
          </li>
        ))}
      </ul>
      <AdUnit slot="1234567890" />
    </main>
  );
}

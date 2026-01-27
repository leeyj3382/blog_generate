import { AdSenseScript } from "@/lib/adsense";

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <AdSenseScript />
      {children}
    </div>
  );
}

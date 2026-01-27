import Script from "next/script";

export function AdSenseScript() {
  const client = process.env.NEXT_PUBLIC_ADSENSE_CLIENT;
  if (!client) return null;
  return (
    <Script
      async
      strategy="afterInteractive"
      src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${client}`}
      crossOrigin="anonymous"
    />
  );
}

export function AdUnit(props: { slot: string; className?: string }) {
  const client = process.env.NEXT_PUBLIC_ADSENSE_CLIENT;
  if (!client) return null;
  return (
    <ins
      className={`adsbygoogle ${props.className ?? ""}`.trim()}
      style={{ display: "block" }}
      data-ad-client={client}
      data-ad-slot={props.slot}
      data-ad-format="auto"
      data-full-width-responsive="true"
    />
  );
}

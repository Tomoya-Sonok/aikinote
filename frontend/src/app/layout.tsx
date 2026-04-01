import type { Metadata, Viewport } from "next";
import { ServiceWorkerRegister } from "@/components/shared/ServiceWorkerRegister/ServiceWorkerRegister";
import "../styles/globals.css";

export const viewport: Viewport = {
  viewportFit: "cover",
};

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL || "https://www.aikinote.com",
  ),
  title: {
    default: "AikiNote",
    template: "%s | AikiNote",
  },
  description: "合気道の稽古記録アプリ",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon.svg", type: "image/svg+xml" },
    ],
    apple: "/apple-touch-icon.png",
  },
  openGraph: {
    type: "website",
    locale: "ja_JP",
    url: "/",
    siteName: "AikiNote",
    title: "AikiNote | 合気道の稽古記録・交流アプリ",
    description: "合気道の稽古を記録・振り返り・共有。流派を超えた交流機能も。",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "AikiNote - 合気道の稽古記録・交流アプリ",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "AikiNote | 合気道の稽古記録・交流アプリ",
    description: "合気道の稽古を記録・振り返り・共有。流派を超えた交流機能も。",
    images: ["/og-image.png"],
  },
  alternates: {
    canonical: "/",
    languages: {
      ja: "/",
      en: "/en",
      "x-default": "/",
    },
  },
  manifest: "/manifest.json",
  themeColor: "#2C2C2C",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "AikiNote",
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "AikiNote",
  description: "合気道の稽古を記録・振り返り・共有できるデジタル日誌アプリ",
  operatingSystem: "iOS, Android, Web",
  applicationCategory: "SportsApplication",
  url: "https://www.aikinote.com",
  inLanguage: ["ja", "en"],
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "JPY",
  },
  author: {
    "@type": "Person",
    name: "Sonokui Tomoya",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;700&family=Noto+Sans+JP:wght@400;500;700&family=Zen+Old+Mincho:wght@400;700&display=swap"
          rel="stylesheet"
        />
        <script
          defer
          src="https://cloud.umami.is/script.js"
          data-website-id="344d247e-0025-4d95-ba54-50e31ea42f22"
          data-domains="www.aikinote.com,aikinote.com"
        ></script>
      </head>
      <body suppressHydrationWarning>
        <script
          type="application/ld+json"
          // biome-ignore lint/security/noDangerouslySetInnerHtml: JSON-LD は静的データのみで構成されるため安全
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <ServiceWorkerRegister />
        {children}
      </body>
    </html>
  );
}

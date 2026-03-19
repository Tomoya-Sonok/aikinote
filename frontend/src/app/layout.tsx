import type { Metadata } from "next";
import "../styles/globals.css";

export const metadata: Metadata = {
  title: "AikiNote",
  description: "合気道の稽古記録アプリ",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja" suppressHydrationWarning>
      <head>
        <script
          defer
          src="https://cloud.umami.is/script.js"
          data-website-id="344d247e-0025-4d95-ba54-50e31ea42f22"
        ></script>
      </head>
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}

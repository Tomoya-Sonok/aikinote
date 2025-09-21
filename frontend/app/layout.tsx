import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AikiNote",
  description: "合気道の練習記録アプリケーション",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}

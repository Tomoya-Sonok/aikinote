import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { Metadata } from "next";
import { LegalPage } from "@/components/shared/LegalPage/LegalPage";

interface TokushohoPageProps {
  params: Promise<{ locale: string }>;
}

export const metadata: Metadata = {
  title: "特定商取引法に基づく表記",
  description: "AikiNoteの特定商取引法に基づく表記をご確認いただけます。",
};

export default async function TokushohoPage({ params }: TokushohoPageProps) {
  const { locale } = await params;
  const resolvedLocale = locale === "en" ? "en" : "ja";

  const filePath = join(
    process.cwd(),
    "src",
    "content",
    resolvedLocale,
    "tokushoho.md",
  );
  const content = readFileSync(filePath, "utf-8");

  // Markdownの最初の h1 タイトル行を除去（LegalPage コンポーネントで別途表示するため）
  const bodyContent = content.replace(/^#\s+.+\n+/, "");

  const title =
    resolvedLocale === "ja"
      ? "特定商取引法に基づく表記"
      : "Specified Commercial Transactions Act";

  return <LegalPage title={title} content={bodyContent} />;
}

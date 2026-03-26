import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { Metadata } from "next";
import { LegalPage } from "@/components/shared/LegalPage/LegalPage";

interface TermsPageProps {
  params: Promise<{ locale: string }>;
}

export const metadata: Metadata = {
  title: "利用規約",
  description: "AikiNoteの利用規約をご確認いただけます。",
};

export default async function TermsPage({ params }: TermsPageProps) {
  const { locale } = await params;
  const resolvedLocale = locale === "en" ? "en" : "ja";

  const filePath = join(
    process.cwd(),
    "src",
    "content",
    resolvedLocale,
    "terms.md",
  );
  const content = readFileSync(filePath, "utf-8");

  // Markdownの最初の h1 タイトル行を除去（LegalPage コンポーネントで別途表示するため）
  const bodyContent = content.replace(/^#\s+.+\n+/, "");

  const title = resolvedLocale === "ja" ? "利用規約" : "Terms of Service";

  return <LegalPage title={title} content={bodyContent} />;
}

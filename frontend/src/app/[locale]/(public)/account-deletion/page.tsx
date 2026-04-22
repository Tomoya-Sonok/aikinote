import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { Metadata } from "next";
import { LegalPage } from "@/components/shared/LegalPage/LegalPage";

interface AccountDeletionPageProps {
  params: Promise<{ locale: string }>;
}

export const metadata: Metadata = {
  title: "アカウント削除リクエスト",
  description:
    "AikiNote のアカウントおよび関連データの削除をリクエストする手順をご案内します。",
};

export default async function AccountDeletionPage({
  params,
}: AccountDeletionPageProps) {
  const { locale } = await params;
  const resolvedLocale = locale === "en" ? "en" : "ja";

  const filePath = join(
    process.cwd(),
    "src",
    "content",
    resolvedLocale,
    "account-deletion.md",
  );
  const content = readFileSync(filePath, "utf-8");

  // Markdownの最初の h1 タイトル行を除去（LegalPage コンポーネントで別途表示するため）
  const bodyContent = content.replace(/^#\s+.+\n+/, "");

  const title =
    resolvedLocale === "ja"
      ? "アカウント削除リクエスト"
      : "Account Deletion Request";

  return <LegalPage title={title} content={bodyContent} />;
}

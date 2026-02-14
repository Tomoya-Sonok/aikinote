import { redirect } from "next/navigation";
import { DefaultLayout } from "@/components/shared/layouts/DefaultLayout";
import { buildMetadata } from "@/lib/metadata";
import { getCurrentUser } from "@/lib/server/auth";
import { PageDetailPage } from "./PageDetailPage";

export const metadata = buildMetadata({
  title: "稽古ページ詳細",
  description: "稽古ページの詳細を確認できます。",
});

export default async function Page({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const user = await getCurrentUser();

  if (!user) {
    redirect(`/${locale}/login`);
  }

  return (
    <DefaultLayout>
      <PageDetailPage />
    </DefaultLayout>
  );
}

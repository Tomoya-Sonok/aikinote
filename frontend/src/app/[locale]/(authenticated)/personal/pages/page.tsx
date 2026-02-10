import { redirect } from "next/navigation";
import { DefaultLayout } from "@/components/layouts/DefaultLayout";
import { buildMetadata } from "@/lib/metadata";
import { getCurrentUser } from "@/lib/server/auth";
import { PersonalPagesPage } from "./PersonalPagesPage";

export const metadata = buildMetadata({
  title: "稽古ページ一覧",
  description: "個人で作成した稽古ページを一覧で管理できます。",
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
    <DefaultLayout showTooltip={true}>
      <PersonalPagesPage />
    </DefaultLayout>
  );
}

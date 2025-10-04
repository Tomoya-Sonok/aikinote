import { redirect } from "next/navigation";
import { DefaultLayout } from "@/components/layouts/DefaultLayout";
import { buildMetadata } from "@/lib/metadata";
import { getCurrentUser } from "@/lib/server/auth";
import { PersonalPagesPageClient } from "./PersonalPagesPageClient";

export const metadata = buildMetadata({
  title: "稽古ページ一覧",
  description: "個人で作成した稽古ページを一覧で管理できます。",
});

export default async function PersonalPagesPage({
  params: { locale },
}: {
  params: { locale: string };
}) {
  const user = await getCurrentUser();

  if (!user) {
    redirect(`/${locale}/login`);
  }

  return (
    <DefaultLayout showTooltip={true}>
      <PersonalPagesPageClient />
    </DefaultLayout>
  );
}

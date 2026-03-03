import { DefaultLayout } from "@/components/shared/layouts/DefaultLayout";
import { buildMetadata } from "@/lib/metadata";
import { PersonalPagesPage } from "./PersonalPagesPage";

export const metadata = buildMetadata({
  title: "稽古ページ一覧",
  description: "個人で作成した稽古ページを一覧で管理できます。",
});

export default async function Page() {
  return (
    <DefaultLayout showTooltip={true}>
      <PersonalPagesPage />
    </DefaultLayout>
  );
}

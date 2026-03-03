import { DefaultLayout } from "@/components/shared/layouts/DefaultLayout";
import { buildMetadata } from "@/lib/metadata";
import { PageDetailPage } from "./PageDetailPage";

export const metadata = buildMetadata({
  title: "稽古ページ詳細",
  description: "稽古ページの詳細を確認できます。",
});

export default async function Page() {
  return (
    <DefaultLayout>
      <PageDetailPage />
    </DefaultLayout>
  );
}

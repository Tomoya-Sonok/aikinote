import { AuthGate } from "@/components/shared/auth";
import { buildMetadata } from "@/lib/metadata";
import { PageDetail } from "./PageDetail";

export const metadata = buildMetadata({
  title: "稽古ページ詳細",
  description: "稽古ページの詳細を確認できます。",
});

export default async function Page() {
  return (
    <AuthGate>
      <PageDetail />
    </AuthGate>
  );
}

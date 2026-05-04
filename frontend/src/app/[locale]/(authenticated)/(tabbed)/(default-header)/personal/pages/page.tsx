import { AuthGate } from "@/components/shared/auth";
import { buildMetadata } from "@/lib/metadata";
import { PersonalPages } from "./PersonalPages";

export const metadata = buildMetadata({
  title: "稽古ページ一覧",
  description: "個人で作成した稽古ページを一覧で管理できます。",
});

export default async function Page() {
  return (
    <AuthGate>
      <PersonalPages />
    </AuthGate>
  );
}

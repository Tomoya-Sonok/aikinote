import { AuthGate } from "@/components/shared/auth";
import { AccountDeletionSetting } from "./AccountDeletionSetting";

export default async function Page({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  return (
    <AuthGate>
      <AccountDeletionSetting locale={locale} />
    </AuthGate>
  );
}

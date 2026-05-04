import { AuthGate } from "@/components/shared/auth";
import { SubscriptionSetting } from "./SubscriptionSetting";

export default async function Page({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  return (
    <AuthGate redirectTo={`/${locale}/login`}>
      <SubscriptionSetting locale={locale} />
    </AuthGate>
  );
}

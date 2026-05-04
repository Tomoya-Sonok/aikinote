import { AuthGate } from "@/components/shared/auth";
import { PushNotificationSetting } from "./PushNotificationSetting";

interface Props {
  params: Promise<{ locale: string }>;
}

export default async function PushNotificationSettingPage({ params }: Props) {
  const { locale } = await params;
  return (
    <AuthGate redirectTo={`/${locale}/login`}>
      <PushNotificationSetting locale={locale} />
    </AuthGate>
  );
}

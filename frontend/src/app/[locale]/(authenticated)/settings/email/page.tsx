import { AuthGate } from "@/components/shared/auth";
import { EmailSetting } from "./EmailSetting";

export default async function Page({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  return (
    <AuthGate redirectTo={`/${locale}/login`}>
      <EmailSetting locale={locale} />
    </AuthGate>
  );
}

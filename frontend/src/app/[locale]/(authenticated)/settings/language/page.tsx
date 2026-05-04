import { AuthGate } from "@/components/shared/auth";
import { LanguageSetting } from "./LanguageSetting";

export default async function Page({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  return (
    <AuthGate redirectTo={`/${locale}/login`}>
      <LanguageSetting locale={locale} />
    </AuthGate>
  );
}

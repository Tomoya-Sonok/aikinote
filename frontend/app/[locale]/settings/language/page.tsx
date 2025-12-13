import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/server/auth";
import { LanguageSettingPageClient } from "./LanguageSettingPageClient";

export default async function LanguageSettingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const user = await getCurrentUser();

  if (!user) {
    redirect(`/${locale}/login`);
  }

  return <LanguageSettingPageClient locale={locale} />;
}

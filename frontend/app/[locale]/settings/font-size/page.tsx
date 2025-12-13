import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/server/auth";
import { FontSizeSettingPageClient } from "./FontSizeSettingPageClient";

export default async function FontSizeSettingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const user = await getCurrentUser();

  if (!user) {
    redirect(`/${locale}/login`);
  }

  return <FontSizeSettingPageClient locale={locale} />;
}

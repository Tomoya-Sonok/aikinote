import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/server/auth";
import { EmailSettingPageClient } from "./EmailSettingPageClient";

export default async function EmailSettingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const user = await getCurrentUser();

  if (!user) {
    redirect(`/${locale}/login`);
  }

  return <EmailSettingPageClient locale={locale} />;
}

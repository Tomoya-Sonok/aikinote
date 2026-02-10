import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/server/auth";
import { FontSizeSettingPage } from "./FontSizeSettingPage";

export default async function Page({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const user = await getCurrentUser();

  if (!user) {
    redirect(`/${locale}/login`);
  }

  return <FontSizeSettingPage locale={locale} />;
}

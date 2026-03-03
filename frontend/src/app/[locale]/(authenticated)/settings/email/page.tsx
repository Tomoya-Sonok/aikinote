import { EmailSettingPage } from "./EmailSettingPage";

export default async function Page({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  return <EmailSettingPage locale={locale} />;
}

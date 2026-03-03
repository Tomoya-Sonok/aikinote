import { LanguageSettingPage } from "./LanguageSettingPage";

export default async function Page({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  return <LanguageSettingPage locale={locale} />;
}

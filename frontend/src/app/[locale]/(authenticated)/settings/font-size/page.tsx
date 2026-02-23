import { FontSizeSettingPage } from "./FontSizeSettingPage";

export default async function Page({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  return <FontSizeSettingPage locale={locale} />;
}

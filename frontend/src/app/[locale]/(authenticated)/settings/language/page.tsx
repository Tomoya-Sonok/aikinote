import { LanguageSetting } from "./LanguageSetting";

export default async function Page({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  return <LanguageSetting locale={locale} />;
}

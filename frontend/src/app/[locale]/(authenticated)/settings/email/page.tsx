import { EmailSetting } from "./EmailSetting";

export default async function Page({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  return <EmailSetting locale={locale} />;
}

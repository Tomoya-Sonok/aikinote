import { PublicitySetting } from "./PublicitySetting";

export default async function Page({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  return <PublicitySetting locale={locale} />;
}

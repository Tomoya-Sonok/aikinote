import { TagManagement } from "./TagManagement";

export default async function Page({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  return <TagManagement locale={locale} />;
}

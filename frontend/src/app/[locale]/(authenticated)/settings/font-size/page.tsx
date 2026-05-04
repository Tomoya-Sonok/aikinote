import { AuthGate } from "@/components/shared/auth";
import { FontSizeSetting } from "./FontSizeSetting";

export default async function Page({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  return (
    <AuthGate redirectTo={`/${locale}/login`}>
      <FontSizeSetting locale={locale} />
    </AuthGate>
  );
}

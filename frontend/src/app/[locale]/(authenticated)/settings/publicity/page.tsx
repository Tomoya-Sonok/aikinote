import { AuthGate } from "@/components/shared/auth";
import { PublicitySetting } from "./PublicitySetting";

export default async function Page({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  return (
    <AuthGate>
      <PublicitySetting locale={locale} />
    </AuthGate>
  );
}

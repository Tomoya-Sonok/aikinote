import { AuthGate } from "@/components/shared/auth";
import { BlockedUsersSetting } from "./BlockedUsersSetting";

export default async function Page({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  return (
    <AuthGate>
      <BlockedUsersSetting locale={locale} />
    </AuthGate>
  );
}

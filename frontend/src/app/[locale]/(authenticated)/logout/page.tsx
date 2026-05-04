import { AuthGate } from "@/components/shared/auth";
import { Logout } from "./Logout";

export default async function LogoutPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  return (
    <AuthGate redirectTo={`/${locale}/login`}>
      <Logout />
    </AuthGate>
  );
}

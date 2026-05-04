import { AuthGate } from "@/components/shared/auth";
import { Checkout } from "./Checkout";

export default async function CheckoutPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  return (
    <AuthGate redirectTo={`/${locale}/login`}>
      <Checkout />
    </AuthGate>
  );
}

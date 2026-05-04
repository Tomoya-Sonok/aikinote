import { AuthGate } from "@/components/shared/auth";
import { Checkout } from "./Checkout";

export default async function CheckoutPage() {
  return (
    <AuthGate>
      <Checkout />
    </AuthGate>
  );
}

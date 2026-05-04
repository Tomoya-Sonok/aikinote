import { AuthGate } from "@/components/shared/auth";
import { Logout } from "./Logout";

export default async function LogoutPage() {
  return (
    <AuthGate>
      <Logout />
    </AuthGate>
  );
}

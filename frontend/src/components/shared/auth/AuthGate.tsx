import { redirect } from "next/navigation";
import { getLocale } from "next-intl/server";
import type { ReactNode } from "react";
import { getCurrentUser } from "@/lib/server/auth";

interface AuthGateProps {
  children: ReactNode;
}

export async function AuthGate({ children }: AuthGateProps) {
  const user = await getCurrentUser();
  if (!user) {
    const locale = await getLocale();
    redirect(`/${locale}/login`);
  }
  return <>{children}</>;
}

import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { getCurrentUser } from "@/lib/server/auth";

interface AuthGateProps {
  children: ReactNode;
  /** 未ログイン時のリダイレクト先（locale 付き絶対パス） */
  redirectTo: string;
}

export async function AuthGate({ children, redirectTo }: AuthGateProps) {
  const user = await getCurrentUser();
  if (!user) {
    redirect(redirectTo);
  }
  return <>{children}</>;
}

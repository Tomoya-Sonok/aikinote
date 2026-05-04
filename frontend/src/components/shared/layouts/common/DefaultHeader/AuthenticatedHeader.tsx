"use client";

import { useAuth } from "@/lib/hooks/useAuth";
import { DefaultHeader } from "./DefaultHeader";

// layout.tsx (Server) から DefaultHeader (Client) を呼ぶための薄いラッパ。
// Server Component から useAuth を直接呼べないため、ここで user を取得して渡す。
export function AuthenticatedHeader() {
  const { user } = useAuth();
  return <DefaultHeader user={user} />;
}

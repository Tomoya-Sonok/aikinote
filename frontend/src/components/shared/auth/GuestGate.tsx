import { redirect } from "next/navigation";
import { connection } from "next/server";
import { getLocale } from "next-intl/server";
import type { ReactNode } from "react";
import { getCurrentUser } from "@/lib/server/auth";

interface GuestGateProps {
  children: ReactNode;
  /**
   * 認証済みユーザーのリダイレクト先。未指定時は `/${locale}/personal/pages`。
   */
  redirectTo?: string;
}

/**
 * 未認証ユーザー専用のゲート。認証済みの場合は redirectTo（既定はマイページ）へリダイレクトする。
 * 認証必須ページ用の AuthGate と対になる、公開認証ページ（login / signup 等）用のコンポーネント。
 *
 * 冒頭で `connection()` を呼ぶことで、Cache Components（PPR）環境でも必ずリクエスト毎に
 * 認証状態を評価させる。これがないと、認証チェックを含むページが静的シェルとして
 * プリレンダリングされ、ログイン済みでも「未認証（新規登録 / ログイン画面）」が表示されてしまう
 * （ネイティブアプリは起動時に必ず /signup を開くため、この事象が毎回発生していた）。
 */
export async function GuestGate({ children, redirectTo }: GuestGateProps) {
  await connection();

  const user = await getCurrentUser();
  if (user) {
    const locale = await getLocale();
    redirect(redirectTo ?? `/${locale}/personal/pages`);
  }

  return <>{children}</>;
}

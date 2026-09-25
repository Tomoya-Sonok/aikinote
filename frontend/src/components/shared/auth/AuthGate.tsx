import { redirect } from "next/navigation";
import { getLocale } from "next-intl/server";
import { type ReactNode, Suspense } from "react";
import { getCurrentUser } from "@/lib/server/auth";

interface AuthGateProps {
  children: ReactNode;
  /**
   * ページの中身が初回表示の静的シェルに含められない場合（描画中に現在時刻を読む等）に
   * 代わりに表示するスケルトン。ヘッダーやタブは Suspense の外なので常にシェルに含まれる。
   */
  fallback?: ReactNode;
}

/**
 * 認証必須ページのゲート。未ログインならログイン画面へリダイレクトする。
 *
 * 認証チェックは独立した Suspense 境界の中で行い、children の描画は待たせない。
 * 以前は children 全体を認証チェック（Cookie 読み取り）の後ろに置いていたため、
 * Cache Components の静的シェルにページの中身が含まれず、遷移のたびにメイン領域が
 * 空白 → スケルトン → データ の 3 段階で表示されていた。
 * children はクライアント側で認証付き API からデータを取得するため、未ログインの
 * ユーザーにデータが渡ることはない（API 側で認証必須・本人チェック済み）。
 *
 * children も Suspense で包む。包まないと、children が静的シェルに含められないとき
 * （Cache Components では描画中に現在時刻を読むクライアントコンポーネント等）に
 * 保留が (authenticated)/loading.tsx まで伝わり、ヘッダーやタブまで初回表示から消える。
 */
export function AuthGate({ children, fallback = null }: AuthGateProps) {
  return (
    <>
      <Suspense fallback={null}>
        <AuthRedirect />
      </Suspense>
      <Suspense fallback={fallback}>{children}</Suspense>
    </>
  );
}

async function AuthRedirect() {
  const user = await getCurrentUser();
  if (!user) {
    const locale = await getLocale();
    redirect(`/${locale}/login`);
  }
  return null;
}

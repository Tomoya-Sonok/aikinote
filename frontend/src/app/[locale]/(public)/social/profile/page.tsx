import { redirect } from "next/navigation";
import { connection } from "next/server";
import { getCurrentUser } from "@/lib/server/auth";

export default async function SocialProfilePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  // Cache Components(PPR)環境では cookies を読むこのページが静的シェル化され、
  // 認証チェック前に未認証扱いになりうる。connection() で必ずリクエスト時に評価させる。
  await connection();

  const { locale } = await params;
  const user = await getCurrentUser();

  if (!user) {
    redirect(`/${locale}/login`);
  }

  redirect(`/${locale}/social/profile/${user.username}`);
}

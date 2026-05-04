import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import layoutStyles from "@/components/shared/layouts/SocialLayout/SocialLayout.module.css";
import { buildMetadata } from "@/lib/metadata";
import { ProfileResolver } from "./ProfileResolver";
import { SocialProfileSkeleton } from "./SocialProfileSkeleton";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "socialPosts" });

  return buildMetadata({
    title: t("profileTitle"),
  });
}

export default async function SocialProfileByUsernamePage({
  params,
}: {
  params: Promise<{ locale: string; username: string }>;
}) {
  const { locale, username } = await params;

  // SocialLayout コンポーネント (Client) を直接 wrap すると Next.js 16 + Turbopack の
  // SSR module 評価で TabNavigation → useAuth → createContext のチェーンが評価され
  // build に失敗するため、ここでは SocialLayout.module.css の DOM 構造だけ inline で再現する。
  // showTabNavigation={false} 相当の表示で、機能的には SocialLayout と等価。
  return (
    <div className={layoutStyles.layout}>
      <div className={layoutStyles.contentWrapper}>
        <main className={layoutStyles.main}>
          <Suspense fallback={<SocialProfileSkeleton />}>
            <ProfileResolver locale={locale} username={username} />
          </Suspense>
        </main>
      </div>
    </div>
  );
}

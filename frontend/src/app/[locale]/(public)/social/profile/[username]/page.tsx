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

// SocialLayout (Client) を Server から直接 wrap すると createContext 連鎖で build に
// 失敗するため、CSS Modules だけ流用して DOM を inline 再現する (showTabNavigation=false 相当)
export default async function SocialProfileByUsernamePage({
  params,
}: {
  params: Promise<{ locale: string; username: string }>;
}) {
  const { locale, username } = await params;

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

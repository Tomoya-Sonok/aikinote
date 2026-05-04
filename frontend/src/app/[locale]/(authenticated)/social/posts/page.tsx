import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { AuthGate } from "@/components/shared/auth";
import layoutStyles from "@/components/shared/layouts/SocialLayout/SocialLayout.module.css";
import { buildMetadata } from "@/lib/metadata";
import { SocialBottomNav } from "./SocialBottomNav";
import { SocialPostsFeed } from "./SocialPostsFeed";
import { SocialPostsFeedSkeleton } from "./SocialPostsFeedSkeleton";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "socialPosts" });

  return buildMetadata({
    title: t("title"),
    description: t("description"),
  });
}

export default async function SocialPostsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  return (
    <AuthGate redirectTo={`/${locale}/login`}>
      <div className={layoutStyles.layout}>
        <div className={layoutStyles.contentWrapper}>
          <main className={layoutStyles.main}>
            <Suspense fallback={<SocialPostsFeedSkeleton />}>
              <SocialPostsFeed />
            </Suspense>
          </main>
        </div>
        <SocialBottomNav />
      </div>
    </AuthGate>
  );
}

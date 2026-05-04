import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { SocialFeedHeader } from "@/components/features/social/SocialFeedHeader/SocialFeedHeader";
import { AuthGate } from "@/components/shared/auth";
import layoutStyles from "@/components/shared/layouts/SocialLayout/SocialLayout.module.css";
import { buildMetadata } from "@/lib/metadata";
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

// (tabbed) layout が `.layout` 枠と TabNavigation を提供する。
// このページは固有の SocialFeedHeader を持つので main 構造だけ自前で組み立てる。
// SocialFeedHeader (Client、children なし) を Server から直接呼ぶのは Phase 4 の
// SocialBottomNav と同じパターンで build OK。
export default async function SocialPostsPage() {
  return (
    <AuthGate>
      <SocialFeedHeader />
      <div className={layoutStyles.contentWrapper}>
        <main className={layoutStyles.main}>
          <Suspense fallback={<SocialPostsFeedSkeleton />}>
            <SocialPostsFeed />
          </Suspense>
        </main>
      </div>
    </AuthGate>
  );
}

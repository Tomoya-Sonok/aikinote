import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { AuthGate } from "@/components/shared/auth";
import { MinimalLayout } from "@/components/shared/layouts/MinimalLayout";
import { Skeleton } from "@/components/shared/Skeleton";
import { buildMetadata } from "@/lib/metadata";
import { SocialNotifications } from "./SocialNotifications";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "socialPosts" });

  return buildMetadata({
    title: t("notificationsTitle"),
  });
}

export default async function SocialNotificationsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "socialPosts" });

  // ヘッダーは静的シェルに残し、URL の tab を読む本体（useSearchParams）だけを待たせる
  return (
    <AuthGate>
      <MinimalLayout
        headerTitle={t("notificationsTitle")}
        backHref="/social/posts"
      >
        <Suspense fallback={<Skeleton height="240px" borderRadius="12px" />}>
          <SocialNotifications />
        </Suspense>
      </MinimalLayout>
    </AuthGate>
  );
}

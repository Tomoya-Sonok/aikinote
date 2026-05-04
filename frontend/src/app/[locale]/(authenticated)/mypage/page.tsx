import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { AuthGate } from "@/components/shared/auth";
import { buildMetadata } from "@/lib/metadata";
import { MyPageInitializer } from "./MyPageInitializer";
import { MyPageSkeleton } from "./MyPageSkeleton";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "mypage" });

  return buildMetadata({
    title: t("title"),
    description: t("description"),
  });
}

export default async function Page({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  return (
    <AuthGate redirectTo={`/${locale}/login`}>
      <Suspense fallback={<MyPageSkeleton />}>
        <MyPageInitializer locale={locale} />
      </Suspense>
    </AuthGate>
  );
}

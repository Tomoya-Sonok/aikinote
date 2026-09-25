import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { AuthGate } from "@/components/shared/auth";
import { MinimalLayout } from "@/components/shared/layouts/MinimalLayout";
import { Skeleton } from "@/components/shared/Skeleton";
import { buildMetadata } from "@/lib/metadata";
import { PersonalCalendar } from "./PersonalCalendar";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "personalCalendar" });

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
  const t = await getTranslations({ locale, namespace: "personalCalendar" });

  return (
    <AuthGate>
      <MinimalLayout
        backHref={`/${locale}/personal/pages`}
        headerTitle={t("title")}
      >
        {/* ヘッダー（MinimalLayout）は静的シェルに残し、本体だけを待たせる */}
        <Suspense fallback={<Skeleton height="360px" borderRadius="12px" />}>
          <PersonalCalendar />
        </Suspense>
      </MinimalLayout>
    </AuthGate>
  );
}

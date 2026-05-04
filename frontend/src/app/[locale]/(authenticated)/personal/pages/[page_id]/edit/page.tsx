import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { AuthGate } from "@/components/shared/auth";
import { buildMetadata } from "@/lib/metadata";
import { PageEdit } from "./PageEdit";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale });

  return buildMetadata({
    title: t("pageDetail.edit"),
  });
}

export default async function PersonalPageEditPage({
  params,
}: {
  params: Promise<{ locale: string; page_id: string }>;
}) {
  const { locale } = await params;
  return (
    <AuthGate redirectTo={`/${locale}/login`}>
      <PageEdit />
    </AuthGate>
  );
}

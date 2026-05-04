import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { AuthGate } from "@/components/shared/auth";
import { buildMetadata } from "@/lib/metadata";
import { SocialPostCreate } from "./SocialPostCreate";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "socialPosts" });

  return buildMetadata({
    title: t("newPost"),
  });
}

export default async function SocialPostNewPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  return (
    <AuthGate redirectTo={`/${locale}/login`}>
      <SocialPostCreate />
    </AuthGate>
  );
}

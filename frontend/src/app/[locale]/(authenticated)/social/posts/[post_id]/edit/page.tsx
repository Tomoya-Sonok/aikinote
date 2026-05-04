import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { AuthGate } from "@/components/shared/auth";
import { buildMetadata } from "@/lib/metadata";
import { SocialPostEdit } from "./SocialPostEdit";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "socialPosts" });

  return buildMetadata({
    title: t("editPost"),
  });
}

export default async function SocialPostEditPage({
  params,
}: {
  params: Promise<{ locale: string; post_id: string }>;
}) {
  const { locale } = await params;
  return (
    <AuthGate redirectTo={`/${locale}/login`}>
      <SocialPostEdit />
    </AuthGate>
  );
}

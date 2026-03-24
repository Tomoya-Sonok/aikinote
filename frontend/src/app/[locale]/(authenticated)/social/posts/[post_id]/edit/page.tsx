import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
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

export default async function SocialPostEditPage() {
  return <SocialPostEdit />;
}

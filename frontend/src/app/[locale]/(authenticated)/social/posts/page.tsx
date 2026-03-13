import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { buildMetadata } from "@/lib/metadata";
import { SocialPostsFeed } from "./SocialPostsFeed";

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

export default async function SocialPostsPage() {
  return <SocialPostsFeed />;
}

import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { buildMetadata } from "@/lib/metadata";
import { SocialPostDetail } from "./SocialPostDetail";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "socialPosts" });

  return buildMetadata({
    title: t("detail"),
  });
}

export default async function SocialPostDetailPage({
  params,
}: {
  params: Promise<{ post_id: string }>;
}) {
  const { post_id } = await params;
  return <SocialPostDetail postId={post_id} />;
}

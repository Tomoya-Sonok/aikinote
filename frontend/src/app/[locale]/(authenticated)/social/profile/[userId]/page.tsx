import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { buildMetadata } from "@/lib/metadata";
import { SocialProfileView } from "../SocialProfileView";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "socialPosts" });

  return buildMetadata({
    title: t("profileTitle"),
  });
}

export default async function SocialProfileByIdPage({
  params,
}: {
  params: Promise<{ locale: string; userId: string }>;
}) {
  const { userId } = await params;
  return <SocialProfileView userId={userId} />;
}

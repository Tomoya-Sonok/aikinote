import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { buildMetadata } from "@/lib/metadata";
import { PageCreate } from "./PageCreate";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "pageCreate" });

  return buildMetadata({
    title: t("title"),
  });
}

export default async function PersonalPageNewPage() {
  return <PageCreate />;
}

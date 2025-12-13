import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { DefaultLayout } from "@/components/layouts/DefaultLayout";
import { buildMetadata } from "@/lib/metadata";
import { getCurrentUser } from "@/lib/server/auth";
import styles from "./page.module.css";

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

export default async function SocialPostsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "socialPosts" });
  const loginPath = `/${locale}/login`;

  const user = await getCurrentUser();

  if (!user) {
    redirect(loginPath);
  }

  return (
    <DefaultLayout>
      <div className={styles.container}>
        <div className={styles.content}>
          <h1>{t("title")}</h1>
          <p className={styles.description}>{t("description")}</p>
          <p className={styles.notice}>
            {t("comingSoon")}
            <br />
            {t("notification")}
          </p>
        </div>
      </div>
    </DefaultLayout>
  );
}

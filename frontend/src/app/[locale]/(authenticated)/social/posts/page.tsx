import type { Metadata } from "next";
import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { DefaultLayout } from "@/components/shared/layouts/DefaultLayout";
import { buildMetadata } from "@/lib/metadata";
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

  return (
    <DefaultLayout>
      <div className={styles.container}>
        <div className={styles.content}>
          <div className={styles.card}>
            <div className={styles.header}>
              <span className={styles.badge}>Coming Soon</span>
              <h1>{t("title")}</h1>
            </div>

            <div className={styles.imageWrapper}>
              <Image
                src="/images/lp_upcoming_sns_features.png"
                alt="AikiNote Upcoming SNS Features"
                width={800}
                height={600}
                sizes="(max-width: 768px) 100vw, 800px"
                className={styles.image}
                priority
              />
            </div>

            <div className={styles.textWrapper}>
              <p className={styles.description}>{t("description")}</p>
              <p className={styles.notice}>{t("notification")}</p>
            </div>
          </div>
        </div>
      </div>
    </DefaultLayout>
  );
}

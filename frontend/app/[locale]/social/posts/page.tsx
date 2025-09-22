import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { DefaultLayout } from "@/components/layouts/DefaultLayout";
import { buildMetadata } from "@/lib/metadata";
import { getCurrentUser } from "@/lib/server/auth";
import styles from "./page.module.css";

export default async function SocialPostsPage() {
  const user = await getCurrentUser();
  const t = await getTranslations();

  if (!user) {
    redirect("/login");
  }

  return (
    <DefaultLayout>
      <div className={styles.container}>
        <div className={styles.content}>
          <h1>{t("socialPosts.title")}</h1>
          <p className={styles.description}>
            {t("socialPosts.description")}
          </p>
          <p className={styles.notice}>
            {t("socialPosts.comingSoon")}
            <br />
            {t("socialPosts.notification")}
          </p>
        </div>
      </div>
    </DefaultLayout>
  );
}

export async function generateMetadata() {
  const t = await getTranslations();
  return buildMetadata({
    title: t("socialPosts.title"),
    description: t("socialPosts.description"),
  });
}

import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { DefaultLayout } from "@/components/layouts/DefaultLayout";
import { buildMetadata } from "@/lib/metadata";
import { getCurrentUser } from "@/lib/server/auth";
import MyPageClient from "./MyPageClient";
import styles from "./page.module.css";

export async function generateMetadata({
  params: { locale },
}: {
  params: { locale: string };
}): Promise<Metadata> {
  const t = await getTranslations({ locale, namespace: "mypage" });

  return buildMetadata({
    title: t("title"),
    description: t("description"),
  });
}

export default async function MyPage({
  params: { locale },
}: {
  params: { locale: string };
}) {
  const profileT = await getTranslations({ locale, namespace: "profileEdit" });
  const loginPath = `/${locale}/login`;
  const settingsPath = `/${locale}/mypage`;

  const user = await getCurrentUser();

  if (!user) {
    redirect(loginPath);
  }

  const initialProfile = {
    id: user.id,
    email: user.email || "",
    username: user.username || profileT("usernamePlaceholder"),
    profile_image_url: user.profile_image_url || null,
    dojo_style_name: user.dojo_style_name || null,
    training_start_date: null,
    publicity_setting: "private" as const,
    language: locale,
    is_email_verified: true,
    password_hash: "",
  };

  return (
    <DefaultLayout settingsHref={settingsPath}>
      <div className={styles.container}>
        <div className={styles.content}>
          <MyPageClient initialUser={initialProfile} />
        </div>
      </div>
    </DefaultLayout>
  );
}

import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { DefaultLayout } from "@/components/shared/layouts/DefaultLayout";
import { buildMetadata } from "@/lib/metadata";
import { getCurrentUser } from "@/lib/server/auth";
import MyPage from "./MyPage";
import styles from "./page.module.css";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "mypage" });

  return buildMetadata({
    title: t("title"),
    description: t("description"),
  });
}

export default async function Page({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const userInfoT = await getTranslations({
    locale,
    namespace: "userInfoEdit",
  });
  const loginPath = `/${locale}/login`;
  const settingsPath = `/${locale}/mypage`;

  const user = await getCurrentUser();

  // 認証チェック（Layoutでも行っているが、ビルド時や型解決のために必要）
  if (!user) {
    redirect(loginPath);
  }

  // サーバー側で Hono から取得した全フィールドを初期値として渡すことで、
  // クライアント側の初期 fetch を不要にし、MyPage の LCP を短縮する
  const initialProfile = {
    id: user.id,
    email: user.email || "",
    username: user.username || userInfoT("usernamePlaceholder"),
    profile_image_url: user.profile_image_url || null,
    dojo_style_name: user.dojo_style_name || null,
    dojo_style_id: user.dojo_style_id || null,
    training_start_date: user.training_start_date || null,
    publicity_setting: user.publicity_setting || null,
    aikido_rank: user.aikido_rank || null,
    full_name: user.full_name || null,
    bio: user.bio ?? null,
    age_range: user.age_range ?? null,
    gender: user.gender ?? null,
    language: locale,
    is_email_verified: true,
    password_hash: "",
  };

  return (
    <DefaultLayout settingsHref={settingsPath}>
      <div className={styles.container}>
        <div className={styles.content}>
          <MyPage initialUser={initialProfile} />
        </div>
      </div>
    </DefaultLayout>
  );
}

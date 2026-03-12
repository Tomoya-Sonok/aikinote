import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { MinimalLayout } from "@/components/shared/layouts/MinimalLayout";
import { buildMetadata } from "@/lib/metadata";
import { getCurrentUser, getUserBasicInfo } from "@/lib/server/auth";
import { BasicInfoEdit } from "./BasicInfoEdit";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "basicInfoEdit" });

  return buildMetadata({
    title: t("title"),
    description: t("description"),
  });
}

export default async function BasicInfoEditPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "basicInfoEdit" });
  const loginPath = `/${locale}/login`;
  const myPagePath = `/${locale}/mypage`;

  const user = await getCurrentUser();

  if (!user) {
    redirect(loginPath);
  }

  const { data: userBasicInfo, error } = await getUserBasicInfo(user.id);

  if (error || !userBasicInfo) {
    redirect(loginPath);
  }

  const profile = userBasicInfo || {
    id: user.id,
    email: user.email || "",
    username: user.username || t("usernamePlaceholder"),
    profile_image_url: user.profile_image_url || null,
    dojo_style_name: null,
    training_start_date: null,
    publicity_setting: "private",
    language: locale,
    is_email_verified: true,
    password_hash: "",
  };

  return (
    <MinimalLayout backHref={myPagePath} headerTitle={t("title")}>
      <BasicInfoEdit user={profile} />
    </MinimalLayout>
  );
}

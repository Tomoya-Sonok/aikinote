import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { MinimalLayout } from "@/components/layouts/MinimalLayout";
import { buildMetadata } from "@/lib/metadata";
import { getCurrentUser, getUserProfile } from "@/lib/server/auth";
import { ProfileEditClient } from "./ProfileEditClient";

export async function generateMetadata({
  params: { locale },
}: {
  params: { locale: string };
}): Promise<Metadata> {
  const t = await getTranslations({ locale, namespace: "profileEdit" });

  return buildMetadata({
    title: t("title"),
    description: t("description"),
  });
}

export default async function ProfileEditPage({
  params: { locale },
}: {
  params: { locale: string };
}) {
  const t = await getTranslations({ locale, namespace: "profileEdit" });
  const loginPath = `/${locale}/login`;
  const myPagePath = `/${locale}/mypage`;

  const user = await getCurrentUser();

  if (!user) {
    redirect(loginPath);
  }

  const { data: userProfile, error } = await getUserProfile(user.id);

  if (error || !userProfile) {
    redirect(loginPath);
  }

  const profile = userProfile || {
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
      <ProfileEditClient user={profile} />
    </MinimalLayout>
  );
}

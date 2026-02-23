import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { MinimalLayout } from "@/components/shared/layouts/MinimalLayout";
import { buildMetadata } from "@/lib/metadata";
import { getCurrentUser, getUserProfile } from "@/lib/server/auth";
import { ProfileEdit } from "./ProfileEdit";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "profileEdit" });

  return buildMetadata({
    title: t("title"),
    description: t("description"),
  });
}

export default async function ProfileEditPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "profileEdit" });
  const loginPath = `/${locale}/login`;
  const myPagePath = `/${locale}/mypage`;

  const user = await getCurrentUser();

  if (!user) {
    throw new Error("User must be authenticated");
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
      <ProfileEdit user={profile} />
    </MinimalLayout>
  );
}

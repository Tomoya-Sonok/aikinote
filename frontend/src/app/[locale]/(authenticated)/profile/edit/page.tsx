import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { MinimalLayout } from "@/components/shared/layouts/MinimalLayout";
import { buildMetadata } from "@/lib/metadata";
import { getCurrentUser, getUserInfo } from "@/lib/server/auth";
import { ProfileEdit } from "./ProfileEdit";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "userInfoEdit" });

  return buildMetadata({
    title: t("title"),
    description: t("description"),
  });
}

export default async function ProfileEditPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ from?: string }>;
}) {
  const { locale } = await params;
  const { from } = await searchParams;
  const t = await getTranslations({ locale, namespace: "userInfoEdit" });
  const loginPath = `/${locale}/login`;

  const user = await getCurrentUser();

  if (!user) {
    redirect(loginPath);
  }

  const { data: userInfo, error } = await getUserInfo(user.id);

  if (error || !userInfo) {
    redirect(loginPath);
  }

  const profile = userInfo || {
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

  // 遷移元に応じた戻り先を決定
  const backHref =
    from === "social"
      ? `/${locale}/social/profile/${user.id}`
      : `/${locale}/mypage`;

  return (
    <MinimalLayout backHref={backHref} headerTitle={t("title")}>
      <ProfileEdit
        user={profile}
        from={from === "social" ? "social" : undefined}
      />
    </MinimalLayout>
  );
}

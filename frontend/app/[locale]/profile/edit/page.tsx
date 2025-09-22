import { redirect } from "next/navigation";
import { MinimalLayout } from "@/components/layouts/MinimalLayout";
import { buildMetadata } from "@/lib/metadata";
import { getCurrentUser, getUserProfile } from "@/lib/server/auth";
import { ProfileEditClient } from "./ProfileEditClient";

export default async function ProfileEditPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const { data: userProfile, error } = await getUserProfile(user.id);

  if (error || !userProfile) {
    console.error("ユーザープロフィール取得エラー:", error);
    redirect("/login");
  }

  const profile = userProfile || {
    id: user.id,
    email: user.email || "",
    username: user.username || "未設定",
    profile_image_url: user.profile_image_url || null,
    dojo_style_name: null,
    training_start_date: null,
    publicity_setting: "private",
    language: "ja",
    is_email_verified: true,
    password_hash: "",
  };

  return (
    <MinimalLayout backHref="/mypage" headerTitle="プロフィール編集">
      <ProfileEditClient user={profile} />
    </MinimalLayout>
  );
}

export const metadata = buildMetadata({
  title: "プロフィール編集",
  description: "プロフィール情報を編集できます。",
});

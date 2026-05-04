import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getCurrentUser } from "@/lib/server/auth";
import MyPage from "./MyPage";

interface MyPageInitializerProps {
  locale: string;
}

// Suspense 境界の内側で getCurrentUser() を実行し、Hono から取得した全フィールドを
// initialProfile として MyPage に渡すことで、クライアント側の初回 fetch を不要にする。
// 認証 redirect は AuthGate で完了している前提だが、型 narrowing と保険のため残している。
export async function MyPageInitializer({ locale }: MyPageInitializerProps) {
  const [userInfoT, user] = await Promise.all([
    getTranslations({ locale, namespace: "userInfoEdit" }),
    getCurrentUser(),
  ]);

  if (!user) {
    redirect(`/${locale}/login`);
  }

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

  return <MyPage initialUser={initialProfile} />;
}

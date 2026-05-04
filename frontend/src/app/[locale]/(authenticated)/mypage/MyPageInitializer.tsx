import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getCurrentUser } from "@/lib/server/auth";
import MyPage from "./MyPage";

interface MyPageInitializerProps {
  locale: string;
}

// Suspense 境界の内側で動く Server Component。
// getCurrentUser() は cookies() を読む dynamic source なので、Suspense fallback の
// MyPageSkeleton を先行表示しつつ、ここで initialProfile を構築して MyPage に渡す。
// 認証 redirect は AuthGate で済んでいるが、user 取得に失敗した場合の保険として残す。
export async function MyPageInitializer({ locale }: MyPageInitializerProps) {
  const userInfoT = await getTranslations({
    locale,
    namespace: "userInfoEdit",
  });

  const user = await getCurrentUser();

  if (!user) {
    redirect(`/${locale}/login`);
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

  const settingsHref = `/${locale}/mypage`;

  return <MyPage initialUser={initialProfile} settingsHref={settingsHref} />;
}

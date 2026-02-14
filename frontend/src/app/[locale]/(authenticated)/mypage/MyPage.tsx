"use client";

import { useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";
import { Loader } from "@/components/shared/Loader/Loader";
import type { UserProfile } from "@/components/features/personal/MyPageContent/MyPageContent";
import { MyPageContent } from "@/components/features/personal/MyPageContent/MyPageContent";
import { useToast } from "@/contexts/ToastContext";
import { getUserProfile } from "@/lib/api/client";

interface MyPageProps {
  initialUser: UserProfile;
}

export default function MyPage({ initialUser }: MyPageProps) {
  const t = useTranslations();
  const [user, setUser] = useState<UserProfile>(initialUser);
  const [loading, setLoading] = useState(false);
  const { showToast } = useToast();

  const fetchUserProfile = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getUserProfile(user.id);
      if (!result.success || !result.data) {
        const errorMessage =
          "error" in result
            ? result.error
            : t("mypageContent.profileFetchFailed");
        throw new Error(errorMessage);
      }

      setUser(result.data);
    } catch (error) {
      console.error("プロフィール取得エラー:", error);
      showToast(t("mypageContent.profileFetchFailed"), "error");
    } finally {
      setLoading(false);
    }
  }, [showToast, t, user.id]);

  // マイページアクセス時に最新プロフィールを取得
  useEffect(() => {
    fetchUserProfile();
  }, [fetchUserProfile]);

  if (loading) {
    return (
      <Loader size="medium" centered text={t("mypageContent.loadingProfile")} />
    );
  }

  return <MyPageContent user={user} />;
}

"use client";

import { useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";
import type { UserProfile } from "@/components/features/personal/MyPageContent/MyPageContent";
import { MyPageContent } from "@/components/features/personal/MyPageContent/MyPageContent";
import { useToast } from "@/contexts/ToastContext";
import { getUserInfo } from "@/lib/api/client";

interface MyPageProps {
  initialUser: UserProfile;
}

export default function MyPage({ initialUser }: MyPageProps) {
  const t = useTranslations();
  const [user, setUser] = useState<UserProfile>(initialUser);
  const [loading, setLoading] = useState(false);
  const { showToast } = useToast();

  const fetchUserInfo = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getUserInfo(user.id);
      if (!result.success || !result.data) {
        const errorMessage =
          "error" in result
            ? result.error
            : t("mypageContent.userInfoFetchFailed");
        throw new Error(errorMessage);
      }

      setUser(result.data);
    } catch (error) {
      console.error("ユーザー情報取得エラー:", error);
      showToast(t("mypageContent.userInfoFetchFailed"), "error");
    } finally {
      setLoading(false);
    }
  }, [showToast, t, user.id]);

  // マイページアクセス時に最新のユーザー情報を取得
  useEffect(() => {
    fetchUserInfo();
  }, [fetchUserInfo]);

  return <MyPageContent user={user} loading={loading} />;
}

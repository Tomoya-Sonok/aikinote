"use client";

import { useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";
import type { UserProfile } from "@/components/features/personal/MyPageContent/MyPageContent";
import { MyPageContent } from "@/components/features/personal/MyPageContent/MyPageContent";
import { useToast } from "@/contexts/ToastContext";
import { getUserBasicInfo } from "@/lib/api/client";

interface MyPageProps {
  initialUser: UserProfile;
}

export default function MyPage({ initialUser }: MyPageProps) {
  const t = useTranslations();
  const [user, setUser] = useState<UserProfile>(initialUser);
  const [loading, setLoading] = useState(false);
  const { showToast } = useToast();

  const fetchUserBasicInfo = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getUserBasicInfo(user.id);
      if (!result.success || !result.data) {
        const errorMessage =
          "error" in result
            ? result.error
            : t("mypageContent.basicInfoFetchFailed");
        throw new Error(errorMessage);
      }

      setUser(result.data);
    } catch (error) {
      console.error("基本情報取得エラー:", error);
      showToast(t("mypageContent.basicInfoFetchFailed"), "error");
    } finally {
      setLoading(false);
    }
  }, [showToast, t, user.id]);

  // マイページアクセス時に最新の基本情報を取得
  useEffect(() => {
    fetchUserBasicInfo();
  }, [fetchUserBasicInfo]);

  return <MyPageContent user={user} loading={loading} />;
}

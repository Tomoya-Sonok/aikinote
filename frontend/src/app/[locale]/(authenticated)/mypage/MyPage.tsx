"use client";

import { useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";
import type { UserProfile } from "@/components/features/personal/MyPageContent/MyPageContent";
import { MyPageContent } from "@/components/features/personal/MyPageContent/MyPageContent";
import { SurveyModal } from "@/components/shared/SurveyModal/SurveyModal";
import { useToast } from "@/contexts/ToastContext";
import { getUserInfo, updateUserInfo } from "@/lib/api/client";
import type { AgeRange, Gender } from "@/lib/constants/userProfile";
import { useSurveyModal } from "@/lib/hooks/useSurveyModal";

interface MyPageProps {
  initialUser: UserProfile;
}

export default function MyPage({ initialUser }: MyPageProps) {
  const t = useTranslations();
  const [user, setUser] = useState<UserProfile>(initialUser);
  const [loading, setLoading] = useState(true);
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

  const { isOpen: isSurveyOpen, dismiss: dismissSurvey } = useSurveyModal({
    ageRange: user.age_range ?? null,
    gender: user.gender ?? null,
    loading,
  });

  const handleSurveySave = async (data: {
    ageRange: AgeRange | null;
    gender: Gender | null;
  }) => {
    const result = await updateUserInfo({
      userId: user.id,
      age_range: data.ageRange,
      gender: data.gender,
    });
    if (!result.success) {
      showToast(t("surveyModal.saveFailed"), "error");
      throw new Error(t("surveyModal.saveFailed"));
    }
    await fetchUserInfo();
    dismissSurvey();
  };

  return (
    <>
      <MyPageContent user={user} loading={loading} />
      <SurveyModal
        isOpen={isSurveyOpen}
        onDismiss={dismissSurvey}
        onSave={handleSurveySave}
        initialAgeRange={user.age_range}
        initialGender={user.gender}
      />
    </>
  );
}

"use client";

import { useTranslations } from "next-intl";
import { useCallback, useState } from "react";
import type { UserProfile } from "@/components/features/personal/MyPageContent/MyPageContent";
import { MyPageContent } from "@/components/features/personal/MyPageContent/MyPageContent";
import { SurveyModal } from "@/components/shared/SurveyModal/SurveyModal";
import { useToast } from "@/contexts/ToastContext";
import { getUserInfo, updateUserInfo } from "@/lib/api/client";
import type { AgeRange, Gender } from "@/lib/constants/userProfile";
import { useSurveyModal } from "@/lib/hooks/useSurveyModal";
import { useUmamiTrack } from "@/lib/hooks/useUmamiTrack";

interface MyPageProps {
  initialUser: UserProfile;
}

export default function MyPage({ initialUser }: MyPageProps) {
  const t = useTranslations();
  const [user, setUser] = useState<UserProfile>(initialUser);
  // サーバー側で全フィールドが初期化済みなので、マウント時の loading は不要。
  // ミューテーション後の再取得時のみ true にする
  const [loading, setLoading] = useState(false);
  const { showToast } = useToast();
  const { track } = useUmamiTrack();

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

  const { isOpen: isSurveyOpen, dismiss: dismissSurvey } = useSurveyModal({
    ageRange: user.age_range ?? null,
    gender: user.gender ?? null,
    loading,
  });

  const handleSurveyDismiss = () => {
    track("mypage_survey_age_gender_dismiss");
    dismissSurvey();
  };

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
        onDismiss={handleSurveyDismiss}
        onSave={handleSurveySave}
        initialAgeRange={user.age_range}
        initialGender={user.gender}
      />
    </>
  );
}

"use client";

import { useEffect, useState } from "react";
import { useSurveyStore } from "@/stores/surveyStore";

const COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

interface UseSurveyModalParams {
  ageRange: string | null | undefined;
  gender: string | null | undefined;
  /** ユーザー情報をAPIから取得中かどうか。true の間はモーダルを表示しない */
  loading: boolean;
}

interface UseSurveyModalReturn {
  isOpen: boolean;
  dismiss: () => void;
}

export function useSurveyModal({
  ageRange,
  gender,
  loading,
}: UseSurveyModalParams): UseSurveyModalReturn {
  const [isOpen, setIsOpen] = useState(false);
  const { dismissedAt, setDismissedAt } = useSurveyStore();

  useEffect(() => {
    // ユーザー情報取得中は判定しない
    if (loading) return;

    // 条件①: age_range または gender のいずれかが未登録
    const hasIncompleteProfile = ageRange == null || gender == null;
    if (!hasIncompleteProfile) return;

    // 条件②: 前回のモーダル表示から1週間が経過している
    if (dismissedAt) {
      const elapsed = Date.now() - new Date(dismissedAt).getTime();
      if (elapsed < COOLDOWN_MS) return;
    }

    setIsOpen(true);
  }, [ageRange, gender, loading, dismissedAt]);

  const dismiss = () => {
    setIsOpen(false);
    setDismissedAt(new Date().toISOString());
  };

  return { isOpen, dismiss };
}

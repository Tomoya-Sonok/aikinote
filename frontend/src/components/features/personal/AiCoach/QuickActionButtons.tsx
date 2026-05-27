"use client";

import { useTranslations } from "next-intl";
import type { FC } from "react";
import { AI_COACH_QUICK_ACTION_IDS } from "@/lib/aiCoach/constants";
import styles from "./QuickActionButtons.module.css";

interface QuickActionButtonsProps {
  disabled?: boolean;
  onSelect: (prompt: string) => void;
}

// 定型プロンプトのボタン群。文言・プロンプト本文は i18n（aiCoach.quickActions.*）から取得する。
export const QuickActionButtons: FC<QuickActionButtonsProps> = ({
  disabled,
  onSelect,
}) => {
  const t = useTranslations();
  return (
    <div className={styles.actions}>
      {AI_COACH_QUICK_ACTION_IDS.map((id) => (
        <button
          key={id}
          type="button"
          className={styles.action}
          disabled={disabled}
          onClick={() => onSelect(t(`aiCoach.quickActions.${id}.prompt`))}
        >
          {t(`aiCoach.quickActions.${id}.label`)}
        </button>
      ))}
    </div>
  );
};

"use client";

import {
  SmileyIcon,
  SmileyMehIcon,
  SmileySadIcon,
} from "@phosphor-icons/react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { useToast } from "@/contexts/ToastContext";
import {
  type AiCoachFeedbackValue,
  submitConversationFeedback,
} from "@/lib/api/aiCoach";
import { useUmamiTrack } from "@/lib/hooks/useUmamiTrack";
import styles from "./AiCoachFeedback.module.css";

const OPTIONS = [
  { value: "good", labelKey: "aiCoach.feedback.good", Icon: SmileyIcon },
  {
    value: "neutral",
    labelKey: "aiCoach.feedback.neutral",
    Icon: SmileyMehIcon,
  },
  { value: "bad", labelKey: "aiCoach.feedback.bad", Icon: SmileySadIcon },
] as const;

// AIコーチの会話単位フィードバック。1会話につき1回だけ回収する。
// 回答成功時は onCompleted で親が非表示化し、DB 側でも is_feedback_visible=false と
// なるため、同じ会話では二度と表示されない。
export function AiCoachFeedback({
  conversationId,
  onCompleted,
}: {
  conversationId: string;
  onCompleted: () => void;
}) {
  const t = useTranslations();
  const { showToast } = useToast();
  const { track } = useUmamiTrack();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSelect = async (feedback: AiCoachFeedbackValue) => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      await submitConversationFeedback(conversationId, feedback);
      track("ai_coach_feedback_submit", { feedback });
      showToast(t("aiCoach.feedback.thanks"), "success");
      onCompleted();
    } catch {
      showToast(t("aiCoach.feedback.failed"), "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={styles.card}>
      <p className={styles.prompt}>{t("aiCoach.feedback.prompt")}</p>
      <div className={styles.options}>
        {OPTIONS.map(({ value, labelKey, Icon }) => (
          <button
            key={value}
            type="button"
            className={styles.option}
            disabled={isSubmitting}
            onClick={() => void handleSelect(value)}
          >
            <Icon size={26} weight="regular" aria-hidden="true" />
            <span className={styles.optionLabel}>{t(labelKey)}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

"use client";

import { PaperPlaneRightIcon } from "@phosphor-icons/react";
import { useTranslations } from "next-intl";
import { type FC, useCallback, useState } from "react";
import { Button } from "@/components/shared/Button/Button";
import styles from "./SocialReplyForm.module.css";

const MAX_REPLY_LENGTH = 1000;

interface SocialReplyFormProps {
  onSubmit: (content: string) => Promise<void>;
}

export const SocialReplyForm: FC<SocialReplyFormProps> = ({ onSubmit }) => {
  const t = useTranslations("socialPosts");
  const [content, setContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = useCallback(async () => {
    if (!content.trim() || isSubmitting) return;
    setIsSubmitting(true);
    try {
      await onSubmit(content.trim());
      setContent("");
    } finally {
      setIsSubmitting(false);
    }
  }, [content, isSubmitting, onSubmit]);

  return (
    <div className={styles.formContainer}>
      <div className={styles.inputWrapper}>
        <textarea
          className={styles.input}
          value={content}
          onChange={(e) =>
            setContent(e.target.value.slice(0, MAX_REPLY_LENGTH))
          }
          placeholder={t("replyPlaceholder")}
          maxLength={MAX_REPLY_LENGTH}
          rows={1}
          onKeyDown={(e) => {
            if (
              e.key === "Enter" &&
              !e.shiftKey &&
              !e.nativeEvent.isComposing
            ) {
              e.preventDefault();
              handleSubmit();
            }
          }}
        />
        <Button
          className={styles.submitButton}
          onClick={handleSubmit}
          disabled={!content.trim() || isSubmitting}
          aria-label={t("replySubmit")}
        >
          <PaperPlaneRightIcon size={20} weight="fill" />
        </Button>
      </div>
    </div>
  );
};

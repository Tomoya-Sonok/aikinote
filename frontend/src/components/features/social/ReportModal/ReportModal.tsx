"use client";

import { useTranslations } from "next-intl";
import { type FC, useCallback, useId, useState } from "react";
import { Button } from "@/components/shared/Button/Button";
import styles from "./ReportModal.module.css";

type ReportReason = "spam" | "harassment" | "inappropriate" | "other";

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (reason: ReportReason, detail?: string) => void;
  title: string;
}

export const ReportModal: FC<ReportModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  title,
}) => {
  const t = useTranslations("socialPosts");
  const reasonGroupId = useId();
  const detailId = useId();
  const [reason, setReason] = useState<ReportReason | null>(null);
  const [detail, setDetail] = useState("");

  const handleSubmit = useCallback(() => {
    if (!reason) return;
    onSubmit(reason, detail.trim() || undefined);
    setReason(null);
    setDetail("");
  }, [reason, detail, onSubmit]);

  const handleClose = useCallback(() => {
    setReason(null);
    setDetail("");
    onClose();
  }, [onClose]);

  if (!isOpen) return null;

  const reasons: { value: ReportReason; label: string }[] = [
    { value: "spam", label: t("reportReasonSpam") },
    { value: "harassment", label: t("reportReasonHarassment") },
    { value: "inappropriate", label: t("reportReasonInappropriate") },
    { value: "other", label: t("reportReasonOther") },
  ];

  return (
    // biome-ignore lint/a11y/useKeyWithClickEvents: overlay dismiss pattern
    // biome-ignore lint/a11y/noStaticElementInteractions: overlay dismiss pattern
    <div className={styles.overlay} onClick={handleClose}>
      {/* biome-ignore lint/a11y/useKeyWithClickEvents: stopPropagation for modal content */}
      <div
        className={styles.modal}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <h2 className={styles.title}>{title}</h2>

        <div className={styles.reasonSection}>
          <span className={styles.label} id={reasonGroupId}>
            {t("reportReason")}
          </span>
          <div
            className={styles.reasonList}
            role="radiogroup"
            aria-labelledby={reasonGroupId}
          >
            {reasons.map((r) => (
              <label key={r.value} className={styles.reasonLabel}>
                <input
                  type="radio"
                  name="reportReason"
                  value={r.value}
                  checked={reason === r.value}
                  onChange={() => setReason(r.value)}
                  className={styles.radioInput}
                />
                <span>{r.label}</span>
              </label>
            ))}
          </div>
        </div>

        <div className={styles.detailSection}>
          <label className={styles.label} htmlFor={detailId}>
            {t("reportDetail")}
          </label>
          <textarea
            id={detailId}
            className={styles.textarea}
            value={detail}
            onChange={(e) => setDetail(e.target.value)}
            rows={3}
            maxLength={500}
          />
        </div>

        <div className={styles.actions}>
          <Button size="small" onClick={handleClose}>
            {t("editCancel")}
          </Button>
          <Button
            variant="primary"
            size="small"
            onClick={handleSubmit}
            disabled={!reason}
          >
            {t("reportSubmit")}
          </Button>
        </div>
      </div>
    </div>
  );
};

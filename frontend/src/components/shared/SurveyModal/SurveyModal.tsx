"use client";

import { X } from "@phosphor-icons/react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { type KeyboardEvent, useEffect, useId, useState } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/shared/Button/Button";
import { PillSelect } from "@/components/shared/PillSelect/PillSelect";
import {
  AGE_RANGE_OPTIONS,
  type AgeRange,
  GENDER_OPTIONS,
  type Gender,
} from "@/lib/constants/userProfile";
import styles from "./SurveyModal.module.css";

interface SurveyModalProps {
  isOpen: boolean;
  onDismiss: () => void;
  onSave: (data: {
    ageRange: AgeRange | null;
    gender: Gender | null;
  }) => Promise<void>;
  initialAgeRange?: string | null;
  initialGender?: string | null;
}

export function SurveyModal({
  isOpen,
  onDismiss,
  onSave,
  initialAgeRange,
  initialGender,
}: SurveyModalProps) {
  const t = useTranslations();
  const locale = useLocale();
  const titleId = useId();
  const ageRangeLabelId = useId();
  const genderLabelId = useId();

  const [selectedAgeRange, setSelectedAgeRange] = useState<AgeRange | null>(
    (initialAgeRange as AgeRange) ?? null,
  );
  const [selectedGender, setSelectedGender] = useState<Gender | null>(
    (initialGender as Gender) ?? null,
  );
  const [isSaving, setIsSaving] = useState(false);

  // initialAgeRange / initialGender が変わったら同期
  useEffect(() => {
    setSelectedAgeRange((initialAgeRange as AgeRange) ?? null);
  }, [initialAgeRange]);

  useEffect(() => {
    setSelectedGender((initialGender as Gender) ?? null);
  }, [initialGender]);

  // モーダル表示中は背景スクロールを防止
  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape" && !isSaving) {
      onDismiss();
    }
  };

  const handleBackdropClick = () => {
    if (!isSaving) {
      onDismiss();
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave({
        ageRange: selectedAgeRange,
        gender: selectedGender,
      });
    } finally {
      setIsSaving(false);
    }
  };

  const ageRangeOptions = AGE_RANGE_OPTIONS.map((value) => ({
    value,
    label: t(`userInfoEdit.ageRangeOptions.${value}`),
  }));

  const genderOptions = GENDER_OPTIONS.map((value) => ({
    value,
    label: t(`userInfoEdit.genderOptions.${value}`),
  }));

  return createPortal(
    <div className={styles.overlay} role="presentation">
      <button
        type="button"
        className={styles.overlayDismiss}
        onClick={handleBackdropClick}
        aria-label={t("surveyModal.close")}
        disabled={isSaving}
      />
      <div
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        onKeyDown={handleKeyDown}
      >
        <button
          type="button"
          className={styles.closeButton}
          onClick={onDismiss}
          aria-label={t("surveyModal.close")}
          disabled={isSaving}
        >
          <X size={20} />
        </button>
        <h2 className={styles.title} id={titleId}>
          {t("surveyModal.title")}
        </h2>
        <p className={styles.description}>{t("surveyModal.description")}</p>

        <div className={styles.section}>
          <h3 className={styles.sectionLabel} id={ageRangeLabelId}>
            {t("surveyModal.ageRangeLabel")}
          </h3>
          <PillSelect
            options={ageRangeOptions}
            value={selectedAgeRange}
            onChange={setSelectedAgeRange}
            groupLabelId={ageRangeLabelId}
          />
        </div>

        <div className={styles.section}>
          <h3 className={styles.sectionLabel} id={genderLabelId}>
            {t("surveyModal.genderLabel")}
          </h3>
          <PillSelect
            options={genderOptions}
            value={selectedGender}
            onChange={setSelectedGender}
            groupLabelId={genderLabelId}
          />
        </div>

        <hr className={styles.divider} />

        <p className={styles.privacyNote}>
          {t.rich("surveyModal.privacyNote", {
            privacyPolicyLink: (chunks) => (
              <Link href={`/${locale}/privacy`} className={styles.privacyLink}>
                {chunks}
              </Link>
            ),
          })}
        </p>

        <div className={styles.actions}>
          <Button
            variant="secondary"
            size="medium"
            onClick={onDismiss}
            disabled={isSaving}
            className={styles.actionButton}
          >
            {t("surveyModal.close")}
          </Button>
          <Button
            variant="primary"
            size="medium"
            onClick={handleSave}
            disabled={isSaving}
            className={styles.actionButton}
          >
            {isSaving ? t("surveyModal.saving") : t("surveyModal.save")}
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

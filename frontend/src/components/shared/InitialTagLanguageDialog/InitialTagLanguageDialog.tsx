"use client";

import { useTranslations } from "next-intl";
import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/shared/Button/Button";
import type { TagLanguage } from "@/constants/tags";
import styles from "./InitialTagLanguageDialog.module.css";

interface InitialTagLanguageDialogProps {
  isOpen: boolean;
  onConfirm: (language: TagLanguage) => void;
  isProcessing: boolean;
}

export function InitialTagLanguageDialog({
  isOpen,
  onConfirm,
  isProcessing,
}: InitialTagLanguageDialogProps) {
  const [selectedLanguage, setSelectedLanguage] = useState<TagLanguage>("ja");
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const t = useTranslations("initialTagDialog");

  useEffect(() => {
    if (isOpen) {
      dialogRef.current?.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return createPortal(
    <div className={styles.overlay} role="presentation">
      <div
        ref={dialogRef}
        className={styles.modal}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
      >
        <h2 className={styles.title} id={titleId}>
          {t("title")}
        </h2>

        <div className={styles.optionList} role="radiogroup">
          <label className={styles.optionItem}>
            <input
              type="radio"
              name="tagLanguage"
              value="ja"
              checked={selectedLanguage === "ja"}
              onChange={() => setSelectedLanguage("ja")}
              className={styles.radio}
            />
            <span className={styles.optionText}>日本語</span>
          </label>
          <label className={styles.optionItem}>
            <input
              type="radio"
              name="tagLanguage"
              value="en"
              checked={selectedLanguage === "en"}
              onChange={() => setSelectedLanguage("en")}
              className={styles.radio}
            />
            <span className={styles.optionText}>English</span>
          </label>
        </div>

        <div className={styles.actions}>
          <Button
            variant="primary"
            size="medium"
            onClick={() => onConfirm(selectedLanguage)}
            disabled={isProcessing}
            className={styles.actionButton}
          >
            {isProcessing ? "..." : t("confirm")}
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

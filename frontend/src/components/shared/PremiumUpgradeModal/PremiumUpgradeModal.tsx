"use client";

import { useLocale, useTranslations } from "next-intl";
import {
  type KeyboardEvent,
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import styles from "./PremiumUpgradeModal.module.css";

interface PremiumUpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** 翻訳キーの namespace を切り替える（デフォルト: "premiumModal"） */
  translationKey?: string;
}

declare global {
  interface Window {
    __AIKINOTE_NATIVE_APP__?: boolean;
    showNativePaywall?: () => Promise<{ success: boolean; isPremium: boolean }>;
  }
}

export function PremiumUpgradeModal({
  isOpen,
  onClose,
  translationKey = "premiumModal",
}: PremiumUpgradeModalProps) {
  const t = useTranslations(translationKey);
  const locale = useLocale();
  const titleId = useId();
  const upgradeButtonRef = useRef<HTMLButtonElement>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (isOpen) {
      upgradeButtonRef.current?.focus();
    }
  }, [isOpen]);

  const handleUpgrade = useCallback(async () => {
    if (window.__AIKINOTE_NATIVE_APP__ && window.showNativePaywall) {
      setIsProcessing(true);
      try {
        const result = await window.showNativePaywall();
        if (result.success) {
          onClose();
          window.location.reload();
        }
      } finally {
        setIsProcessing(false);
      }
      return;
    }

    window.location.href = `/${locale}/settings/subscription`;
  }, [onClose, locale]);

  if (!isOpen) return null;

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape" && !isProcessing) {
      onClose();
    }
  };

  return createPortal(
    <div
      className={styles.overlay}
      onKeyDown={handleKeyDown}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
    >
      <div
        className={styles.modal}
        role="document"
        onKeyDown={(e) => e.stopPropagation()}
      >
        <span className={styles.badge}>{t("badge")}</span>
        <h2 id={titleId} className={styles.title}>
          {t("title")}
        </h2>
        <p className={styles.description}>{t("description")}</p>
        <button
          ref={upgradeButtonRef}
          type="button"
          className={styles.upgradeButton}
          onClick={handleUpgrade}
          disabled={isProcessing}
        >
          {isProcessing ? (
            t("processing")
          ) : (
            <>
              <span className={styles.upgradeButtonMain}>
                {t("upgradeMain")}
              </span>
              <span className={styles.upgradeButtonSub}>{t("upgradeSub")}</span>
            </>
          )}
        </button>
        <button
          type="button"
          className={styles.closeButton}
          onClick={onClose}
          disabled={isProcessing}
        >
          {t("close")}
        </button>
      </div>
    </div>,
    document.body,
  );
}

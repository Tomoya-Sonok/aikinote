"use client";

import { useLocale, useTranslations } from "next-intl";
import {
  type KeyboardEvent,
  useCallback,
  useEffect,
  useId,
  useRef,
} from "react";
import { createPortal } from "react-dom";
import { setReturnTo } from "@/lib/utils/returnTo";
import styles from "./SignupPromptModal.module.css";

interface SignupPromptModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SignupPromptModal({ isOpen, onClose }: SignupPromptModalProps) {
  const t = useTranslations("signupPromptModal");
  const locale = useLocale();
  const titleId = useId();
  const signupButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (isOpen) {
      signupButtonRef.current?.focus();
    }
  }, [isOpen]);

  const handleSignup = useCallback(() => {
    setReturnTo(window.location.pathname + window.location.search);
    window.location.href = `/${locale}/signup`;
  }, [locale]);

  const handleLogin = useCallback(() => {
    setReturnTo(window.location.pathname + window.location.search);
    window.location.href = `/${locale}/login`;
  }, [locale]);

  if (!isOpen) return null;

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape") {
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
        <img
          className={styles.logo}
          src="/images/shared/aikinote_logo.png"
          alt="AikiNote"
        />
        <h2 id={titleId} className={styles.title}>
          {t("title")}
        </h2>
        <p className={styles.description}>{t("description")}</p>
        <button
          ref={signupButtonRef}
          type="button"
          className={styles.signupButton}
          onClick={handleSignup}
        >
          <span className={styles.signupButtonMain}>{t("signupMain")}</span>
          <span className={styles.signupButtonSub}>{t("signupSub")}</span>
        </button>
        <button
          type="button"
          className={styles.loginButton}
          onClick={handleLogin}
        >
          {t("login")}
        </button>
        <button type="button" className={styles.closeButton} onClick={onClose}>
          {t("close")}
        </button>
      </div>
    </div>,
    document.body,
  );
}

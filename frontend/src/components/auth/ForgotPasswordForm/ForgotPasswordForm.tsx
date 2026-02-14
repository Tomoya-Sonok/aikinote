"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { useId, useState } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/atoms/Button/Button";
import { Loader } from "@/components/atoms/Loader";
import { useAuth } from "@/lib/hooks/useAuth";
import {
  type ResetPasswordFormData,
  resetPasswordSchema,
} from "@/lib/utils/validation";
import styles from "./ForgotPasswordForm.module.css";

interface ForgotPasswordFormProps {
  onSuccess?: () => void;
}

export function ForgotPasswordForm({ onSuccess }: ForgotPasswordFormProps) {
  const t = useTranslations();
  const locale = useLocale();
  const [isSubmitted, setIsSubmitted] = useState(false);
  const { forgotPassword, isProcessing, error, clearError } = useAuth();
  const emailId = useId();

  const {
    register,
    handleSubmit,
    formState: { errors },
    getValues,
  } = useForm<ResetPasswordFormData>({
    // biome-ignore lint/suspicious/noExplicitAny: library type mismatch
    resolver: zodResolver(resetPasswordSchema as any),
    mode: "onChange",
  });

  const handleForgotPassword = async (data: ResetPasswordFormData) => {
    try {
      await forgotPassword(data);
      setIsSubmitted(true);
      onSuccess?.();
    } catch (err) {
      console.error("Forgot password error:", err);
    }
  };

  const loginHref = `/${locale}/login`;

  if (isSubmitted) {
    return (
      <div className={styles.card}>
        <div className={styles.header}>
          <div className={styles.iconWrapper}>
            <svg
              className={styles.icon}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <title>{t("auth.emailSentIcon")}</title>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
              />
            </svg>
          </div>
          <h2 className={styles.title}>{t("auth.emailSent")}</h2>
          <p className={styles.description}>{t("auth.passwordResetSent")}</p>
          <p className={styles.successNote}>
            {t("auth.checkEmail")} {getValues("email")}
          </p>
          <p className={styles.successNote}>{t("auth.checkSpam")}</p>
        </div>

        <div className={styles.actions}>
          <Link href={loginHref} className={styles.linkButton}>
            {t("auth.backToLogin")}
          </Link>
          <Button
            variant="secondary"
            onClick={() => setIsSubmitted(false)}
            className={`${styles.button} ${styles.secondaryButton}`}
          >
            {t("auth.sendAgain")}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <h2 className={styles.title}>{t("auth.passwordReset")}</h2>
        <p className={styles.description}>
          {t("auth.passwordResetInstruction")}
        </p>
      </div>

      {error && <div className={styles.alertMessage}>{error}</div>}

      <form
        className={styles.form}
        onSubmit={handleSubmit(handleForgotPassword)}
      >
        <div className={styles.fieldGroup}>
          <label htmlFor={emailId} className={styles.fieldLabel}>
            {t("auth.email")}
          </label>
          <input
            {...register("email")}
            type="email"
            id={emailId}
            className={`${styles.inputField} ${
              errors.email ? styles.error : ""
            }`}
            placeholder="aaaa@example.com"
            onFocus={clearError}
          />
          {errors.email && (
            <p className={styles.errorMessage}>{errors.email.message}</p>
          )}
        </div>

        <Button
          type="submit"
          variant="primary"
          disabled={isProcessing}
          className={`${styles.button} ${styles.primaryButton}`}
        >
          {isProcessing ? (
            <Loader size="small" text={t("auth.sending")} />
          ) : (
            t("auth.sendResetEmail")
          )}
        </Button>
      </form>

      <Link href={loginHref} className={styles.link}>
        {t("auth.backToLogin")}
      </Link>
    </div>
  );
}

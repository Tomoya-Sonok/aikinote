"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useId, useState } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/atoms/Button/Button";
import { Loader } from "@/components/atoms/Loader";
import { useAuth } from "@/lib/hooks/useAuth";
import {
  type NewPasswordFormData,
  newPasswordSchema,
} from "@/lib/utils/validation";
import styles from "./ResetPasswordForm.module.css";

interface ResetPasswordFormProps {
  token: string;
  onSuccess?: () => void;
}

export function ResetPasswordForm({
  token,
  onSuccess,
}: ResetPasswordFormProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const { resetPassword, isProcessing, error, clearError } = useAuth();
  const router = useRouter();
  const locale = useLocale();
  const passwordId = useId();
  const confirmPasswordId = useId();
  const t = useTranslations();
  const loginHref = `/${locale}/login`;

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<NewPasswordFormData>({
    resolver: zodResolver(newPasswordSchema as any),
    mode: "onChange",
  });

  const handleResetPassword = async (data: NewPasswordFormData) => {
    try {
      await resetPassword(token, data);
      setIsSuccess(true);
      onSuccess?.();
    } catch (err) {
      console.error("Reset password error:", err);
    }
  };

  if (isSuccess) {
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
              <title>{t("auth.passwordChangeCompleteIcon")}</title>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          <h2 className={styles.title}>{t("auth.passwordChangeComplete")}</h2>
          <p className={styles.description}>
            {t("auth.passwordChangeSuccess")}
          </p>
        </div>

        <Button
          variant="primary"
          onClick={() => router.push(loginHref)}
          className={`${styles.button} ${styles.primaryButton}`}
        >
          {t("auth.goToLogin")}
        </Button>
      </div>
    );
  }

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <h2 className={styles.title}>{t("auth.setNewPasswordTitle")}</h2>
        <p className={styles.description}>{t("auth.enterNewPassword")}</p>
      </div>

      {error && <div className={styles.errorMessage}>{error}</div>}

      <form
        className={styles.form}
        onSubmit={handleSubmit(handleResetPassword)}
      >
        <div className={styles.fieldGroup}>
          <label htmlFor={passwordId} className={styles.fieldLabel}>
            {t("auth.newPassword")}
          </label>
          <div className={styles.inputContainer}>
            <input
              {...register("password")}
              type={showPassword ? "text" : "password"}
              id={passwordId}
              className={`${styles.inputField} ${
                errors.password ? styles.error : ""
              }`}
              placeholder={t("auth.newPasswordPlaceholder")}
              onFocus={clearError}
            />
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              className={styles.passwordToggle}
            >
              {showPassword ? t("auth.hide") : t("auth.show")}
            </button>
          </div>
          {errors.password && (
            <p className={styles.errorMessage}>{errors.password.message}</p>
          )}
          <p className={styles.helperText}>{t("auth.passwordRequirements")}</p>
        </div>

        <div className={styles.fieldGroup}>
          <label htmlFor={confirmPasswordId} className={styles.fieldLabel}>
            {t("auth.confirmPassword")}
          </label>
          <div className={styles.inputContainer}>
            <input
              {...register("confirmPassword")}
              type={showConfirmPassword ? "text" : "password"}
              id={confirmPasswordId}
              className={`${styles.inputField} ${
                errors.confirmPassword ? styles.error : ""
              }`}
              placeholder={t("auth.confirmPasswordPlaceholder")}
              onFocus={clearError}
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword((prev) => !prev)}
              className={styles.passwordToggle}
            >
              {showConfirmPassword ? t("auth.hide") : t("auth.show")}
            </button>
          </div>
          {errors.confirmPassword && (
            <p className={styles.errorMessage}>
              {errors.confirmPassword.message}
            </p>
          )}
        </div>

        <Button
          type="submit"
          variant="primary"
          disabled={isProcessing}
          className={`${styles.button} ${styles.primaryButton}`}
        >
          {isProcessing ? (
            <Loader size="small" text={t("auth.changing")} />
          ) : (
            t("auth.changePassword")
          )}
        </Button>
      </form>

      <Link href={loginHref} className={styles.link}>
        {t("auth.goToLogin")}
      </Link>
    </div>
  );
}

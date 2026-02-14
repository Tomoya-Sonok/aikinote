"use client";

import { useTranslations } from "next-intl";
import type { FormEvent } from "react";
import { useState } from "react";
import { Button } from "@/components/shared/Button/Button";
import { TextInput } from "@/components/shared/TextInput/TextInput";
import { MinimalLayout } from "@/components/shared/layouts/MinimalLayout";
import { useToast } from "@/contexts/ToastContext";
import { useAuth } from "@/lib/hooks/useAuth";
import styles from "./EmailSettingPage.module.css";

interface EmailSettingPageProps {
  locale: string;
}

type FormErrors = {
  newEmail?: string;
  currentPassword?: string;
  general?: string;
};

export function EmailSettingPage({ locale }: EmailSettingPageProps) {
  const t = useTranslations();
  const { showToast } = useToast();
  const { user } = useAuth();
  const [newEmail, setNewEmail] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pendingEmail, setPendingEmail] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setErrors({});
    setPendingEmail(null);
    setSuccessMessage(null);

    try {
      const response = await fetch("/api/auth/request-email-change", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          newEmail,
          currentPassword,
        }),
      });

      const result = await response.json().catch(() => null);

      if (!response.ok || !result?.success) {
        const details = result?.details as
          | Record<string, string[] | undefined>
          | undefined;
        const errorMessage =
          details?.general?.[0] ??
          result?.error ??
          t("emailChange.requestFailed");

        setErrors({
          newEmail: details?.newEmail?.[0],
          currentPassword: details?.currentPassword?.[0],
          general: errorMessage,
        });
        showToast(errorMessage, "error");
        return;
      }

      setCurrentPassword("");
      setPendingEmail(result?.data?.pendingEmail ?? newEmail);
      setSuccessMessage(t("emailChange.requestSuccess"));
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : t("emailChange.requestFailed");
      setErrors({ general: errorMessage });
      showToast(errorMessage, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <MinimalLayout
      headerTitle={t("emailChange.title")}
      backHref={`/${locale}/personal/pages`}
    >
      <div className={styles.container}>
        <div className={styles.card}>
          <p className={styles.description}>{t("emailChange.description")}</p>

          <div className={styles.currentEmail}>
            <span className={styles.label}>
              {t("emailChange.currentEmail")}
            </span>
            <span className={styles.value}>{user?.email ?? "-"}</span>
          </div>

          {pendingEmail && (
            <div className={styles.pendingBox}>
              <div className={styles.pendingHeader}>
                <span className={styles.pendingLabel}>
                  {t("emailChange.pendingLabel")}
                </span>
                <span className={styles.pendingValue}>{pendingEmail}</span>
                {successMessage && (
                  <span className={styles.pendingStatus}>{successMessage}</span>
                )}
              </div>
            </div>
          )}

          {!pendingEmail && (
            <form className={styles.form} onSubmit={handleSubmit}>
              <TextInput
                label={t("emailChange.newEmail")}
                type="email"
                required
                value={newEmail}
                onChange={(event) => {
                  setNewEmail(event.target.value);
                  setErrors((prev) => ({
                    ...prev,
                    newEmail: undefined,
                    general: undefined,
                  }));
                  setSuccessMessage(null);
                }}
                autoComplete="email"
                error={errors.newEmail}
              />
              <TextInput
                label={t("emailChange.currentPassword")}
                type="password"
                required
                value={currentPassword}
                onChange={(event) => {
                  setCurrentPassword(event.target.value);
                  setErrors((prev) => ({
                    ...prev,
                    currentPassword: undefined,
                    general: undefined,
                  }));
                  setSuccessMessage(null);
                }}
                autoComplete="current-password"
                error={errors.currentPassword}
              />

              {errors.general && (
                <p className={styles.errorMessage}>{errors.general}</p>
              )}

              <Button
                type="submit"
                variant="primary"
                disabled={isSubmitting}
                className={styles.submitButton}
              >
                {isSubmitting
                  ? t("emailChange.submitting")
                  : t("emailChange.submit")}
              </Button>
            </form>
          )}
        </div>
      </div>
    </MinimalLayout>
  );
}

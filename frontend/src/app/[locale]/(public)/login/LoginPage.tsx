"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useId, useState } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/atoms/Button/Button";
import { Loader } from "@/components/atoms/Loader";
import { useAuth } from "@/lib/hooks/useAuth";
import {
  createSignInSchema,
  type SignInFormData,
} from "@/lib/utils/validation";
import styles from "./page.module.css";

interface LoginPageProps {
  locale?: string;
  onSuccess?: () => void;
}

export function LoginPage({ locale, onSuccess }: LoginPageProps) {
  const t = useTranslations();
  const resolvedLocale = locale ?? "ja";
  const emailId = useId();
  const passwordId = useId();
  const [showPassword, setShowPassword] = useState(false);

  const {
    signInWithCredentials,
    signInWithGoogle,
    isProcessing,
    error,
    clearError,
  } = useAuth();

  const form = useForm<SignInFormData>({
    resolver: zodResolver(createSignInSchema(t) as any),
    mode: "onChange",
  });

  const handleLoginSubmit = async (data: SignInFormData) => {
    try {
      await signInWithCredentials(data);
      onSuccess?.();
    } catch (err) {
      console.error("Sign in error:", err);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      await signInWithGoogle();
      onSuccess?.();
    } catch (err) {
      console.error("Google sign in error:", err);
    }
  };

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>{t("auth.login")}</h1>

      <div className={styles.formCard}>
        {error && <div className={styles.errorMessage}>{error}</div>}

        <div className={styles.contentsWrapper}>
          <form className={styles.form}>
            <div className={styles.fieldGroup}>
              <label htmlFor={emailId} className={styles.fieldLabel}>
                {t("auth.email")}
              </label>
              <div className={styles.inputContainer}>
                <input
                  {...form.register("email")}
                  type="email"
                  id={emailId}
                  className={`${styles.inputField} ${
                    form.formState.errors.email ? styles.error : ""
                  }`}
                  placeholder="aaaa@example.com"
                  onFocus={clearError}
                />
              </div>
              {form.formState.errors.email && (
                <p className={styles.errorMessage}>
                  {form.formState.errors.email.message}
                </p>
              )}
            </div>

            <div className={styles.fieldGroup}>
              <label htmlFor={passwordId} className={styles.fieldLabel}>
                {t("auth.password")}
              </label>
              <div className={styles.inputContainer}>
                <input
                  {...form.register("password")}
                  type={showPassword ? "text" : "password"}
                  id={passwordId}
                  className={`${styles.inputField} ${
                    form.formState.errors.password ? styles.error : ""
                  }`}
                  placeholder={t("auth.passwordPlaceholder")}
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
              {form.formState.errors.password && (
                <p className={styles.errorMessage}>
                  {form.formState.errors.password.message}
                </p>
              )}
            </div>

            <div className={styles.buttonContainer}>
              <Button
                variant="primary"
                onClick={form.handleSubmit(handleLoginSubmit)}
                disabled={isProcessing}
                className={`${styles.button} ${styles.primaryButton}`}
              >
                {isProcessing ? (
                  <Loader size="small" text={t("auth.loginInProgress")} />
                ) : (
                  t("auth.loginButton")
                )}
              </Button>
            </div>
          </form>

          <Link
            href={`/${resolvedLocale}/forgot-password`}
            className={styles.forgotPasswordLink}
          >
            {t("auth.forgotPassword")}
          </Link>

          <div className={styles.otherActions}>
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={isProcessing}
              className={styles.googleButton}
            >
              <svg className={styles.googleIcon} viewBox="0 0 24 24">
                <title>{t("auth.googleIcon")}</title>
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              {t("auth.googleLogin")}
            </button>

            <div className={styles.signupPrompt}>
              <span className={styles.signupPromptText}>
                {t("auth.noAccountYet")}{" "}
                <Link
                  href={`/${resolvedLocale}/signup`}
                  className={styles.signupLink}
                >
                  {t("auth.signup")}
                </Link>
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

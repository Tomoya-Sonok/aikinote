"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useEffect, useId, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/shared/Button/Button";
import { Loader } from "@/components/shared/Loader";
import { useAuth } from "@/lib/hooks/useAuth";
import { useUmamiTrack } from "@/lib/hooks/useUmamiTrack";
import {
  createSignInSchema,
  type SignInFormData,
} from "@/lib/utils/validation";
import styles from "./page.module.css";

interface LoginProps {
  locale?: string;
  onSuccess?: () => void;
}

export function Login({ locale, onSuccess }: LoginProps) {
  const t = useTranslations();
  const resolvedLocale = locale ?? "ja";
  const emailId = useId();
  const passwordId = useId();
  const [showPassword, setShowPassword] = useState(false);
  const [showEmailForm, setShowEmailForm] = useState(false);
  const emailInputRef = useRef<HTMLInputElement>(null);
  const { track } = useUmamiTrack();

  const {
    signInWithCredentials,
    signInWithGoogle,
    signInWithApple,
    isProcessing,
    error,
    clearError,
  } = useAuth();

  const form = useForm<SignInFormData>({
    resolver: zodResolver(createSignInSchema(t) as any),
    mode: "onChange",
  });

  useEffect(() => {
    if (showEmailForm) {
      emailInputRef.current?.focus();
    }
  }, [showEmailForm]);

  const handleLoginSubmit = async (data: SignInFormData) => {
    track("login_submit", { method: "email" });
    try {
      await signInWithCredentials(data);
      onSuccess?.();
    } catch (err) {
      console.error("Sign in error:", err);
    }
  };

  const handleGoogleSignIn = async () => {
    track("login_submit", { method: "google" });
    try {
      await signInWithGoogle();
      onSuccess?.();
    } catch (err) {
      console.error("Google sign in error:", err);
    }
  };

  const handleAppleSignIn = async () => {
    track("login_submit", { method: "apple" });
    try {
      await signInWithApple();
      onSuccess?.();
    } catch (err) {
      console.error("Apple sign in error:", err);
    }
  };

  const { ref: emailFormRef, ...emailRegister } = form.register("email");

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>{t("auth.login")}</h1>
      <p className={styles.subtitle}>{t("auth.loginSubtitle")}</p>

      {error && (
        <div className={styles.errorCard}>
          <div className={styles.errorMessage}>{error}</div>
        </div>
      )}

      {/* ソーシャルログインボタン */}
      <div className={styles.socialButtons}>
        <button
          type="button"
          onClick={handleAppleSignIn}
          disabled={isProcessing}
          className={`${styles.appleButton} ${styles.appleButtonActive}`}
          aria-label={t("auth.appleLogin")}
        >
          <svg className={styles.appleIcon} viewBox="0 0 24 24">
            <title>{t("auth.appleIcon")}</title>
            <path
              fill="currentColor"
              d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"
            />
          </svg>
          {t("auth.appleLogin")}
        </button>

        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={isProcessing}
          className={styles.googleButton}
          aria-label={t("auth.googleLogin")}
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
      </div>

      {/* 区切り線 */}
      <div className={styles.divider}>
        <span className={styles.dividerLine} />
        <span className={styles.dividerText}>{t("auth.or")}</span>
        <span className={styles.dividerLine} />
      </div>

      {/* メールログインセクション（折りたたみ式） */}
      {!showEmailForm ? (
        <button
          type="button"
          className={styles.emailToggleButton}
          onClick={() => setShowEmailForm(true)}
          aria-expanded="false"
        >
          {t("auth.loginWithEmail")} →
        </button>
      ) : (
        <div className={styles.emailFormCard}>
          <form className={styles.form}>
            <div className={styles.fieldGroup}>
              <label htmlFor={emailId} className={styles.fieldLabel}>
                {t("auth.email")}
              </label>
              <div className={styles.inputContainer}>
                <input
                  {...emailRegister}
                  ref={(e) => {
                    emailFormRef(e);
                    (
                      emailInputRef as React.MutableRefObject<HTMLInputElement | null>
                    ).current = e;
                  }}
                  type="email"
                  id={emailId}
                  className={`${styles.inputField} ${
                    form.formState.errors.email ? styles.error : ""
                  }`}
                  placeholder="aikinote@example.com"
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

            <Button
              variant="primary"
              onClick={form.handleSubmit(handleLoginSubmit)}
              disabled={
                isProcessing || !form.watch("email") || !form.watch("password")
              }
              aria-disabled={!form.watch("email") || !form.watch("password")}
              className={`${styles.button} ${styles.emailSubmitButton}`}
            >
              {isProcessing ? (
                <Loader size="xs" text={t("auth.loginInProgress")} />
              ) : (
                t("auth.loginButton")
              )}
            </Button>

            <Link
              href={`/${resolvedLocale}/forgot-password`}
              className={styles.forgotPasswordLink}
            >
              {t("auth.forgotPassword")}
            </Link>
          </form>
        </div>
      )}

      {/* 新規登録リンク */}
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
  );
}

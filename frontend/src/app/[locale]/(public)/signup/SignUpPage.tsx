"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useId, useState } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/shared/Button/Button";
import { Loader } from "@/components/shared/Loader";
import { EmailVerificationWaitingForm } from "@/components/features/auth/EmailVerificationWaitingForm";
import { useAuth } from "@/lib/hooks/useAuth";
import { generateUsernameFromEmail } from "@/lib/utils/auth-client";
import {
  createEmailPasswordSchema,
  createUsernameSchema,
  type EmailPasswordFormData,
  type UsernameFormData,
} from "@/lib/utils/validation";
import styles from "./page.module.css";

interface SignUpPageProps {
  locale?: string;
  onSuccess?: () => void;
}

export function SignUpPage({ locale, onSuccess }: SignUpPageProps) {
  const [step, setStep] = useState<"email-password" | "username">(
    "email-password",
  );
  const usernameId = useId();
  const emailId = useId();
  const passwordId = useId();
  const t = useTranslations();
  const resolvedLocale = locale ?? "ja";

  const [emailPasswordData, setEmailPasswordData] = useState<{
    email: string;
    password: string;
  } | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const { signUp, signInWithGoogle, isProcessing, error, clearError } =
    useAuth();

  const emailPasswordForm = useForm<EmailPasswordFormData>({
    resolver: zodResolver(createEmailPasswordSchema(t) as any),
    mode: "onChange",
  });

  const usernameForm = useForm<UsernameFormData>({
    resolver: zodResolver(createUsernameSchema(t) as any),
    mode: "onChange",
  });

  const handleEmailPasswordSubmit = async (data: EmailPasswordFormData) => {
    setEmailPasswordData(data);
    usernameForm.setValue("username", generateUsernameFromEmail(data.email));
    setStep("username");
    clearError();
  };

  const handleUsernameSubmit = async (data: UsernameFormData) => {
    if (!emailPasswordData) {
      console.error("No email/password data available!");
      return;
    }

    try {
      const result = await signUp({
        email: emailPasswordData.email,
        password: emailPasswordData.password,
        username: data.username,
      });
      setSuccessMessage(result.message);
      onSuccess?.();
    } catch (err) {
      console.error("Sign up error:", err);
    }
  };

  const handleBack = () => {
    setStep("email-password");
    setEmailPasswordData(null);
    clearError();
  };

  const handleGoogleSignUp = async () => {
    try {
      await signInWithGoogle();
    } catch (err) {
      console.error("Google sign up error:", err);
    }
  };

  const renderEmailPasswordStep = () => (
    <div className={styles.container}>
      <h1 className={styles.title}>{t("auth.signup")}</h1>

      <div className={styles.formCard}>
        <div className={styles.stepContainer}>
          <div className={styles.stepInfo}>
            <div className={styles.stepHeader}>
              <span className={styles.stepText}>{t("auth.step1of4")}</span>
            </div>
            <div className={styles.progressContainer}>
              <div
                className={`${styles.progressBar} ${styles.progressStep1}`}
              />
            </div>
          </div>
          <div className={styles.stepDots}>
            <div className={`${styles.stepDot} ${styles.stepDotActive}`} />
            <div className={styles.stepDot} />
            <div className={styles.stepDot} />
            <div className={styles.stepDot} />
          </div>
        </div>

        {error && <div className={styles.errorMessage}>{error}</div>}

        <div className={styles.contentsWrapper}>
          <form className={styles.form}>
            <div className={styles.fieldGroup}>
              <label htmlFor={emailId} className={styles.fieldLabel}>
                {t("auth.email")}
              </label>
              <div className={styles.inputContainer}>
                <input
                  {...emailPasswordForm.register("email")}
                  type="email"
                  id={emailId}
                  className={`${styles.inputField} ${
                    emailPasswordForm.formState.errors.email ? styles.error : ""
                  }`}
                  placeholder="aaaa@example.com"
                />
              </div>
              {emailPasswordForm.formState.errors.email && (
                <p className={styles.errorMessage}>
                  {emailPasswordForm.formState.errors.email.message}
                </p>
              )}
            </div>

            <div className={styles.fieldGroup}>
              <label htmlFor={passwordId} className={styles.fieldLabel}>
                {t("auth.password")}
              </label>
              <div className={styles.inputContainer}>
                <input
                  {...emailPasswordForm.register("password")}
                  type={showPassword ? "text" : "password"}
                  id={passwordId}
                  className={`${styles.inputField} ${
                    emailPasswordForm.formState.errors.password
                      ? styles.error
                      : ""
                  }`}
                  placeholder="Password123!"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className={styles.passwordToggle}
                >
                  {showPassword ? t("auth.hide") : t("auth.show")}
                </button>
              </div>
              {emailPasswordForm.formState.errors.password && (
                <p className={styles.errorMessage}>
                  {emailPasswordForm.formState.errors.password.message}
                </p>
              )}
              <p className={styles.helpText}>
                {t("auth.passwordRequirements")}
              </p>
            </div>

            <Button
              variant="primary"
              onClick={emailPasswordForm.handleSubmit(
                handleEmailPasswordSubmit,
                (errors) => {
                  console.log(
                    "=== Form submitted with VALIDATION ERRORS ===",
                    errors,
                  );
                },
              )}
              disabled={isProcessing}
              className={`${styles.button} ${styles.primaryButton}`}
            >
              {isProcessing ? (
                <Loader size="small" text={t("auth.processing")} />
              ) : (
                t("auth.next")
              )}
            </Button>
          </form>

          <div className={styles.otherActions}>
            <button
              type="button"
              onClick={handleGoogleSignUp}
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
              {t("auth.signUpWithGoogle")}
            </button>

            <div className={styles.loginPrompt}>
              <span className={styles.loginPromptText}>
                {t("auth.alreadyHaveAccount")}{" "}
                <Link
                  href={`/${resolvedLocale}/login`}
                  className={styles.loginLink}
                >
                  {t("auth.login")}
                </Link>
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderUsernameStep = () => (
    <div className={styles.container}>
      <h1 className={styles.title}>{t("auth.signup")}</h1>

      <div className={styles.formCard}>
        <div className={styles.stepContainer}>
          <div className={styles.stepInfo}>
            <div className={styles.stepHeader}>
              <span className={styles.stepText}>{t("auth.step2of4")}</span>
            </div>
            <div className={styles.progressContainer}>
              <div
                className={`${styles.progressBar} ${styles.progressStep2}`}
              />
            </div>
          </div>
          <div className={styles.stepDots}>
            <div className={`${styles.stepDot} ${styles.stepDotActive}`} />
            <div className={`${styles.stepDot} ${styles.stepDotActive}`} />
            <div className={styles.stepDot} />
            <div className={styles.stepDot} />
          </div>
        </div>

        {error && <div className={styles.errorMessage}>{error}</div>}

        <div className={styles.contentsWrapper}>
          <form className={styles.form}>
            <div className={styles.fieldGroup}>
              <div className={styles.inputContainer}>
                <label htmlFor={usernameId} className={styles.fieldLabel}>
                  {t("auth.username")}
                </label>
                <input
                  {...usernameForm.register("username")}
                  type="text"
                  id={usernameId}
                  className={`${styles.inputField} ${
                    usernameForm.formState.errors.username ? styles.error : ""
                  }`}
                  placeholder="test_user"
                />
              </div>
              {usernameForm.formState.errors.username && (
                <p className={styles.errorMessage}>
                  {usernameForm.formState.errors.username.message}
                </p>
              )}
              <p className={styles.helpText}>{t("auth.usernameChangeNote")}</p>
            </div>

            <div className={styles.buttonContainer}>
              <Button variant="secondary" onClick={handleBack}>
                {t("auth.back")}
              </Button>
              <Button
                variant="primary"
                onClick={usernameForm.handleSubmit(handleUsernameSubmit)}
                disabled={isProcessing}
              >
                {isProcessing ? (
                  <Loader size="small" text={t("auth.creating")} />
                ) : (
                  t("auth.next")
                )}
              </Button>
            </div>
          </form>

          <div className={styles.loginPrompt}>
            <span className={styles.loginPromptText}>
              {t("auth.alreadyHaveAccount")}{" "}
              <Link
                href={`/${resolvedLocale}/login`}
                className={styles.loginLink}
              >
                {t("auth.login")}
              </Link>
            </span>
          </div>
        </div>
      </div>
    </div>
  );

  if (successMessage) {
    return <EmailVerificationWaitingForm />;
  }

  if (step === "email-password") {
    return renderEmailPasswordStep();
  }

  return renderUsernameStep();
}

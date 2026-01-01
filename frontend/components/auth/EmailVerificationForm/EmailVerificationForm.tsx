"use client";

import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/hooks/useAuth";
import styles from "./EmailVerificationForm.module.css";

interface EmailVerificationFormProps {
  token: string;
  onSuccess?: () => void;
  onError?: (error: string) => void;
}

export function EmailVerificationForm({
  token,
  onSuccess,
  onError,
}: EmailVerificationFormProps) {
  const [verificationStatus, setVerificationStatus] = useState<
    "loading" | "success" | "error"
  >("loading");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [debugDetails, setDebugDetails] = useState<Record<string, string>>({});
  const { verifyEmail } = useAuth();
  const t = useTranslations();
  const locale = useLocale();
  const homeHref = `/${locale}/personal/pages`;
  const loginHref = `/${locale}/login`;
  const signupHref = `/${locale}/signup`;
  const debugEntries = Object.entries(debugDetails);

  const buildDebugDetails = (error: unknown, currentToken?: string) => {
    const details: Record<string, string> = {
      timestamp: new Date().toISOString(),
      locale,
      token: currentToken || "(missing)",
      tokenLength: currentToken ? String(currentToken.length) : "0",
      tokenPrefix: currentToken ? currentToken.slice(0, 8) : "-",
      tokenSuffix: currentToken ? currentToken.slice(-8) : "-",
      currentUrl:
        typeof window !== "undefined" ? window.location.href : "unknown",
      userAgent:
        typeof navigator !== "undefined" ? navigator.userAgent : "unknown",
      isSecureContext:
        typeof window !== "undefined" ? String(window.isSecureContext) : "false",
      apiBaseUrl: process.env.NEXT_PUBLIC_API_URL || "(not set)",
      errorType: typeof error,
    };

    if (error instanceof Error) {
      details.errorName = error.name;
      details.errorMessage = error.message;
      if (error.stack) {
        details.errorStack = error.stack;
      }
      if ("cause" in error && error.cause) {
        details.errorCause =
          typeof error.cause === "string"
            ? error.cause
            : JSON.stringify(error.cause);
      }
    }

    return details;
  };

  useEffect(() => {
    const performVerification = async () => {
      try {
        await verifyEmail(token);
        setVerificationStatus("success");
        onSuccess?.();
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : t("auth.emailVerificationFailed");
        setErrorMessage(message);
        setDebugDetails(buildDebugDetails(err, token));
        setVerificationStatus("error");
        onError?.(message);
      }
    };

    if (token && verificationStatus === "loading") {
      void performVerification();
    } else if (!token) {
      setErrorMessage(t("auth.verificationTokenInvalid"));
      setDebugDetails(
        buildDebugDetails(new Error(t("auth.verificationTokenInvalid")), token),
      );
      setVerificationStatus("error");
    }
  }, [token, verifyEmail, onSuccess, onError, verificationStatus, t, locale]);

  if (verificationStatus === "loading") {
    return (
      <div className={styles.container}>
        <h1 className={styles.title}>{t("auth.signup")}</h1>

        <div className={styles.formCard}>
          <div className={styles.stepContainer}>
            <div className={styles.stepInfo}>
              <div className={styles.stepHeader}>
                <span className={styles.stepText}>{t("auth.signupStep3")}</span>
              </div>
              <div className={styles.progressContainer}>
                <div
                  className={`${styles.progressBar} ${styles.progressStep3}`}
                />
              </div>
            </div>
            <div className={styles.stepDots}>
              <div className={styles.stepDot} />
              <div className={styles.stepDot} />
              <div className={styles.stepDot} />
              <div className={`${styles.stepDot} ${styles.stepDotInactive}`} />
            </div>
          </div>
          <h2 className={styles.loadingTitle}>
            {t("auth.emailVerificationInProgress")}
          </h2>
          <p className={styles.loadingMessage}>
            {t("auth.emailVerificationProcessing")}
          </p>
          <div className={styles.loadingSpinner} />
        </div>
      </div>
    );
  }

  if (verificationStatus === "success") {
    return (
      <div className={styles.container}>
        <h1 className={styles.title}>{t("auth.signup")}</h1>

        <div className={styles.formCard}>
          <div className={styles.stepContainer}>
            <div className={styles.stepInfo}>
              <div className={styles.stepHeader}>
                <span className={styles.stepText}>{t("auth.signupStep4")}</span>
              </div>
              <div className={styles.progressContainer}>
                <div
                  className={`${styles.progressBar} ${styles.progressStep4}`}
                />
              </div>
            </div>
            <div className={styles.stepDots}>
              <div className={`${styles.stepDot} ${styles.stepDotActive}`} />
              <div className={`${styles.stepDot} ${styles.stepDotActive}`} />
              <div className={`${styles.stepDot} ${styles.stepDotActive}`} />
              <div className={`${styles.stepDot} ${styles.stepDotActive}`} />
            </div>
          </div>

          <div className={styles.successContainer}>
            <div className={styles.successTextContainer}>
              <div className={styles.stepText}>
                {t("auth.emailVerificationComplete")}
              </div>
              <p className={styles.completionMessage}>
                {t("auth.signupComplete")}
              </p>
            </div>
            <Link
              role="button"
              href={homeHref}
              className={`${styles.button} ${styles.primaryButton}`}
            >
              {t("auth.startAikiNote")}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>{t("auth.signup")}</h1>

      <div className={styles.formCard}>
        <div className={styles.stepContainer}>
          <div className={styles.stepInfo}>
            <div className={styles.stepHeader}>
              <span className={styles.stepText}>{t("auth.step3of4")}</span>
            </div>
            <div className={styles.progressContainer}>
              <div
                className={`${styles.progressBar} ${styles.progressStep3}`}
              />
            </div>
          </div>
          <div className={styles.stepDots}>
            <div className={styles.stepDot} />
            <div className={styles.stepDot} />
            <div className={styles.stepDot} />
            <div className={`${styles.stepDot} ${styles.stepDotInactive}`} />
          </div>
        </div>
        <div className={styles.errorContentsWrapper}>
          <h2 className={styles.errorTitle}>{t("auth.verificationFailed")}</h2>
          {errorMessage && (
            <div className={styles.debugInfo}>
              <p className={styles.debugInfoTitle}>Debug info</p>
              <p className={styles.debugInfoMessage}>{errorMessage}</p>
              {debugEntries.length > 0 && (
                <ul className={styles.debugInfoList}>
                  {debugEntries.map(([key, value]) => (
                    <li key={key} className={styles.debugInfoItem}>
                      <span className={styles.debugInfoKey}>{key}</span>
                      <span className={styles.debugInfoValue}>{value}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
          <div className={styles.errorDetails}>
            <p className={styles.errorDetailsTitle}>
              {t("auth.verificationFailedReasons")}
            </p>
            <ul className={styles.errorDetailsList}>
              <li className={styles.errorDetailsItem}>
                {t("auth.expiredLink")}
              </li>
              <li className={styles.errorDetailsItem}>
                {t("auth.alreadyVerified")}
              </li>
              <li className={styles.errorDetailsItem}>
                {t("auth.invalidToken")}
              </li>
            </ul>
          </div>
        </div>

        <div className={styles.buttonContainer}>
          <Link
            href={signupHref}
            className={`${styles.button} ${styles.primaryButton}`}
          >
            {t("auth.retrySignup")}
          </Link>
          <Link
            href={loginHref}
            className={`${styles.button} ${styles.secondaryButton}`}
          >
            {t("auth.goToLogin")}
          </Link>
        </div>
      </div>
    </div>
  );
}

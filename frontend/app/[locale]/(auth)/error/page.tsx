import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { MinimalLayout } from "@/components/layouts/MinimalLayout";
import { buildMetadata } from "@/lib/metadata";
import { getCurrentUser } from "@/lib/server/auth";
import styles from "./page.module.css";

export async function generateMetadata({
  params: { locale },
}: {
  params: { locale: string };
}): Promise<Metadata> {
  const t = await getTranslations({ locale, namespace: "auth" });
  return buildMetadata({
    title: t("authErrorTitle"),
    description: t("authErrorDescription"),
  });
}

export default async function AuthErrorPage({
  params: { locale },
  searchParams,
}: {
  params: { locale: string };
  searchParams: { error?: string };
}) {
  const user = await getCurrentUser();

  if (user) {
    redirect(`/${locale}/personal/pages`);
  }

  const t = await getTranslations({ locale, namespace: "auth" });
  const error = searchParams.error;
  const loginHref = `/${locale}/login`;
  const signupHref = `/${locale}/signup`;

  const getErrorMessage = (errorCode?: string) => {
    switch (errorCode) {
      case "Configuration":
        return t("configurationError");
      case "AccessDenied":
        return t("accessDeniedError");
      case "Verification":
        return t("verificationError");
      default:
        return t("generalAuthError");
    }
  };

  return (
    <MinimalLayout headerTitle={t("authError")} backHref={loginHref}>
      <div className={styles.container}>
        <h1 className={styles.title}>{t("authError")}</h1>

        <div className={styles.formCard}>
          <div className={styles.errorIcon}>
            <svg
              width="48"
              height="48"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <title>{t("authErrorIcon")}</title>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L5.351 16.5c-.77.833.192 2.5 1.732 2.5z"
              />
            </svg>
          </div>
          <h2 className={styles.errorTitle}>{t("authError")}</h2>
          <p className={styles.errorMessage}>{getErrorMessage(error)}</p>

          {error && (
            <div className={styles.errorCode}>
              <p className={styles.errorCodeText}>
                {t("errorCode")} {error}
              </p>
            </div>
          )}

          <div className={styles.buttonContainer}>
            <Link
              href={loginHref}
              className={`${styles.button} ${styles.primaryButton}`}
            >
              {t("backToLogin")}
            </Link>
            <Link
              href={signupHref}
              className={`${styles.button} ${styles.secondaryButton}`}
            >
              {t("signup")}
            </Link>
          </div>
        </div>
      </div>
    </MinimalLayout>
  );
}

import { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { Loader } from "@/components/atoms/Loader";
import { EmailVerificationForm } from "@/components/auth/EmailVerificationForm";
import { MinimalLayout } from "@/components/layouts/MinimalLayout";
import { buildMetadata } from "@/lib/metadata";
import { getCurrentUser } from "@/lib/server/auth";
import styles from "./page.module.css";

interface VerifyEmailPageProps {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({
  params,
}: VerifyEmailPageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "auth" });
  return buildMetadata({
    title: t("emailVerification"),
    description: t("emailVerificationDescription"),
  });
}

async function EmailVerificationContent({
  searchParams,
  locale,
}: {
  searchParams: { token?: string; locale?: string };
  locale: string;
}) {
  const token = searchParams.token;
  const resolvedLocale = locale;
  const t = await getTranslations({
    locale: resolvedLocale,
    namespace: "auth",
  });

  if (!token) {
    return (
      <div className={styles.container}>
        <h1 className={styles.title}>{t("signup")}</h1>

        <div className={styles.formCard}>
          <div className={styles.stepContainer}>
            <div className={styles.stepInfo}>
              <div className={styles.stepHeader}>
                <span className={styles.stepText}>{t("step3of4")}</span>
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
          <div className={styles.loginPrompt}>
            <span className={styles.loginPromptText}>
              {t("tokenNotFound")}
              <Link
                href={`/${resolvedLocale}/signup`}
                className={styles.loginLink}
              >
                {t("retrySignup")}
              </Link>
            </span>
          </div>
        </div>
      </div>
    );
  }

  return <EmailVerificationForm key={token} token={token} />;
}

export default async function VerifyEmailPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ token?: string; locale?: string }>;
}) {
  const [{ locale }, resolvedSearchParams] = await Promise.all([
    params,
    searchParams,
  ]);
  const user = await getCurrentUser();

  if (user) {
    redirect(`/${locale}/personal/pages`);
  }

  const t = await getTranslations({
    locale,
    namespace: "auth",
  });
  const signupHref = `/${locale}/signup`;

  return (
    <MinimalLayout headerTitle={t("emailVerification")} backHref={signupHref}>
      <Suspense fallback={<Loader size="large" centered text={t("loading")} />}>
        <EmailVerificationContent
          searchParams={{ ...resolvedSearchParams, locale }}
          locale={locale}
        />
      </Suspense>
    </MinimalLayout>
  );
}

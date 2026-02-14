import { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { Loader } from "@/components/shared/Loader";
import { ResetPasswordForm } from "@/components/features/auth/ResetPasswordForm";
import { NotLoggedInLayout } from "@/components/shared/layouts/NotLoggedInLayout";
import { buildMetadata } from "@/lib/metadata";
import { getCurrentUser } from "@/lib/server/auth";
import styles from "./page.module.css";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale });
  return buildMetadata({
    title: t("auth.newPasswordTitle"),
    description: t("auth.newPasswordDescription"),
  });
}

async function ResetPasswordContent({
  searchParams,
  locale,
}: {
  searchParams: { token?: string };
  locale: string;
}) {
  const token = searchParams.token;
  const t = await getTranslations({ locale });

  if (!token) {
    const forgotHref = `/${locale}/forgot-password`;
    return (
      <div className={styles.formCard}>
        <div className={`${styles.iconWrapper} ${styles.errorIconWrapper}`}>
          <svg
            className={styles.icon}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            role="img"
            aria-label={t("auth.authErrorIcon")}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L5.351 16.5c-.77.833.192 2.5 1.732 2.5z"
            />
          </svg>
        </div>
        <h2 className={styles.errorTitle}>{t("auth.invalidLink")}</h2>
        <p className={styles.infoText}>{t("auth.invalidTokenMessage")}</p>
        <Link href={forgotHref} className={styles.linkButton}>
          {t("auth.retryPasswordReset")}
        </Link>
      </div>
    );
  }

  return <ResetPasswordForm token={token} />;
}

export default async function ResetPasswordPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ token?: string }>;
}) {
  const [{ locale }, resolvedSearchParams] = await Promise.all([
    params,
    searchParams,
  ]);
  const user = await getCurrentUser();

  if (user) {
    redirect(`/${locale}/personal/pages`);
  }

  const t = await getTranslations({ locale });

  return (
    <NotLoggedInLayout>
      <div className={styles.container}>
        <h1 className={styles.title}>{t("auth.serviceName")}</h1>
        <p className={styles.subtitle}>{t("auth.setNewPassword")}</p>
        <Suspense
          fallback={
            <div className={styles.formCard}>
              <Loader size="large" centered text={t("auth.loading")} />
            </div>
          }
        >
          <ResetPasswordContent
            searchParams={resolvedSearchParams}
            locale={locale}
          />
        </Suspense>
      </div>
    </NotLoggedInLayout>
  );
}

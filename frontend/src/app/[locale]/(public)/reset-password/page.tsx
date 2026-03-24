import { WarningCircle } from "@phosphor-icons/react/dist/ssr";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { ResetPasswordForm } from "@/components/features/auth/ResetPasswordForm";
import { Loader } from "@/components/shared/Loader";
import { MinimalLayout } from "@/components/shared/layouts/MinimalLayout";
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
        <div className={styles.errorIconWrapper}>
          <WarningCircle size={32} weight="light" aria-hidden="true" />
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
  const loginHref = `/${locale}/login`;

  return (
    <MinimalLayout
      headerTitle={t("auth.newPasswordTitle")}
      backHref={loginHref}
    >
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
    </MinimalLayout>
  );
}

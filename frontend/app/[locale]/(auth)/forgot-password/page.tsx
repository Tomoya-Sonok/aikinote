import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { ForgotPasswordForm } from "@/components/auth/ForgotPasswordForm";
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
    title: t("passwordReset"),
    description: t("passwordResetDescription"),
  });
}

export default async function ForgotPasswordPage({
  params: { locale },
}: {
  params: { locale: string };
}) {
  const user = await getCurrentUser();

  if (user) {
    redirect(`/${locale}/personal/pages`);
  }

  const t = await getTranslations({ locale, namespace: "auth" });
  const loginHref = `/${locale}/login`;

  return (
    <MinimalLayout headerTitle={t("passwordResetTitle")} backHref={loginHref}>
      <div className={styles.container}>
        <h1 className={styles.title}>{t("passwordResetTitle")}</h1>
        <div className={styles.formCard}>
          <ForgotPasswordForm />
        </div>
      </div>
    </MinimalLayout>
  );
}

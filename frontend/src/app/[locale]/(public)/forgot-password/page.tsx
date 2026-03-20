import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { ForgotPasswordForm } from "@/components/features/auth/ForgotPasswordForm";
import { MinimalLayout } from "@/components/shared/layouts/MinimalLayout";
import { buildMetadata } from "@/lib/metadata";
import { getCurrentUser } from "@/lib/server/auth";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "auth" });
  return buildMetadata({
    title: t("passwordReset"),
    description: t("passwordResetDescription"),
  });
}

export default async function ForgotPasswordPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const user = await getCurrentUser();

  if (user) {
    redirect(`/${locale}/personal/pages`);
  }

  const t = await getTranslations({ locale, namespace: "auth" });
  const loginHref = `/${locale}/login`;

  return (
    <MinimalLayout headerTitle={t("passwordResetTitle")} backHref={loginHref}>
      <ForgotPasswordForm />
    </MinimalLayout>
  );
}

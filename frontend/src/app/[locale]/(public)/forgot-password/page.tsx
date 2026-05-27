import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { ForgotPasswordForm } from "@/components/features/auth/ForgotPasswordForm";
import { GuestGate } from "@/components/shared/auth";
import { MinimalLayout } from "@/components/shared/layouts/MinimalLayout";
import { buildMetadata } from "@/lib/metadata";

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
  const t = await getTranslations({ locale, namespace: "auth" });
  const loginHref = `/${locale}/login`;

  return (
    <GuestGate>
      <MinimalLayout headerTitle={t("passwordResetTitle")} backHref={loginHref}>
        <ForgotPasswordForm />
      </MinimalLayout>
    </GuestGate>
  );
}

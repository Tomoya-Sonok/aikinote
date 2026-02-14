import { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { MinimalLayout } from "@/components/shared/layouts/MinimalLayout";
import { buildMetadata } from "@/lib/metadata";
import { ConfirmEmailChange } from "./ConfirmEmailChange";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale });
  return buildMetadata({
    title: t("emailChange.confirmTitle"),
    description: t("emailChange.confirmTitle"),
  });
}

export default async function ConfirmEmailChangePage({
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
  const t = await getTranslations({ locale });

  return (
    <MinimalLayout
      headerTitle={t("emailChange.confirmTitle")}
      backHref={`/${locale}/login`}
    >
      <ConfirmEmailChange token={resolvedSearchParams.token} locale={locale} />
    </MinimalLayout>
  );
}

import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { GuestGate } from "@/components/shared/auth";
import { NotLoggedInLayout } from "@/components/shared/layouts/NotLoggedInLayout";
import { buildMetadata } from "@/lib/metadata";
import { Login } from "./Login";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "auth" });
  return buildMetadata({
    title: t("loginTitle"),
    description: t("loginDescription"),
  });
}

export default async function Page({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  return (
    <GuestGate>
      <NotLoggedInLayout>
        <Login locale={locale} />
      </NotLoggedInLayout>
    </GuestGate>
  );
}

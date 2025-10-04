import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { SignInForm } from "@/components/auth/SignInForm";
import { NotLoggedInLayout } from "@/components/layouts/NotLoggedInLayout";
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
		title: t("loginTitle"),
		description: t("loginDescription"),
	});
}

export default async function LoginPage({
  params: { locale },
}: {
  params: { locale: string };
}) {
  const user = await getCurrentUser();

  if (user) {
    redirect(`/${locale}/personal/pages`);
  }

  const t = await getTranslations({ locale, namespace: "auth" });

  return (
    <NotLoggedInLayout>
      <div className={styles.container}>
				<h1 className={styles.title}>{t("loginTitle")}</h1>
				<div className={styles.formCard}>
					<SignInForm locale={locale} />
				</div>
			</div>
		</NotLoggedInLayout>
	);
}

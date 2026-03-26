import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { buildMetadata } from "@/lib/metadata";
import { getCurrentUser } from "@/lib/server/auth";
import { Faq } from "./_components/Faq";
import { Footer } from "./_components/Footer";
import { Header } from "./_components/Header";
import { Hero } from "./_components/Hero";
import { NewFeature } from "./_components/NewFeature";
import { PainPoints } from "./_components/PainPoints";
import { SearchFeature } from "./_components/SearchFeature";
import { SnsCommunity } from "./_components/SnsCommunity";
import { Steps } from "./_components/Steps";
import styles from "./page.module.css";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const isJa = locale === "ja";
  return buildMetadata({
    titleAbsolute: isJa
      ? "AikiNote（アイキノート）| 合気道の稽古記録・交流アプリ"
      : "AikiNote - Digital Aikido Training Journal & Community",
    description: isJa
      ? "合気道の稽古を記録・振り返り・共有できるデジタル日誌アプリ。流派や世代を問わず全国の合気道家とつながる「みんなで」機能搭載。"
      : "A digital training journal app for Aikido practitioners to freely record, search, and review daily practice notes.",
    isIndexing: true,
    canonical: isJa ? "/" : "/en/",
    alternateLanguages: { ja: "/", en: "/en/" },
  });
}

interface RootPageProps {
  params: Promise<{ locale: string }>;
}

export default async function RootPage({ params }: RootPageProps) {
  const { locale } = await params;
  const user = await getCurrentUser();
  const isDefaultLocale = locale === "ja";
  const localePrefix = isDefaultLocale ? "" : `/${locale}`;

  if (user) {
    redirect(`${localePrefix}/personal/pages`);
  }

  const signupHref = `${localePrefix}/signup`;

  return (
    <div className={styles.page}>
      <Header locale={locale} signupHref={signupHref} />

      <main className={styles.mainContent}>
        <div className={styles.sectionsContainer}>
          <Hero locale={locale} signupHref={signupHref} />

          <PainPoints locale={locale} />

          <Steps locale={locale} signupHref={signupHref} />

          <SearchFeature locale={locale} signupHref={signupHref} />

          <NewFeature locale={locale} signupHref={signupHref} />

          <SnsCommunity locale={locale} signupHref={signupHref} />

          <Faq locale={locale} signupHref={signupHref} />
        </div>
      </main>

      <Footer locale={locale} />
    </div>
  );
}

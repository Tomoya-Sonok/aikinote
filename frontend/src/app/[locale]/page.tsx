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
  const jaTitle = "AikiNote | 合気道の稽古記録・交流アプリ";
  const enTitle = "AikiNote | Aikido Training Journal & Community";
  const jaDescription =
    "合気道の稽古を記録・振り返り・共有できるデジタル日誌アプリ。世代や道場の壁を越えて他の合気道家とつながる「みんなで」機能も。";
  const enDescription =
    "Record, reflect, and share your aikido training. Connect with practitioners across styles and generations.";

  return buildMetadata({
    titleAbsolute: isJa ? jaTitle : enTitle,
    description: isJa ? jaDescription : enDescription,
    isIndexing: true,
    canonical: isJa ? "/" : "/en/",
    alternateLanguages: { ja: "/", en: "/en/" },
    alternateXDefault: "/",
    openGraphType: "website",
    openGraphLocale: isJa ? "ja_JP" : "en_US",
    openGraphUrl: isJa ? "/" : "/en",
    openGraphSiteName: "AikiNote",
    openGraphTitle: isJa ? jaTitle : enTitle,
    openGraphDescription: isJa ? jaDescription : enDescription,
    openGraphImages: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: isJa
          ? "AikiNote - 合気道の稽古記録・交流アプリ"
          : "AikiNote - Aikido Training Journal & Community",
      },
    ],
    twitterCard: "summary_large_image",
    twitterTitle: isJa ? jaTitle : enTitle,
    twitterDescription: isJa ? jaDescription : enDescription,
    twitterImages: ["/og-image.png"],
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

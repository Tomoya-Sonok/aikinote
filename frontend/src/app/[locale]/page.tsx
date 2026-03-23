import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { LandingMenuDrawer } from "@/components/features/landing/LandingMenuDrawer/LandingMenuDrawer";
import { LocaleMenu } from "@/components/features/landing/LocaleMenu/LocaleMenu";
import buttonStyles from "@/components/shared/Button/Button.module.css";
import { buildMetadata } from "@/lib/metadata";
import { getCurrentUser } from "@/lib/server/auth";
import { Faq } from "./_components/Faq";
import { Footer } from "./_components/Footer";
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
    title: "AikiNote",
    description: isJa
      ? "日々の合気道の稽古で学んだことや感想を自由に記録・検索・閲覧できるデジタル稽古日誌アプリ"
      : "A digital training journal app for Aikido practitioners to freely record, search, and review daily practice notes.",
    isIndexing: true,
  });
}

interface RootPageProps {
  params: Promise<{ locale: string }>;
}

interface NavigationContent {
  logoLabel: string;
  ariaLabel: string;
  links: Array<{ href: string; label: string }>;
}

export default async function RootPage({ params }: RootPageProps) {
  const { locale } = await params;
  const user = await getCurrentUser();
  const isDefaultLocale = locale === "ja";
  const localePrefix = isDefaultLocale ? "" : `/${locale}`;

  if (user) {
    redirect(`${localePrefix}/personal/pages`);
  }

  const t = await getTranslations({ locale, namespace: "landing" });
  const tLanguage = await getTranslations({ locale, namespace: "language" });
  const navigation = t.raw("navigation") as NavigationContent;
  const rootHref = isDefaultLocale ? "/" : `/${locale}`;
  const signupHref = `${localePrefix}/signup`;
  const localeSummary = isDefaultLocale
    ? tLanguage("japanese")
    : tLanguage("english");
  const localeOptions = [
    {
      href: "/",
      label: tLanguage("japanese"),
      isActive: isDefaultLocale,
    },
    {
      href: "/en",
      label: tLanguage("english"),
      isActive: locale === "en",
    },
  ];
  const menuLabel = t("drawer.title");
  const menuCloseLabel = t("drawer.close");
  const menuTermsLabel = t("drawer.terms");
  const menuPrivacyLabel = t("drawer.privacy");
  const menuHelpPrefix = t("drawer.help.prefix");
  const menuHelpLinkLabel = t("drawer.help.linkLabel");

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <Link
            href={rootHref}
            className={styles.logoLink}
            aria-label={navigation.logoLabel}
          >
            <Image
              src="/images/shared/aikinote_logo.png"
              alt="AikiNote logo"
              width={270}
              height={270}
              sizes="36px"
              className={styles.logoImageMobile}
              priority
            />
            <Image
              src="/images/lp/aikinote_logo_horizontal.png"
              alt="AikiNote logo"
              width={814}
              height={270}
              sizes="(min-width: 768px) 160px, 140px"
              className={styles.logoImageDesktop}
              priority
            />
          </Link>
          <div className={styles.headerRight}>
            <nav aria-label={navigation.ariaLabel} className={styles.nav}>
              <ul className={styles.navList}>
                {navigation.links.map((link) => (
                  <li key={link.href}>
                    <a className={styles.navLink} href={link.href}>
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
            <div className={styles.headerUtilities}>
              <LocaleMenu summary={localeSummary} options={localeOptions} />
              <Link
                href={`${localePrefix}/login`}
                className={`${buttonStyles.button} ${buttonStyles.secondary} ${buttonStyles.medium} ${styles.loginLink}`}
              >
                {t("cta.login")}
              </Link>
              <LandingMenuDrawer
                links={navigation.links}
                menuLabel={menuLabel}
                closeLabel={menuCloseLabel}
                ariaLabel={navigation.ariaLabel}
                termsLabel={menuTermsLabel}
                privacyLabel={menuPrivacyLabel}
                helpPrefix={menuHelpPrefix}
                helpLinkLabel={menuHelpLinkLabel}
              />
            </div>
          </div>
        </div>
      </header>

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

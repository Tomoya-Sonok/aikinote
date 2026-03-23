import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Fragment, type ReactNode } from "react";
import { LandingMenuDrawer } from "@/components/features/landing/LandingMenuDrawer/LandingMenuDrawer";
import { LocaleMenu } from "@/components/features/landing/LocaleMenu/LocaleMenu";
import { BackToTopButton } from "@/components/shared/BackToTopButton/BackToTopButton";
import buttonStyles from "@/components/shared/Button/Button.module.css";
import { buildMetadata } from "@/lib/metadata";
import { getCurrentUser } from "@/lib/server/auth";
import { Hero } from "./_components/Hero";
import { NewFeature } from "./_components/NewFeature";
import { PainPoints } from "./_components/PainPoints";
import { SearchFeature } from "./_components/SearchFeature";
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

interface FooterContent {
  brand: string;
  contact: string;
  instagram: string;
  facebook: string;
}

const SECTION_KEYS = ["first", "second", "third"] as const;
const FAQ_KEYS = [
  "easeOfUse",
  "security",
  "languages",
  "mobileApp",
  "others",
] as const;

const bold = (chunks: ReactNode) => <strong>{chunks}</strong>;
const underlined = (chunks: ReactNode) => <u>{chunks}</u>;

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
  const footer = t.raw("footer") as FooterContent;
  const rootHref = isDefaultLocale ? "/" : `/${locale}`;
  const signupHref = `${localePrefix}/signup`;
  const currentYear = new Date().getFullYear();
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

          {/* biome-ignore lint/correctness/useUniqueElementIds: ナビゲーションと連携する固定ID */}
          <section id="future-features" className={styles.section}>
            <div className={styles.sectionContent}>
              <div className={styles.sectionText}>
                <div className={styles.sectionHeader}>
                  <h2 className={styles.sectionTitle}>
                    {t("futureFeatures.title")}
                  </h2>
                </div>
                <p className={styles.sectionBody}>{t("futureFeatures.body")}</p>
              </div>
              <div className={styles.sectionVisual}>
                <figure className={styles.illustrationWrapper}>
                  <Image
                    src="/images/shared/lp_upcoming_sns_features.png"
                    alt={t("futureFeatures.imageAlt")}
                    width={2048}
                    height={1243}
                    sizes="(min-width: 768px) 520px, 90vw"
                    className={styles.illustrationImage}
                  />
                </figure>
              </div>
            </div>
            <div className={styles.sectionActions}>
              <Link href={signupHref} className={styles.primaryCta}>
                {t("cta.primary")}
              </Link>
            </div>
          </section>

          {/* biome-ignore lint/correctness/useUniqueElementIds: ナビゲーションと連携する固定ID */}
          <section id="faq" className={styles.section}>
            <div className={styles.faqContent}>
              <div className={styles.sectionHeader}>
                <h2 className={styles.sectionTitle}>{t("faq.title")}</h2>
              </div>
              <div className={styles.accordionList}>
                {FAQ_KEYS.map((key) => (
                  <details key={key} className={styles.accordionItem}>
                    <summary>
                      <span>{t(`faq.items.${key}.question`)}</span>
                    </summary>
                    <div className={styles.accordionPanel}>
                      {t.rich(`faq.items.${key}.answer`, {
                        bold,
                        underlined,
                        link: (chunks) => (
                          <a
                            href="https://docs.google.com/forms/d/e/1FAIpQLSfr11mzmwzwwXXULuoT4w8D57e9aAtUZa_9i8HDGAtDgjNxYw/viewform?usp=dialog"
                            target="_blank"
                            rel="noreferrer"
                          >
                            {chunks}
                          </a>
                        ),
                      })}
                    </div>
                  </details>
                ))}
              </div>
            </div>
            <div className={styles.sectionActions}>
              <a
                className={styles.secondaryCta}
                target="_blank"
                rel="noreferrer"
                href="https://docs.google.com/forms/d/e/1FAIpQLSfr11mzmwzwwXXULuoT4w8D57e9aAtUZa_9i8HDGAtDgjNxYw/viewform?usp=dialog"
              >
                {t("cta.contact")}
              </a>
            </div>
          </section>
        </div>
        <div className={styles.sectionActions}>
          <Link href={signupHref} className={styles.primaryCta}>
            {t("cta.primary")}
          </Link>
        </div>
      </main>

      <footer className={styles.footer} data-scroll-footer>
        <div className={styles.footerInner}>
          <div className={styles.footerBrand}>
            <span className={styles.footerText}>
              © {currentYear} {footer.brand}
            </span>
          </div>
          <ul className={styles.footerLinks}>
            <li>
              <a
                href="https://docs.google.com/forms/d/e/1FAIpQLSfr11mzmwzwwXXULuoT4w8D57e9aAtUZa_9i8HDGAtDgjNxYw/viewform?usp=dialog"
                target="_blank"
                rel="noreferrer"
                className={styles.footerLink}
              >
                {footer.contact}
              </a>
            </li>
            <li>
              <a
                href="https://www.instagram.com/aikinote_official/"
                className={styles.footerLink}
                target="_blank"
                rel="noreferrer"
              >
                {footer.instagram}
              </a>
            </li>
            <li>
              <a
                href="https://www.facebook.com/profile.php?id=61585911578938"
                className={styles.footerLink}
                target="_blank"
                rel="noreferrer"
              >
                {footer.facebook}
              </a>
            </li>
          </ul>
          <BackToTopButton label={t("footer.backToTop")} />
        </div>
      </footer>
    </div>
  );
}

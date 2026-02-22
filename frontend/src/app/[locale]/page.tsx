import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Fragment, type ReactNode } from "react";
import { HeroCarousel } from "@/components/features/landing/HeroCarousel/HeroCarousel";
import { LandingMenuDrawer } from "@/components/features/landing/LandingMenuDrawer/LandingMenuDrawer";
import { BackToTopButton } from "@/components/shared/BackToTopButton/BackToTopButton";
import { ScrollIndicator } from "@/components/shared/ScrollIndicator/ScrollIndicator";
import { getCurrentUser } from "@/lib/server/auth";
import styles from "./page.module.css";

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

const PAIN_POINT_KEYS = ["first", "second", "third"] as const;
const RECORDING_STEP_KEYS = ["first", "second", "third"] as const;
const SEARCH_FEATURE_KEYS = ["first", "second", "third"] as const;
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
  const heroTitleLines = t.raw("hero.titleLines") as string[];
  const heroCarouselItems = (
    t.raw("hero.carousel.items") as Array<{
      alt: string;
      caption: string;
    }>
  ).map((item, index) => ({
    src: `/images/lp_hero_carousel_${index + 1}.png`,
    alt: item.alt,
    caption: item.caption,
    dotLabel: t("hero.carousel.dotLabel", { index: index + 1 }),
  }));
  const navigation = t.raw("navigation") as NavigationContent;
  const footer = t.raw("footer") as FooterContent;
  const rootHref = isDefaultLocale ? "/" : `/${locale}`;
  const signupHref = `${localePrefix}/signup`;
  const currentYear = new Date().getFullYear();
  const searchFeatureIcons: Record<
    (typeof SEARCH_FEATURE_KEYS)[number],
    string
  > = {
    first: styles.featureIconTags,
    second: styles.featureIconFilter,
    third: styles.featureIconRecent,
  };
  const searchSubtitleLines = t("solutionSearch.subtitle").split("\n");
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
              src="/images/aikinote_logo_horizontal.png"
              alt="AikiNote logo"
              width={814}
              height={270}
              sizes="(min-width: 768px) 160px, 140px"
              className={styles.logoImage}
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
              <details className={styles.localeMenu}>
                <summary className={styles.localeSummary}>
                  <span className={styles.localeSummaryText}>
                    {localeSummary}
                  </span>
                  <span className={styles.localeChevron} aria-hidden="true" />
                </summary>
                <div className={styles.localePanel}>
                  {localeOptions.map((option) => (
                    <Link
                      key={option.href}
                      href={option.href}
                      className={`${styles.localeOption} ${
                        option.isActive ? styles.localeOptionActive : ""
                      }`}
                      aria-current={option.isActive ? "page" : undefined}
                    >
                      {option.label}
                    </Link>
                  ))}
                </div>
              </details>
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
          {/* biome-ignore lint/correctness/useUniqueElementIds: ナビゲーションと連携する固定ID */}
          <section
            id="hero"
            className={`${styles.section} ${styles.heroSection}`}
          >
            <div className={`${styles.sectionContent} ${styles.heroContent}`}>
              <div className={`${styles.sectionText} ${styles.heroText}`}>
                <p className={styles.leadLabel}>{t("hero.lead")}</p>
                <h1 className={styles.heroTitle}>
                  {heroTitleLines.map((line, index) => (
                    // biome-ignore lint/suspicious/noArrayIndexKey: 翻訳テキストの行分割のため、行内容+indexの組み合わせで一意性を担保
                    <Fragment key={`${line}-${index}`}>
                      {line}
                      {index < heroTitleLines.length - 1 && <br />}
                    </Fragment>
                  ))}
                </h1>
                <div className={styles.heroActions}>
                  <Link href={signupHref} className={styles.primaryCta}>
                    {t("cta.primary")}
                  </Link>
                </div>
                <div className={styles.heroTextImageWrapper}>
                  <Image
                    src="/images/lp_standing_with_smartphone.png"
                    alt={t("hero.textImageAlt")}
                    width={1237}
                    height={1379}
                    sizes="(min-width: 768px) 220px, 40vw"
                    className={styles.heroTextImage}
                    priority
                  />
                </div>
              </div>
              <div className={`${styles.sectionVisual} ${styles.heroVisual}`}>
                <div className={styles.heroCarousel}>
                  {heroCarouselItems.length > 0 ? (
                    <HeroCarousel items={heroCarouselItems} />
                  ) : null}
                </div>
                <div className={styles.heroMockDesktop}>
                  <Image
                    src="/images/lp_hero_mock1.png"
                    alt={t("hero.imageAlt")}
                    width={1857}
                    height={3096}
                    sizes="(min-width: 768px) 360px, 80vw"
                    className={styles.heroMockImage}
                    priority
                  />
                </div>
              </div>
            </div>
          </section>

          {/* biome-ignore lint/correctness/useUniqueElementIds: ナビゲーションと連携する固定ID */}
          <section id="pain-points" className={styles.section}>
            <div
              className={`${styles.sectionContent} ${styles.sectionContentReverse}`}
            >
              <div className={styles.sectionText}>
                <div className={styles.sectionHeader}>
                  <h2 className={styles.sectionTitle}>
                    {t("painPoints.title")}
                  </h2>
                </div>
                <ul className={styles.bulletList}>
                  {PAIN_POINT_KEYS.map((key) => (
                    <li key={key}>
                      {t.rich(`painPoints.items.${key}`, { bold })}
                    </li>
                  ))}
                </ul>
              </div>
              <div className={styles.sectionVisual}>
                <figure className={styles.illustrationWrapper}>
                  <Image
                    src="/images/lp_pain_points.png"
                    alt={t("painPoints.imageAlt")}
                    width={1018}
                    height={935}
                    sizes="(min-width: 768px) 480px, 90vw"
                    className={styles.illustrationImage}
                  />
                </figure>
              </div>
            </div>
          </section>

          {/* biome-ignore lint/correctness/useUniqueElementIds: ナビゲーションと連携する固定ID */}
          <section id="solution-recording" className={styles.section}>
            <div className={styles.sectionContent}>
              <div className={styles.sectionText}>
                <div className={styles.sectionHeader}>
                  <h2 className={styles.sectionTitle}>
                    {t.rich("solutionRecording.title", { bold })}
                  </h2>
                </div>
                <ol className={styles.stepList}>
                  {RECORDING_STEP_KEYS.map((key) => (
                    <li key={key}>
                      {t.rich(`solutionRecording.steps.${key}`, { bold })}
                    </li>
                  ))}
                </ol>
              </div>
              <div className={styles.sectionVisual}>
                <div className={styles.mockNotebookScene} aria-hidden="true">
                  <div className={styles.mockNotebook}>
                    <div className={styles.mockNotebookTabs}>
                      <span />
                      <span />
                      <span />
                      <span />
                      <span />
                    </div>
                    <div className={styles.mockNotebookBody}>
                      <span />
                      <span />
                      <span />
                      <span />
                    </div>
                  </div>
                  <div className={styles.pencilCursor}>
                    <span className={styles.pencilBody}>
                      <span className={styles.pencilTip} />
                    </span>
                  </div>
                </div>
              </div>
            </div>
            <div className={styles.sectionActions}>
              <Link href={signupHref} className={styles.primaryCta}>
                {t("cta.primary")}
              </Link>
            </div>
          </section>

          {/* biome-ignore lint/correctness/useUniqueElementIds: ナビゲーションと連携する固定ID */}
          <section
            id="solution-search"
            className={`${styles.section} ${styles.searchSection}`}
          >
            <div className={styles.searchRow}>
              <div className={`${styles.sectionVisual} ${styles.searchVisual}`}>
                <Image
                  src="/images/lp_hero_carousel_1.png"
                  alt={t("solutionSearch.imageAlt")}
                  width={1857}
                  height={3096}
                  sizes="(min-width: 1024px) 440px, (min-width: 768px) 380px, 90vw"
                  className={styles.searchImage}
                />
              </div>
              <div className={styles.searchInfo}>
                <div className={styles.sectionHeader}>
                  <h2
                    className={`${styles.sectionTitle} ${styles.searchTitle}`}
                  >
                    {t("solutionSearch.title")}
                  </h2>
                  <p className={styles.searchSubtitle}>
                    {searchSubtitleLines.map((line, index) => (
                      // biome-ignore lint/suspicious/noArrayIndexKey: 翻訳テキストの行分割のため、行内容+indexの組み合わせで一意性を担保
                      <Fragment key={`${line}-${index}`}>
                        {line}
                        {index < searchSubtitleLines.length - 1 && <br />}
                      </Fragment>
                    ))}
                  </p>
                </div>
                <ul className={styles.searchFeatures}>
                  {SEARCH_FEATURE_KEYS.map((key) => (
                    <li key={key} className={styles.searchFeatureItem}>
                      <span
                        className={`${styles.featureIcon} ${searchFeatureIcons[key]}`}
                        aria-hidden="true"
                      />
                      <div className={styles.searchFeatureText}>
                        <p className={styles.searchFeatureTitle}>
                          {t(`solutionSearch.features.${key}.title`)}
                        </p>
                        <p className={styles.searchFeatureBody}>
                          {t(`solutionSearch.features.${key}.body`)}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            <div className={`${styles.sectionActions} ${styles.searchActions}`}>
              <Link href={signupHref} className={styles.primaryCta}>
                {t("cta.primary")}
              </Link>
            </div>
          </section>

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
                    src="/images/lp_upcoming_sns_features.png"
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
            <Image
              src="/images/aikinote_logo_bg_black.png"
              alt="AikiNote logo"
              width={36}
              height={36}
            />
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
                href="https://www.instagram.com/"
                className={styles.footerLink}
                target="_blank"
                rel="noreferrer"
              >
                {footer.instagram}
              </a>
            </li>
            <li>
              <a
                href="https://www.facebook.com/"
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

      <Link href={signupHref} className={styles.floatingCta}>
        {t("floatingCta")}
      </Link>
      <ScrollIndicator label={t("cta.goDown")} />
    </div>
  );
}

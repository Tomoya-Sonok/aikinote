import Image from "next/image";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { CtaButton } from "../CtaButton";
import styles from "./Header.module.css";
import { HeaderDrawer } from "./HeaderDrawer";

const CONTACT_FORM_URL =
  "https://docs.google.com/forms/d/e/1FAIpQLSfr11mzmwzwwXXULuoT4w8D57e9aAtUZa_9i8HDGAtDgjNxYw/viewform?usp=dialog";

interface HeaderProps {
  locale: string;
  signupHref: string;
}

interface NavigationContent {
  logoLabel: string;
  ariaLabel: string;
  links: Array<{ href: string; label: string }>;
}

export async function Header({ locale, signupHref }: HeaderProps) {
  const t = await getTranslations({ locale, namespace: "landing" });

  const isDefaultLocale = locale === "ja";
  const rootHref = isDefaultLocale ? "/" : `/${locale}`;
  const navigation = t.raw("navigation") as NavigationContent;
  const localeSwitchHref = isDefaultLocale ? "/en" : "/";
  const localeSwitchLabel = isDefaultLocale ? "EN" : "日本語";
  const loginHref = isDefaultLocale ? "/login" : `/${locale}/login`;

  return (
    <header className={styles.header} data-locale={locale}>
      <div className={styles.headerInner}>
        {/* ロゴ */}
        <Link
          href={rootHref}
          className={styles.logoLink}
          aria-label={navigation.logoLabel}
        >
          <Image
            src="/images/lp/aikinote_logo_horizontal.png"
            alt="AikiNote logo"
            width={814}
            height={270}
            sizes="(min-width: 1366px) 160px, (min-width: 1060px) 0px, 140px"
            className={styles.logoImageWide}
            priority
          />
          <Image
            src="/images/shared/aikinote_logo.png"
            alt="AikiNote logo"
            width={270}
            height={270}
            sizes="36px"
            className={styles.logoImageCompact}
            priority
          />
        </Link>

        {/* PC: ナビゲーション */}
        <nav aria-label={navigation.ariaLabel} className={styles.desktopNav}>
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

        {/* 右側アクション */}
        <div className={styles.headerActions}>
          <Link href={localeSwitchHref} className={styles.localeBadge}>
            {localeSwitchLabel}
          </Link>

          {/* SP: ハンバーガーメニュー */}
          <HeaderDrawer
            links={navigation.links}
            signupHref={signupHref}
            loginHref={loginHref}
            loginPromptLabel={t("cta.loginPrompt")}
            contactLabel={t("cta.contact")}
            ctaLabel={t("hero.ctaLabel")}
            menuLabel={t("drawer.title")}
            closeLabel={t("drawer.close")}
            ariaLabel={navigation.ariaLabel}
            localeSwitchHref={localeSwitchHref}
            localeSwitchLabel={localeSwitchLabel}
            facebookLabel={t("footer.facebook")}
            instagramLabel={t("footer.instagram")}
            termsLabel={t("drawer.terms")}
            privacyLabel={t("drawer.privacy")}
            tokushohoLabel={t("drawer.tokushoho")}
            locale={locale}
          />

          {/* PC: CTA ボタン */}
          <span className={styles.secondaryCtaSlot}>
            <CtaButton
              variant="secondary"
              size="compact"
              external
              href={CONTACT_FORM_URL}
            >
              {t("cta.contact")}
            </CtaButton>
          </span>
          <span className={styles.primaryCtaSlot}>
            <CtaButton variant="primary" size="compact" href={signupHref}>
              {t("hero.ctaLabel")}
            </CtaButton>
          </span>
        </div>
      </div>
    </header>
  );
}

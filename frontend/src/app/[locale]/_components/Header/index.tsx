import { ArrowRight as ArrowRightIcon } from "@phosphor-icons/react/dist/ssr";
import Image from "next/image";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
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

  return (
    <header className={styles.header}>
      <div className={styles.headerInner}>
        {/* SP: ハンバーガーメニュー */}
        <HeaderDrawer
          links={navigation.links}
          signupHref={signupHref}
          contactLabel={t("cta.contact")}
          ctaLabel={t("hero.ctaLabel")}
          menuLabel={t("drawer.title")}
          closeLabel={t("drawer.close")}
          ariaLabel={navigation.ariaLabel}
          localeSwitchHref={localeSwitchHref}
          localeSwitchLabel={localeSwitchLabel}
          facebookLabel={t("footer.facebook")}
          instagramLabel={t("footer.instagram")}
        />

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
            sizes="(min-width: 768px) 160px, 140px"
            className={styles.logoImage}
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

          {/* PC: CTA ボタン */}
          <a
            href={CONTACT_FORM_URL}
            target="_blank"
            rel="noreferrer"
            className={styles.secondaryCta}
          >
            <span>{t("cta.contact")}</span>
            <span className={styles.secondaryCtaIcon}>
              <ArrowRightIcon size={12} weight="bold" />
            </span>
          </a>
          <Link href={signupHref} className={styles.primaryCta}>
            <span>{t("hero.ctaLabel")}</span>
            <span className={styles.primaryCtaIcon}>
              <ArrowRightIcon size={12} weight="bold" />
            </span>
          </Link>
        </div>
      </div>
    </header>
  );
}

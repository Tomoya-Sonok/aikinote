"use client";

import { List as ListIcon, X as XIcon } from "@phosphor-icons/react";
import Image from "next/image";
import Link from "next/link";
import type { FC } from "react";
import { useEffect, useState } from "react";
import { AikinoteRightArrow } from "@/components/shared/Icons/AikinoteRightArrow";
import styles from "./Header.module.css";

const CONTACT_FORM_URL =
  "https://docs.google.com/forms/d/e/1FAIpQLSfr11mzmwzwwXXULuoT4w8D57e9aAtUZa_9i8HDGAtDgjNxYw/viewform?usp=dialog";

const INSTAGRAM_URL = "https://www.instagram.com/aikinote_official/";
const FACEBOOK_URL = "https://www.facebook.com/profile.php?id=61585911578938";

interface HeaderDrawerProps {
  links: Array<{ href: string; label: string }>;
  signupHref: string;
  contactLabel: string;
  ctaLabel: string;
  menuLabel: string;
  closeLabel: string;
  ariaLabel: string;
  localeSwitchHref: string;
  localeSwitchLabel: string;
  facebookLabel: string;
  instagramLabel: string;
  termsLabel: string;
  privacyLabel: string;
  locale: string;
}

export const HeaderDrawer: FC<HeaderDrawerProps> = ({
  links,
  signupHref,
  contactLabel,
  ctaLabel,
  menuLabel,
  closeLabel,
  ariaLabel,
  localeSwitchHref,
  localeSwitchLabel,
  facebookLabel,
  instagramLabel,
  termsLabel,
  privacyLabel,
  locale,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const drawerId = "landing-menu-drawer";

  const handleClose = () => {
    setIsOpen(false);
  };

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };
    const previousOverflowY = document.body.style.overflowY;

    document.addEventListener("keydown", handleEscape);
    document.body.style.overflowY = "hidden";

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflowY = previousOverflowY;
    };
  }, [isOpen]);

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className={styles.menuButton}
        aria-label={menuLabel}
        aria-expanded={isOpen}
        aria-controls={drawerId}
      >
        <ListIcon size={28} weight="bold" />
      </button>

      <aside
        className={`${styles.drawer} ${isOpen ? styles.drawerOpen : ""}`}
        aria-hidden={!isOpen}
        aria-label={menuLabel}
        id={drawerId}
      >
        {/* ドロワーヘッダー */}
        <div className={styles.drawerHeader}>
          <Image
            src="/images/lp/aikinote_logo_horizontal.png"
            alt="AikiNote logo"
            width={814}
            height={270}
            sizes="140px"
            className={styles.drawerLogo}
          />
          <div className={styles.drawerHeaderActions}>
            <Link
              href={localeSwitchHref}
              className={styles.localeBadge}
              onClick={handleClose}
            >
              {localeSwitchLabel}
            </Link>
            <button
              type="button"
              onClick={handleClose}
              className={styles.closeButton}
              aria-label={closeLabel}
            >
              <XIcon size={24} weight="bold" />
            </button>
          </div>
        </div>

        {/* スクロール可能なコンテンツ領域 */}
        <div className={styles.drawerContent}>
          {/* ナビゲーション */}
          <nav className={styles.drawerNav} aria-label={ariaLabel}>
            <ul className={styles.drawerNavList}>
              {links.map((link) => (
                <li key={link.href}>
                  <a
                    className={styles.drawerNavLink}
                    href={link.href}
                    onClick={handleClose}
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          {/* CTA ボタン */}
          <div className={styles.drawerCta}>
            <a
              href={CONTACT_FORM_URL}
              target="_blank"
              rel="noreferrer"
              className={styles.drawerSecondaryCta}
            >
              <span>{contactLabel}</span>
              <span className={styles.drawerSecondaryCtaIcon}>
                <AikinoteRightArrow size={14} />
              </span>
            </a>
            <Link
              href={signupHref}
              className={styles.drawerPrimaryCta}
              onClick={handleClose}
            >
              <span>{ctaLabel}</span>
              <span className={styles.drawerPrimaryCtaIcon}>
                <AikinoteRightArrow size={14} />
              </span>
            </Link>
          </div>

          {/* ソーシャルアイコン */}
          <div className={styles.drawerSocial}>
            <a
              href={FACEBOOK_URL}
              target="_blank"
              rel="noreferrer"
              aria-label={facebookLabel}
              className={styles.drawerSocialLink}
            >
              <Image
                src="/images/lp/facebook-logo.png"
                alt=""
                width={100}
                height={100}
                sizes="50px"
                className={styles.drawerSocialIcon}
              />
            </a>
            <a
              href={INSTAGRAM_URL}
              target="_blank"
              rel="noreferrer"
              aria-label={instagramLabel}
              className={styles.drawerSocialLink}
            >
              <Image
                src="/images/lp/instagram-logo.png"
                alt=""
                width={100}
                height={100}
                sizes="50px"
                className={styles.drawerSocialIcon}
              />
            </a>
          </div>

          {/* 利用規約・プライバシーポリシー */}
          <div className={styles.drawerLegal}>
            <Link
              href={`/${locale}/terms`}
              className={styles.drawerLegalLink}
              onClick={handleClose}
            >
              {termsLabel}
            </Link>
            <Link
              href={`/${locale}/privacy`}
              className={styles.drawerLegalLink}
              onClick={handleClose}
            >
              {privacyLabel}
            </Link>
          </div>
        </div>
      </aside>
    </>
  );
};

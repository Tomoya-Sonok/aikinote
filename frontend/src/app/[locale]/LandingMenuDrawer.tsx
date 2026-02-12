"use client";

import type { FC } from "react";
import { useEffect, useState } from "react";
import styles from "./page.module.css";

interface DrawerLink {
  href: string;
  label: string;
}

interface LandingMenuDrawerProps {
  links: DrawerLink[];
  menuLabel: string;
  closeLabel: string;
  ariaLabel: string;
  termsLabel: string;
  privacyLabel: string;
  helpPrefix: string;
  helpLinkLabel: string;
}

export const LandingMenuDrawer: FC<LandingMenuDrawerProps> = ({
  links,
  menuLabel,
  closeLabel,
  ariaLabel,
  termsLabel,
  privacyLabel,
  helpPrefix,
  helpLinkLabel,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const drawerId = "landing-menu-drawer";

  const handleClose = () => {
    setIsOpen(false);
  };

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "unset";
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
        <span className={styles.srOnly}>{menuLabel}</span>
        <span className={styles.menuIcon} aria-hidden="true">
          <span />
          <span />
          <span />
        </span>
      </button>
      <aside
        className={`${styles.menuDrawer} ${
          isOpen ? styles.menuDrawerOpen : ""
        }`}
        aria-hidden={!isOpen}
        aria-label={menuLabel}
        id={drawerId}
        onClick={handleClose}
      >
        <button
          type="button"
          onClick={handleClose}
          className={styles.menuDrawerClose}
          aria-label={closeLabel}
        >
          ×
        </button>
        <div className={styles.menuDrawerContent}>
          <nav className={styles.menuDrawerNav} aria-label={ariaLabel}>
            <ul className={styles.menuDrawerList}>
              {links.map((link) => (
                <li key={link.href}>
                  <a
                    className={styles.menuDrawerLink}
                    href={link.href}
                    onClick={handleClose}
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
          <div
            className={styles.menuDrawerFooter}
            onClick={(event) => {
              event.stopPropagation();
            }}
          >
            <p className={styles.menuDrawerFooterItem}>{termsLabel}</p>
            <p className={styles.menuDrawerFooterItem}>{privacyLabel}</p>
            <p className={styles.menuDrawerFooterItem}>
              {helpPrefix}
              <a
                className={styles.menuDrawerHelpLink}
                href="#"
                onClick={(event) => {
                  event.preventDefault();
                }}
              >
                {helpLinkLabel}
              </a>
            </p>
          </div>
        </div>
      </aside>
    </>
  );
};

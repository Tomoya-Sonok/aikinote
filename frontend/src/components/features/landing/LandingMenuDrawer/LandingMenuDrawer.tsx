"use client";

import type { FC } from "react";
import { useEffect, useState } from "react";
import { Button } from "@/components/shared/Button/Button";
import styles from "./LandingMenuDrawer.module.css";

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
      <Button
        variant="ghost"
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
      </Button>
      <aside
        className={`${styles.menuDrawer} ${
          isOpen ? styles.menuDrawerOpen : ""
        }`}
        aria-hidden={!isOpen}
        aria-label={menuLabel}
        id={drawerId}
        onClick={handleClose}
      >
        <Button
          variant="ghost"
          onClick={handleClose}
          className={styles.menuDrawerClose}
          aria-label={closeLabel}
        >
          ×
        </Button>
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
          {/* biome-ignore lint/a11y/noStaticElementInteractions: Stop propagation for drawer layout */}
          <div
            className={styles.menuDrawerFooter}
            onClick={(event) => {
              event.stopPropagation();
            }}
            onKeyDown={(event) => {
              event.stopPropagation();
            }}
          >
            <p className={styles.menuDrawerFooterItem}>{termsLabel}</p>
            <p className={styles.menuDrawerFooterItem}>{privacyLabel}</p>
            <p className={styles.menuDrawerFooterItem}>
              {helpPrefix}
              <Button
                variant="ghost"
                className={styles.menuDrawerHelpLink}
                onClick={(event: React.MouseEvent<HTMLButtonElement>) => {
                  event.preventDefault();
                }}
              >
                {helpLinkLabel}
              </Button>
            </p>
          </div>
        </div>
      </aside>
    </>
  );
};

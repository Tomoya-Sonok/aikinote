"use client";

import { useRouter } from "next/navigation";
import type { MouseEventHandler, ReactNode } from "react";
import { ChevronLeft } from "../../atoms/icons/ChevronLeft";
import styles from "./MinimalLayout.module.css";

interface MinimalLayoutProps {
  children: ReactNode;
  showHeader?: boolean;
  headerTitle?: string;
  backButtonLabel?: string;
  backHref?: string;
}

export function MinimalLayout({
  children,
  showHeader = true,
  headerTitle,
  backHref = "/",
}: MinimalLayoutProps) {
  const router = useRouter();
  const handleClick: MouseEventHandler<HTMLButtonElement> = (event) => {
    event.preventDefault();

    if (window.history.length > 1) {
      router.back();
      return;
    }

    router.push(backHref);
  };

  return (
    <div className={styles.layout}>
      {showHeader && (
        <header className={styles.header}>
          <button
            type="button"
            className={styles.backButton}
            style={{ display: "flex" }}
            aria-label="戻る"
            onClick={handleClick}
          >
            <ChevronLeft aria-hidden="true" />
          </button>
          {headerTitle && (
            <span className={styles.headerTitle}>{headerTitle}</span>
          )}
        </header>
      )}
      <div className={styles.contentWrapper}>
        <main className={styles.main}>{children}</main>
      </div>
    </div>
  );
}

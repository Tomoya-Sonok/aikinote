"use client";

import { ArrowLeftIcon } from "@phosphor-icons/react";
import { useRouter } from "next/navigation";
import type { MouseEventHandler, ReactNode } from "react";
import styles from "./MinimalLayout.module.css";

interface MinimalLayoutProps {
  children: ReactNode;
  showHeader?: boolean;
  headerTitle?: string;
  backButtonLabel?: string;
  backHref?: string;
  /** true にすると router.back() を使わず常に backHref に遷移する */
  forceBackHref?: boolean;
  /** 指定すると戻るボタンのデフォルト遷移を上書きする */
  onBackClick?: () => void;
}

export function MinimalLayout({
  children,
  showHeader = true,
  headerTitle,
  backHref = "/",
  forceBackHref = false,
  onBackClick,
}: MinimalLayoutProps) {
  const router = useRouter();
  const handleClick: MouseEventHandler<HTMLButtonElement> = (event) => {
    event.preventDefault();

    if (onBackClick) {
      onBackClick();
      return;
    }

    if (forceBackHref || window.history.length <= 1) {
      router.push(backHref);
      return;
    }

    router.back();
  };

  return (
    <div className={styles.layout}>
      {showHeader && (
        <header className={styles.header}>
          <button
            type="button"
            className={styles.backButton}
            aria-label="戻る"
            onClick={handleClick}
          >
            <ArrowLeftIcon size={24} weight="regular" aria-hidden="true" />
          </button>
          {headerTitle ? (
            <h1 className={styles.headerTitle}>{headerTitle}</h1>
          ) : (
            <div className={styles.headerSpacer} />
          )}
          <div className={styles.headerSpacer} />
        </header>
      )}
      <div className={styles.contentWrapper}>
        <main className={styles.main}>{children}</main>
      </div>
    </div>
  );
}

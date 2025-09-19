import type { ReactNode } from "react";
import { BackButton } from "./BackButton";
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
  backButtonLabel = "戻る",
  backHref = "/",
}: MinimalLayoutProps) {
  return (
    <div className={styles.layout}>
      {showHeader && (
        <header className={styles.header}>
          <BackButton fallbackHref={backHref} label={backButtonLabel} />
          {headerTitle && <span className={styles.headerTitle}>{headerTitle}</span>}
        </header>
      )}
      <div className={styles.contentWrapper}>
        <main className={styles.main}>{children}</main>
      </div>
    </div>
  );
}

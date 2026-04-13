"use client";

import type { ReactNode } from "react";
import styles from "./ChatLayout.module.css";

interface ChatLayoutProps {
  children: ReactNode;
  footer?: ReactNode;
}

export function ChatLayout({ children, footer }: ChatLayoutProps) {
  return (
    <div className={styles.layout}>
      <div className={styles.contentWrapper}>
        <main className={styles.main}>{children}</main>
      </div>
      {footer && (
        <div className={styles.footerWrapper}>
          <div className={styles.footer}>{footer}</div>
        </div>
      )}
    </div>
  );
}

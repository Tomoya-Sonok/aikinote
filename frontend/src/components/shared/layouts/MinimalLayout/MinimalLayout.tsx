"use client";

import { CaretLeftIcon } from "@phosphor-icons/react";
import { useRouter } from "next/navigation";
import type { MouseEventHandler, ReactNode } from "react";
import { Button } from "@/components/shared/Button/Button";
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
          <Button
            variant="ghost"
            className={styles.backButton}
            style={{ display: "flex" }}
            aria-label="戻る"
            onClick={handleClick}
          >
            <CaretLeftIcon
              size={20}
              weight="light"
              color="var(--black)"
              aria-hidden="true"
            />
          </Button>
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

"use client";

import { ArrowLeftIcon } from "@phosphor-icons/react";
import { useRouter } from "next/navigation";
import type { MouseEventHandler, ReactNode } from "react";
import styles from "./SubscriptionLayout.module.css";

interface SubscriptionLayoutProps {
  children: ReactNode;
  headerTitle: string;
  backHref: string;
}

/**
 * Stripe 決済フローに特化したレイアウト。
 * 外部サイト（Stripe 等）からリダイレクトで戻ってきた場合に
 * router.back() で決済画面に戻る無限ループを防ぐため、
 * 常に backHref に遷移する。
 */
export function SubscriptionLayout({
  children,
  headerTitle,
  backHref,
}: SubscriptionLayoutProps) {
  const router = useRouter();

  const handleClick: MouseEventHandler<HTMLButtonElement> = (event) => {
    event.preventDefault();
    router.push(backHref);
  };

  return (
    <div className={styles.layout}>
      <header className={styles.header}>
        <button
          type="button"
          className={styles.backButton}
          aria-label="戻る"
          onClick={handleClick}
        >
          <ArrowLeftIcon size={24} weight="regular" aria-hidden="true" />
        </button>
        <h1 className={styles.headerTitle}>{headerTitle}</h1>
        <div className={styles.headerSpacer} />
      </header>
      <div className={styles.contentWrapper}>
        <main className={styles.main}>{children}</main>
      </div>
    </div>
  );
}

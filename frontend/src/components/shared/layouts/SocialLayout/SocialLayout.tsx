"use client";

import { type ReactNode, Suspense } from "react";
import { TabNavigation } from "@/components/shared/TabNavigation/TabNavigation";
import styles from "./SocialLayout.module.css";

interface SocialLayoutProps {
  children: ReactNode;
}

export function SocialLayout({ children }: SocialLayoutProps) {
  return (
    <div className={styles.layout}>
      <div className={styles.contentWrapper}>
        <main className={styles.main}>{children}</main>
      </div>
      <div className={styles.tabNavigation}>
        <Suspense fallback={null}>
          <TabNavigation />
        </Suspense>
      </div>
    </div>
  );
}

"use client";

import { Suspense, type ReactNode } from "react";
import { TabNavigation } from "@/components/molecules/TabNavigation/TabNavigation";
import { useAuth } from "@/lib/hooks/useAuth";
import { DefaultHeader } from "./DefaultHeader";
import styles from "./DefaultLayout.module.css";

interface DefaultLayoutProps {
  children: ReactNode;
  showHeader?: boolean;
  showFooter?: boolean;
  showTabNavigation?: boolean;
  settingsHref?: string;
}

export function DefaultLayout({
  children,
  showHeader = true,
  showFooter = true,
  showTabNavigation = true,
  settingsHref,
}: DefaultLayoutProps) {
  const { user } = useAuth();

  console.log("🏗️ [DEBUG] DefaultLayout: レンダリング中", {
    hasUser: !!user,
    username: user?.username,
    dojo_style_name: user?.dojo_style_name
  });

  return (
    <div className={styles.layout}>
      {showHeader && (
        <DefaultHeader user={user} settingsHref={settingsHref} />
      )}
      <div className={styles.contentWrapper}>
        <main className={styles.main}>{children}</main>
      </div>
      {showFooter && showTabNavigation && (
        <div className={styles.tabNavigation}>
          <Suspense fallback={null}>
            <TabNavigation />
          </Suspense>
        </div>
      )}
    </div>
  );
}

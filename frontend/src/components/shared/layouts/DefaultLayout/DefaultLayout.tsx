"use client";

import { type ReactNode, Suspense } from "react";
import { TabNavigation } from "@/components/shared/TabNavigation/TabNavigation";
import { useAuth } from "@/lib/hooks/useAuth";
import { DefaultHeader } from "../common/DefaultHeader";
import styles from "./DefaultLayout.module.css";

interface DefaultLayoutProps {
  children: ReactNode;
  showHeader?: boolean;
  showFooter?: boolean;
  showTabNavigation?: boolean;
  settingsHref?: string;
  showTooltip?: boolean;
}

export function DefaultLayout({
  children,
  showHeader = true,
  showFooter = true,
  showTabNavigation = true,
  settingsHref,
  showTooltip = false,
}: DefaultLayoutProps) {
  const { user } = useAuth();

  console.log("🏗️ [DEBUG] DefaultLayout: レンダリング中", {
    hasUser: !!user,
    username: user?.username,
    dojo_style_name: user?.dojo_style_name,
  });

  return (
    <div className={styles.layout}>
      {showHeader && (
        <DefaultHeader
          user={user}
          settingsHref={settingsHref}
          showTooltip={showTooltip}
        />
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

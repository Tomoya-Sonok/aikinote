"use client";

import { Suspense } from "react";
import layoutStyles from "@/components/shared/layouts/SocialLayout/SocialLayout.module.css";
import { TabNavigation } from "@/components/shared/TabNavigation/TabNavigation";

// SocialLayout 全体を Server から wrap すると createContext 連鎖が SSR module 評価
// で失敗するため、TabNavigation 部分だけを children なし Client Wrapper に分離する
export function SocialBottomNav() {
  return (
    <div className={layoutStyles.tabNavigation}>
      <Suspense fallback={null}>
        <TabNavigation />
      </Suspense>
    </div>
  );
}

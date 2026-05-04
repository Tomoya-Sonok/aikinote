"use client";

import { Suspense } from "react";
import layoutStyles from "@/components/shared/layouts/SocialLayout/SocialLayout.module.css";
import { TabNavigation } from "@/components/shared/TabNavigation/TabNavigation";

// SocialLayout の `.tabNavigation` 部分を切り出した Client Wrapper。
// page.tsx (Server) から SocialLayout 全体を wrap すると Next.js 16 + Turbopack の
// SSR module 評価で createContext エラーが出るため、TabNavigation だけを Client 境界
// に閉じ込めて呼び出せるようにする。
export function SocialBottomNav() {
  return (
    <div className={layoutStyles.tabNavigation}>
      <Suspense fallback={null}>
        <TabNavigation />
      </Suspense>
    </div>
  );
}

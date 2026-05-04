import { Suspense } from "react";
import layoutStyles from "@/components/shared/layouts/DefaultLayout/DefaultLayout.module.css";
import { TabNavigation } from "@/components/shared/TabNavigation/TabNavigation";

// 主要 3 タブ (personal/pages, social/posts, mypage) と詳細画面で TabNavigation を共有する。
// Next.js app router の layout システムを活用し navigation 時に TabNavigation の DOM が
// 再生成されないようにする。子 page は Header と main 構造を自身で render する想定で
// (default-header) サブグループでさらに DefaultHeader を共有する。
export default function TabbedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className={layoutStyles.layout}>
      {children}
      <div className={layoutStyles.tabNavigation}>
        <Suspense fallback={null}>
          <TabNavigation />
        </Suspense>
      </div>
    </div>
  );
}

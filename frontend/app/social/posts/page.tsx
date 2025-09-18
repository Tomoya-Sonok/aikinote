import { redirect } from "next/navigation";
import { AppLayout } from "@/components/layout/AppLayout";
import { TabNavigation } from "@/components/molecules/TabNavigation/TabNavigation";
import { getCurrentUser } from "@/lib/server/auth";
import styles from "./page.module.css";

export default async function SocialPostsPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <AppLayout>
      <div className={styles.container}>
        <div className={styles.content}>
          <h1>みんなで 投稿一覧</h1>
          <p className={styles.notice}>
            こちらのページは、初回リリース後に実装予定です。
            <br />
            リリース時期が分かり次第、ご登録いただいたメールアドレス宛にお知らせします。
          </p>
        </div>

        {/* タブナビゲーション */}
        <TabNavigation />
      </div>
    </AppLayout>
  );
}

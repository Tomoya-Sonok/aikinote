"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { TabNavigation } from "@/components/molecules/TabNavigation/TabNavigation";
import { type MockUser, mockGetCurrentUser } from "@/lib/server/msw/training";
import styles from "./mypage.module.css";

export default function MyPage() {
  const [user, setUser] = useState<MockUser | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        // MSW環境でのモック認証チェック
        const currentUser = await mockGetCurrentUser();

        if (!currentUser) {
          router.push("/login");
          return;
        }

        setUser(currentUser);
      } catch (error) {
        console.error("認証エラー:", error);
        router.push("/login");
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, [router]);

  if (loading) {
    return (
      <AppLayout>
        <div className={styles.container}>
          <div className={styles.content}>
            <p>読み込み中...</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className={styles.container}>
        <div className={styles.content}>
          <h1>マイページ</h1>

          {user && (
            <div className={styles.userInfo}>
              <div className={styles.userProfile}>
                <Image
                  src={user.avatarUrl || "/images/default-avatar.svg"}
                  alt="プロフィール画像"
                  className={styles.avatar}
                  width={80}
                  height={80}
                />
                <div className={styles.userDetails}>
                  <h2 className={styles.username}>{user.username}</h2>
                  <p className={styles.email}>{user.email}</p>
                  {user.dojo && (
                    <p className={styles.dojo}>所属道場: {user.dojo}</p>
                  )}
                </div>
              </div>
            </div>
          )}

          <div className={styles.features}>
            <h3>機能一覧</h3>
            <ul className={styles.featureList}>
              <li>プロフィール編集（実装予定）</li>
              <li>稽古記録の閲覧（実装予定）</li>
              <li>設定変更（実装予定）</li>
            </ul>
          </div>
        </div>

        {/* タブナビゲーション */}
        <TabNavigation />
      </div>
    </AppLayout>
  );
}

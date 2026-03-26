"use client";

import { useCallback, useEffect, useState } from "react";
import { MinimalLayout } from "@/components/shared/layouts/MinimalLayout/MinimalLayout";
import { Skeleton } from "@/components/shared/Skeleton";
import { useAuth } from "@/lib/hooks/useAuth";
import { useSubscription } from "@/lib/hooks/useSubscription";
import { getOfferings, identifyUser } from "@/lib/revenuecat";
import styles from "./page.module.css";

declare global {
  interface Window {
    __AIKINOTE_NATIVE_APP__?: boolean;
    showNativePaywall?: () => Promise<{ success: boolean; isPremium: boolean }>;
    showNativeCustomerCenter?: () => void;
  }
}

type RCPackage = {
  identifier: string;
  rcBillingProduct: {
    id: string;
    currentPrice: { formattedPrice: string; amountMicros: number };
    title: string;
    normalPeriodDuration: string | null;
  };
};

interface SubscriptionSettingProps {
  locale: string;
}

export function SubscriptionSetting({ locale }: SubscriptionSettingProps) {
  const { user } = useAuth();
  const {
    loading: subLoading,
    isPremium,
    subscription,
    refetch,
  } = useSubscription();
  const [packages, setPackages] = useState<RCPackage[]>([]);
  const [loadingOfferings, setLoadingOfferings] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const searchParams =
    typeof window !== "undefined"
      ? new URLSearchParams(window.location.search)
      : null;
  const success = searchParams?.get("success") === "1";
  const isNativeApp =
    typeof window !== "undefined" && window.__AIKINOTE_NATIVE_APP__;

  // RevenueCat 初期化 + Offerings 取得
  useEffect(() => {
    if (!user?.id || isNativeApp) {
      setLoadingOfferings(false);
      return;
    }

    const init = async () => {
      try {
        await identifyUser(user.id);
        const offerings = await getOfferings();
        const current = offerings?.current;
        if (current?.availablePackages) {
          setPackages(current.availablePackages as unknown as RCPackage[]);
        }
      } catch (err) {
        console.error("[Subscription] offerings 取得エラー:", err);
      } finally {
        setLoadingOfferings(false);
      }
    };

    init();
  }, [user?.id, isNativeApp]);

  const handlePurchase = useCallback(
    (pkg: RCPackage) => {
      // 別ページに遷移して Stripe Elements のライフサイクルを隔離
      window.location.href = `/${locale}/settings/subscription/checkout?pkg=${encodeURIComponent(pkg.identifier)}`;
    },
    [locale],
  );

  const handleNativeUpgrade = useCallback(async () => {
    if (window.showNativePaywall) {
      const result = await window.showNativePaywall();
      if (result.success) {
        refetch();
        window.location.href = `/${locale}/settings/subscription?success=1`;
      }
    }
  }, [refetch, locale]);

  const handleManageSubscription = useCallback(() => {
    if (isNativeApp && window.showNativeCustomerCenter) {
      window.showNativeCustomerCenter();
      return;
    }
    // Web: Stripe Customer Portal（Phase M2 拡張で RevenueCat の管理 URL に変更可能）
    window.open("https://billing.stripe.com/p/login/test", "_blank");
  }, [isNativeApp]);

  const formatPeriod = (duration: string | null): string => {
    if (!duration) return "";
    if (duration.includes("P1M") || duration === "P1M") return "/ 月";
    if (duration.includes("P1Y") || duration === "P1Y") return "/ 年";
    return "";
  };

  const loading = subLoading || loadingOfferings;

  return (
    <MinimalLayout
      headerTitle="サブスクリプション"
      backHref={`/${locale}/personal/pages`}
    >
      <div className={styles.container}>
        {/* 現在のプラン */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>現在のプラン</h2>
          {loading ? (
            <Skeleton
              variant="rect"
              width="100%"
              height="60px"
              borderRadius="8px"
            />
          ) : (
            <div
              className={`${styles.planCard} ${isPremium ? styles.planCardPremium : ""}`}
            >
              <span className={styles.planName}>
                {isPremium ? "Premium" : "Free"}
              </span>
              {isPremium && subscription?.current_period_end && (
                <span className={styles.planDetail}>
                  {subscription.cancel_at_period_end
                    ? `${new Date(subscription.current_period_end).toLocaleDateString("ja-JP")} まで有効`
                    : `次回更新: ${new Date(subscription.current_period_end).toLocaleDateString("ja-JP")}`}
                </span>
              )}
            </div>
          )}
        </section>

        {/* 成功メッセージ */}
        {success && (
          <div className={styles.successMessage}>
            Premium プランへのアップグレードが完了しました！
          </div>
        )}

        {/* エラーメッセージ */}
        {error && <div className={styles.errorMessage}>{error}</div>}

        {/* アップグレード（Free ユーザーのみ） */}
        {!loading && !isPremium && (
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Premium にアップグレード</h2>
            <p className={styles.description}>
              統計データ・SNS全機能（投稿・返信・お気に入り・検索）が使い放題になります。
            </p>

            {isNativeApp ? (
              <button
                type="button"
                className={styles.purchaseButton}
                onClick={handleNativeUpgrade}
              >
                プランを選択して購入
              </button>
            ) : (
              <div className={styles.packages}>
                {packages.map((pkg) => (
                  <button
                    key={pkg.identifier}
                    type="button"
                    className={styles.packageCard}
                    onClick={() => handlePurchase(pkg)}
                  >
                    <span className={styles.packagePrice}>
                      {pkg.rcBillingProduct.currentPrice.formattedPrice}
                      <span className={styles.packagePeriod}>
                        {formatPeriod(
                          pkg.rcBillingProduct.normalPeriodDuration,
                        )}
                      </span>
                    </span>
                    <span className={styles.packageName}>
                      {pkg.rcBillingProduct.title}
                    </span>
                  </button>
                ))}
                {packages.length === 0 && !loading && (
                  <p className={styles.noPackages}>
                    プランの取得に失敗しました。ページを再読み込みしてください。
                  </p>
                )}
              </div>
            )}
          </section>
        )}

        {/* サブスクリプション管理（Premium ユーザーのみ） */}
        {!loading && isPremium && (
          <section className={styles.section}>
            <button
              type="button"
              className={styles.manageButton}
              onClick={handleManageSubscription}
            >
              サブスクリプションを管理
            </button>
          </section>
        )}
      </div>
    </MinimalLayout>
  );
}

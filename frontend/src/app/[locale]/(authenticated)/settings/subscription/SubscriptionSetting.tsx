"use client";

import { useCallback, useEffect, useState } from "react";
import { MinimalLayout } from "@/components/shared/layouts/MinimalLayout/MinimalLayout";
import { Skeleton } from "@/components/shared/Skeleton";
import { createCheckoutSession, createPortalSession } from "@/lib/api/client";
import { useSubscription } from "@/lib/hooks/useSubscription";
import styles from "./page.module.css";

declare global {
  interface Window {
    __AIKINOTE_NATIVE_APP__?: boolean;
    showNativePaywall?: () => Promise<{ success: boolean; isPremium: boolean }>;
    showNativeCustomerCenter?: () => void;
  }
}

// Stripe Price ID（環境変数 or ハードコード）
// TODO: 本番用 Price ID に差し替え
const PRICE_IDS = {
  monthly: process.env.NEXT_PUBLIC_STRIPE_PRICE_MONTHLY ?? "",
  yearly: process.env.NEXT_PUBLIC_STRIPE_PRICE_YEARLY ?? "",
};

const PLANS = [
  {
    key: "monthly" as const,
    label: "月額プラン",
    price: "¥380",
    period: "/ 月",
    description: "",
  },
  {
    key: "yearly" as const,
    label: "年額プラン",
    price: "¥3,800",
    period: "/ 年",
    description: "2ヶ月分お得",
  },
];

interface SubscriptionSettingProps {
  locale: string;
}

export function SubscriptionSetting({ locale }: SubscriptionSettingProps) {
  const {
    loading: subLoading,
    isPremium,
    subscription,
    refetch,
  } = useSubscription();
  const [purchasing, setPurchasing] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isNativeApp, setIsNativeApp] = useState(false);

  useEffect(() => {
    setIsNativeApp(!!window.__AIKINOTE_NATIVE_APP__);
    const params = new URLSearchParams(window.location.search);
    setSuccess(params.get("success") === "1");
  }, []);

  const handlePurchase = useCallback(async (planKey: "monthly" | "yearly") => {
    const priceId = PRICE_IDS[planKey];
    if (!priceId) {
      setError("Price ID が設定されていません");
      return;
    }

    setPurchasing(planKey);
    setError(null);

    try {
      const url = await createCheckoutSession(priceId);
      if (url) {
        // Stripe Checkout ページにリダイレクト
        window.location.href = url;
      } else {
        setError("チェックアウトの作成に失敗しました");
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "チェックアウトの作成に失敗しました",
      );
    } finally {
      setPurchasing(null);
    }
  }, []);

  const handleNativeUpgrade = useCallback(async () => {
    if (window.showNativePaywall) {
      const result = await window.showNativePaywall();
      if (result.success) {
        refetch();
        window.location.href = `/${locale}/settings/subscription?success=1`;
      }
    }
  }, [refetch, locale]);

  const [managingPortal, setManagingPortal] = useState(false);

  const handleManageSubscription = useCallback(async () => {
    if (isNativeApp && window.showNativeCustomerCenter) {
      window.showNativeCustomerCenter();
      return;
    }

    setManagingPortal(true);
    try {
      const url = await createPortalSession();
      if (url) {
        window.location.href = url;
      } else {
        setError("管理画面の表示に失敗しました");
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "管理画面の表示に失敗しました",
      );
    } finally {
      setManagingPortal(false);
    }
  }, [isNativeApp]);

  return (
    <MinimalLayout
      headerTitle="サブスクリプション"
      backHref={`/${locale}/personal/pages`}
    >
      <div className={styles.container}>
        {/* 現在のプラン */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>現在のプラン</h2>
          {subLoading ? (
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
              {isPremium &&
                subscription?.cancel_at_period_end &&
                subscription?.current_period_end && (
                  <span className={styles.planDetailCancel}>
                    解約済み —{" "}
                    {new Date(
                      subscription.current_period_end,
                    ).toLocaleDateString("ja-JP")}{" "}
                    まで Premium 機能をご利用いただけます
                  </span>
                )}
              {isPremium &&
                !subscription?.cancel_at_period_end &&
                subscription?.current_period_end && (
                  <span className={styles.planDetail}>
                    次回更新:{" "}
                    {new Date(
                      subscription.current_period_end,
                    ).toLocaleDateString("ja-JP")}
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
        {!subLoading && !isPremium && (
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
                {PLANS.map((plan) => (
                  <button
                    key={plan.key}
                    type="button"
                    className={styles.packageCard}
                    onClick={() => handlePurchase(plan.key)}
                    disabled={purchasing !== null}
                  >
                    <span className={styles.packagePrice}>
                      {plan.price}
                      <span className={styles.packagePeriod}>
                        {plan.period}
                      </span>
                    </span>
                    <span className={styles.packageName}>
                      {plan.label}
                      {plan.description && ` — ${plan.description}`}
                    </span>
                    {purchasing === plan.key && (
                      <span className={styles.packageProcessing}>
                        処理中...
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </section>
        )}

        {/* サブスクリプション管理（Premium ユーザーのみ） */}
        {!subLoading && isPremium && (
          <section className={styles.section}>
            <button
              type="button"
              className={styles.manageButton}
              onClick={handleManageSubscription}
              disabled={managingPortal}
            >
              {managingPortal ? "読み込み中..." : "サブスクリプションを管理"}
            </button>
          </section>
        )}
      </div>
    </MinimalLayout>
  );
}

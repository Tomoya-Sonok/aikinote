"use client";

import { useTranslations } from "next-intl";
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

const PRICE_IDS = {
  monthly: process.env.NEXT_PUBLIC_STRIPE_PRICE_MONTHLY ?? "",
  yearly: process.env.NEXT_PUBLIC_STRIPE_PRICE_YEARLY ?? "",
};

const FEATURE_MATRIX = [
  {
    categoryKey: "categoryPersonal" as const,
    features: [
      { nameKey: "featureRecord" as const, free: true, pro: true },
      { nameKey: "featureCalendar" as const, free: true, pro: true },
      { nameKey: "featureStats" as const, free: false, pro: true },
    ],
  },
  {
    categoryKey: "categorySocial" as const,
    features: [
      { nameKey: "featureBrowse" as const, free: false, pro: true },
      { nameKey: "featurePost" as const, free: false, pro: true },
      { nameKey: "featurePublish" as const, free: false, pro: true },
    ],
  },
  {
    categoryKey: "categoryMobile" as const,
    features: [{ nameKey: "featurePush" as const, free: false, pro: true }],
  },
];

interface SubscriptionSettingProps {
  locale: string;
}

export function SubscriptionSetting({ locale }: SubscriptionSettingProps) {
  const t = useTranslations("subscriptionPage");
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
  const [selectedPeriod, setSelectedPeriod] = useState<"monthly" | "yearly">(
    "monthly",
  );
  const [managingPortal, setManagingPortal] = useState(false);

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
        window.location.replace(url);
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

  const premiumPrice =
    selectedPeriod === "monthly"
      ? t("premiumMonthlyPrice")
      : t("premiumYearlyPrice");
  const premiumPeriod =
    selectedPeriod === "monthly" ? t("perMonth") : t("perYear");

  return (
    <MinimalLayout
      headerTitle="プラン"
      backHref={`/${locale}/personal/pages`}
      forceBackHref
    >
      <div className={styles.container}>
        {/* サブタイトル */}
        <p className={styles.subtitle}>{t("subtitle")}</p>

        {/* 月額/年額トグル */}
        <div className={styles.toggleWrapper}>
          <div className={styles.toggle}>
            <button
              type="button"
              className={`${styles.toggleButton} ${selectedPeriod === "monthly" ? styles.toggleButtonActive : ""}`}
              onClick={() => setSelectedPeriod("monthly")}
            >
              {t("monthly")}
            </button>
            <button
              type="button"
              className={`${styles.toggleButton} ${selectedPeriod === "yearly" ? styles.toggleButtonActive : ""}`}
              onClick={() => setSelectedPeriod("yearly")}
            >
              {t("yearly")}
              <span className={styles.discountBadge}>
                {t("yearlyDiscount")}
              </span>
            </button>
          </div>
        </div>

        {/* 成功メッセージ */}
        {success && (
          <div className={styles.successMessage}>{t("successMessage")}</div>
        )}

        {/* エラーメッセージ */}
        {error && <div className={styles.errorMessage}>{error}</div>}

        {/* プランカード */}
        {subLoading ? (
          <div className={styles.loadingCards}>
            <Skeleton
              variant="rect"
              width="100%"
              height="140px"
              borderRadius="12px"
            />
            <Skeleton
              variant="rect"
              width="100%"
              height="200px"
              borderRadius="12px"
            />
          </div>
        ) : (
          <div className={styles.cards}>
            {/* Free カード */}
            <div className={styles.card}>
              {!isPremium && (
                <span className={`${styles.badge} ${styles.badgeCurrent}`}>
                  {t("currentBadge")}
                </span>
              )}
              <span className={styles.planLabel}>{t("free")}</span>
              <div className={styles.priceRow}>
                <span className={styles.priceValue}>{t("freePrice")}</span>
              </div>
              <p className={styles.planDescription}>{t("freeDescription")}</p>
            </div>

            {/* Premium カード */}
            <div className={`${styles.card} ${styles.cardPremium}`}>
              {isPremium ? (
                <span
                  className={`${styles.badge} ${styles.badgeCurrentPremium}`}
                >
                  {t("currentBadge")}
                </span>
              ) : (
                <span className={`${styles.badge} ${styles.badgePremium}`}>
                  {t("recommendedBadge")}
                </span>
              )}
              <span
                className={`${styles.planLabel} ${styles.planLabelPremium}`}
              >
                {t("premium")}
              </span>
              <div className={styles.priceRow}>
                <span
                  className={`${styles.priceValue} ${styles.priceValuePremium}`}
                >
                  {premiumPrice}
                </span>
                <span
                  className={`${styles.pricePeriod} ${styles.pricePeriodPremium}`}
                >
                  {premiumPeriod}
                </span>
              </div>
              <p
                className={`${styles.planDescription} ${styles.planDescriptionPremium}`}
              >
                {t("premiumDescription")}
              </p>

              {/* CTA / 管理ボタン */}
              {!isPremium && !isNativeApp && (
                <button
                  type="button"
                  className={styles.ctaButton}
                  onClick={() => handlePurchase(selectedPeriod)}
                  disabled={purchasing !== null}
                >
                  {purchasing ? t("processing") : t("startPremium")}
                </button>
              )}

              {!isPremium && isNativeApp && (
                <button
                  type="button"
                  className={styles.nativeButton}
                  onClick={handleNativeUpgrade}
                >
                  {t("nativeUpgrade")}
                </button>
              )}

              {isPremium && (
                <>
                  <button
                    type="button"
                    className={styles.manageButton}
                    onClick={handleManageSubscription}
                    disabled={managingPortal}
                  >
                    {managingPortal ? t("loading") : t("managePlan")}
                  </button>
                  {subscription?.cancel_at_period_end &&
                    subscription?.current_period_end && (
                      <p
                        className={`${styles.subscriptionInfo} ${styles.subscriptionInfoCancel}`}
                      >
                        {t("canceledUntil", {
                          date: new Date(
                            subscription.current_period_end,
                          ).toLocaleDateString(
                            locale === "ja" ? "ja-JP" : "en-US",
                          ),
                        })}
                      </p>
                    )}
                  {!subscription?.cancel_at_period_end &&
                    subscription?.current_period_end && (
                      <p className={styles.subscriptionInfo}>
                        {t("renewalDate", {
                          date: new Date(
                            subscription.current_period_end,
                          ).toLocaleDateString(
                            locale === "ja" ? "ja-JP" : "en-US",
                          ),
                        })}
                      </p>
                    )}
                </>
              )}
            </div>
          </div>
        )}

        {/* 機能比較テーブル */}
        <div className={styles.featureTable}>
          <div className={styles.tableHeader}>
            <span className={styles.tableHeaderSpacer} />
            <span className={styles.tableHeaderLabel}>
              {t("tableHeaderFree")}
            </span>
            <span className={styles.tableHeaderLabel}>
              {t("tableHeaderPro")}
            </span>
          </div>
          {FEATURE_MATRIX.map((category) => (
            <div key={category.categoryKey}>
              <div className={styles.categoryLabel}>
                {t(category.categoryKey)}
              </div>
              {category.features.map((feature) => (
                <div key={feature.nameKey} className={styles.featureRow}>
                  <span className={styles.featureName}>
                    {t(feature.nameKey)}
                  </span>
                  <span
                    className={
                      feature.free ? styles.featureCheck : styles.featureDash
                    }
                  >
                    {feature.free ? "✓" : "—"}
                  </span>
                  <span
                    className={
                      feature.pro ? styles.featureCheck : styles.featureDash
                    }
                  >
                    {feature.pro ? "✓" : "—"}
                  </span>
                </div>
              ))}
            </div>
          ))}
          <p className={styles.mobileNote}>{t("mobileNote")}</p>
        </div>
      </div>
    </MinimalLayout>
  );
}
